import { createRng } from '../rng';
import { playRounds, type Round } from '../round';
import { PAYTABLES, type PayTableId } from '../rules';
import { cumulativeMeans } from '../stats';
import { check, theoryFor, type Check } from './common';

/** Experimento 2. O que muda quando aumentamos a amostra? */

export interface E2Params {
  readonly seeds: readonly number[];
  readonly rounds: number;
  readonly checkpoints: readonly number[];
  /** Semente reexecutada para conferir a reprodução. */
  readonly reproductionSeed: number;
  readonly reproductionCount: number;
  readonly table: PayTableId;
}

export const E2_OFFICIAL: E2Params = {
  seeds: [10, 2026, 123456],
  rounds: 10_000,
  checkpoints: [100, 1_000, 10_000],
  reproductionSeed: 2026,
  reproductionCount: 10,
  table: 'base',
};

export interface E2Run {
  readonly seed: number;
  /** Média acumulada em cada ponto de controle, na ordem de params.checkpoints. */
  readonly checkpointMeans: readonly { readonly after: number; readonly mean: number }[];
  /** Média acumulada após cada rodada (1..N). */
  readonly trajectory: readonly number[];
}

export interface E2ReproductionRow {
  readonly index: number;
  readonly first: { readonly stops: string; readonly center: string; readonly profit: number };
  readonly second: { readonly stops: string; readonly center: string; readonly profit: number };
  readonly equal: boolean;
}

export interface E2Result {
  readonly params: E2Params;
  /** Referência horizontal: E[X]. */
  readonly expectedProfit: number;
  readonly runs: readonly E2Run[];
  readonly reproduction: {
    readonly seed: number;
    readonly rows: readonly E2ReproductionRow[];
    readonly reproduced: boolean;
  };
  readonly checks: readonly Check[];
}

const describeRound = (r: Round) => ({ stops: r.stops.join('-'), center: r.center.join('–'), profit: r.profit });

/**
 * `reuse` permite passar rodadas já sorteadas por semente (ex.: as do E1 com semente 2026).
 * A reexecução de reprodução sempre cria um gerador novo.
 */
export function runE2(params: E2Params = E2_OFFICIAL, reuse: ReadonlyMap<number, readonly Round[]> = new Map()): E2Result {
  const table = PAYTABLES[params.table];
  const checkpoints = params.checkpoints.filter((c) => c >= 1 && c <= params.rounds);

  const roundsBySeed = new Map<number, readonly Round[]>();
  for (const seed of params.seeds) {
    const reused = reuse.get(seed);
    roundsBySeed.set(seed, reused?.length === params.rounds ? reused : playRounds(createRng(seed), params.rounds, table));
  }

  const runs: E2Run[] = params.seeds.map((seed) => {
    const trajectory = cumulativeMeans((roundsBySeed.get(seed) as readonly Round[]).map((r) => r.profit));
    return {
      seed,
      checkpointMeans: checkpoints.map((after) => ({ after, mean: trajectory[after - 1] as number })),
      trajectory,
    };
  });

  const k = Math.min(params.reproductionCount, params.rounds);
  const original = roundsBySeed.get(params.reproductionSeed) ?? playRounds(createRng(params.reproductionSeed), k, table);
  const rerun = playRounds(createRng(params.reproductionSeed), k, table);
  const rows = rerun.map((r, i) => {
    const o = original[i] as Round;
    const first = describeRound(o);
    const second = describeRound(r);
    return {
      index: i + 1,
      first,
      second,
      equal: first.stops === second.stops && first.center === second.center && first.profit === second.profit,
    };
  });
  const reproduced = rows.every((r) => r.equal);

  return {
    params,
    expectedProfit: theoryFor(params.table).expectedProfit.value,
    runs,
    reproduction: { seed: params.reproductionSeed, rows, reproduced },
    checks: [
      check(`Primeiros ${k} resultados reproduzidos com a semente ${params.reproductionSeed}`, 'sim', reproduced ? 'sim' : 'não'),
      ...runs.map((r) => check(`Rodadas na sequência da semente ${r.seed}`, params.rounds, r.trajectory.length)),
    ],
  };
}
