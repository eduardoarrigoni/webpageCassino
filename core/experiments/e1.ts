import { createRng } from '../rng';
import { playRounds, type Round } from '../round';
import { BET, PAYTABLES, type PayTableId, type Sym } from '../rules';
import { countBy, mean, sampleStdDev } from '../stats';
import { check, isWin, outcomeOf, theoryFor, type Check, type ExactValue, type TheorySummary } from './common';

/** Experimento 1. As frequências acompanham as probabilidades? */

export interface E1Params {
  readonly seed: number;
  readonly rounds: number;
  readonly table: PayTableId;
}

export const E1_OFFICIAL: E1Params = { seed: 2026, rounds: 10_000, table: 'base' };

export interface E1Row {
  readonly label: string;
  readonly symbol: Sym | null;
  readonly profit: number;
  readonly probability: ExactValue;
  readonly count: number;
  readonly relativeFrequency: number;
}

export interface E1Result {
  readonly params: E1Params;
  readonly theory: TheorySummary;
  /** Os seis resultados da Tabela 1, em ordem crescente de lucro. */
  readonly rows: readonly E1Row[];
  readonly summary: {
    readonly n: number;
    readonly meanProfit: number;
    /** Σ P / (N · aposta). */
    readonly observedRtp: number;
    readonly winProportion: number;
    /** Desvio-padrão amostral do lucro, divisor N − 1. */
    readonly profitStdDev: number;
    readonly totalPrize: number;
    readonly totalProfit: number;
  };
  readonly checks: readonly Check[];
}

/** Análise de rodadas já sorteadas (permite reaproveitar a mesma sequência). */
export function analyzeE1(rounds: readonly Round[], params: E1Params): E1Result {
  const theory = theoryFor(params.table);
  const n = rounds.length;
  const counts = countBy(
    rounds.map(outcomeOf),
    theory.outcomes.map((o) => o.symbol),
  );

  const rows = theory.outcomes
    .map((o) => {
      const count = counts.get(o.symbol) ?? 0;
      return {
        label: o.label,
        symbol: o.symbol,
        profit: o.profit,
        probability: o.probability,
        count,
        relativeFrequency: count / n,
      };
    })
    .sort((a, b) => a.profit - b.profit);

  const profits = rounds.map((r) => r.profit);
  const prizes = rounds.map((r) => r.prize);
  const totalPrize = prizes.reduce((s, p) => s + p, 0);
  const countSum = rows.reduce((s, r) => s + r.count, 0);

  return {
    params,
    theory,
    rows,
    summary: {
      n,
      meanProfit: mean(profits),
      observedRtp: totalPrize / (n * BET),
      winProportion: rounds.filter(isWin).length / n,
      profitStdDev: sampleStdDev(profits),
      totalPrize,
      totalProfit: profits.reduce((s, x) => s + x, 0),
    },
    checks: [
      check('Contagens dos seis resultados somam o número de rodadas', params.rounds, countSum),
      check('Rodadas executadas', params.rounds, n),
    ],
  };
}

export function e1Rounds(params: E1Params): Round[] {
  return playRounds(createRng(params.seed), params.rounds, PAYTABLES[params.table]);
}

export function runE1(params: E1Params = E1_OFFICIAL): { result: E1Result; rounds: Round[] } {
  const rounds = e1Rounds(params);
  return { result: analyzeE1(rounds, params), rounds };
}
