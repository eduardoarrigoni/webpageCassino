import { createRng } from '../rng';
import { BET, PAYTABLES, type PayTableId } from '../rules';
import { playSession } from '../session';
import { mean, median } from '../stats';
import { check, theoryFor, type Check } from './common';

/** Experimento 3. O que acontece com um saldo limitado? */

export interface E3Params {
  readonly seed: number;
  readonly participants: number;
  readonly initialBalance: number;
  readonly maxRounds: number;
  /** Quantos participantes, a partir do primeiro, terão a trajetória exibida. */
  readonly trajectoriesShown: number;
  readonly table: PayTableId;
}

export const E3_OFFICIAL: E3Params = {
  seed: 42,
  participants: 100,
  initialBalance: 100,
  maxRounds: 500,
  trajectoriesShown: 5,
  table: 'base',
};

export type E3Outcome = 'ganho' | 'empate' | 'perda';

export interface E3Participant {
  readonly id: number;
  readonly finalBalance: number;
  readonly rounds: number;
  readonly depleted: boolean;
  readonly outcome: E3Outcome;
}

export interface E3Result {
  readonly params: E3Params;
  /** E[X] por rodada da tabela usada (referência; não se aplica direto a sessões de duração variável). */
  readonly expectedProfit: number;
  readonly participants: readonly E3Participant[];
  readonly summary: {
    readonly counts: Record<E3Outcome, number>;
    /** Proporções sobre todos os participantes; somam 1. */
    readonly proportions: Record<E3Outcome, number>;
    readonly depletedCount: number;
    /** Esgotamentos / participantes. */
    readonly depletedProportion: number;
    /** Esgotamentos / perdas (o esgotamento é um subconjunto das perdas); null se não houve perdas. */
    readonly depletedAmongLosses: number | null;
    readonly meanFinalBalance: number;
    readonly medianFinalBalance: number;
    readonly meanRounds: number;
    readonly medianRounds: number;
  };
  /**
   * Trajetórias dos primeiros participantes (sem seleção pela conclusão), com maxRounds + 1 pontos.
   * Após a parada, o saldo é mantido constante.
   */
  readonly trajectories: readonly { readonly id: number; readonly balances: readonly number[]; readonly stoppedAt: number }[];
  readonly checks: readonly Check[];
}

export function runE3(params: E3Params = E3_OFFICIAL): E3Result {
  const table = PAYTABLES[params.table];
  // O gerador é iniciado uma única vez e continua entre os participantes.
  const rng = createRng(params.seed);

  const participants: E3Participant[] = [];
  const trajectories: E3Result['trajectories'][number][] = [];
  for (let id = 1; id <= params.participants; id++) {
    const s = playSession(rng, { initialBalance: params.initialBalance, maxRounds: params.maxRounds, table, bet: BET });
    const outcome: E3Outcome =
      s.finalBalance > params.initialBalance ? 'ganho' : s.finalBalance === params.initialBalance ? 'empate' : 'perda';
    participants.push({ id, finalBalance: s.finalBalance, rounds: s.rounds, depleted: s.depleted, outcome });

    if (id <= params.trajectoriesShown) {
      const balances = [...s.trajectory];
      while (balances.length < params.maxRounds + 1) balances.push(s.finalBalance);
      trajectories.push({ id, balances, stoppedAt: s.rounds });
    }
  }

  const n = participants.length;
  const counts: Record<E3Outcome, number> = { ganho: 0, empate: 0, perda: 0 };
  for (const p of participants) counts[p.outcome]++;
  const depleted = participants.filter((p) => p.depleted);
  const finals = participants.map((p) => p.finalBalance);
  const lengths = participants.map((p) => p.rounds);

  return {
    params,
    expectedProfit: theoryFor(params.table).expectedProfit.value,
    participants,
    summary: {
      counts,
      proportions: { ganho: counts.ganho / n, empate: counts.empate / n, perda: counts.perda / n },
      depletedCount: depleted.length,
      depletedProportion: depleted.length / n,
      depletedAmongLosses: counts.perda === 0 ? null : depleted.length / counts.perda,
      meanFinalBalance: mean(finals),
      medianFinalBalance: median(finals),
      meanRounds: mean(lengths),
      medianRounds: median(lengths),
    },
    trajectories,
    checks: [
      check('Ganho + empate + perda = participantes', params.participants, counts.ganho + counts.empate + counts.perda),
      check(
        'Todo esgotamento é uma perda',
        depleted.length,
        depleted.filter((p) => p.outcome === 'perda').length,
      ),
    ],
  };
}
