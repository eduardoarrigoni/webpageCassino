import type { Round } from '../round';
import { proportion } from '../stats';
import type { PayTableId } from '../rules';
import { check, isWin, theoryFor, type Check } from './common';
import { e1Rounds, E1_OFFICIAL } from './e1';

/** Experimento 4. Depois de perder, aumenta a chance de ganhar? */

export interface E4Params {
  readonly seed: number;
  readonly rounds: number;
  readonly table: PayTableId;
}

/** Usa as mesmas rodadas do Experimento 1. */
export const E4_OFFICIAL: E4Params = E1_OFFICIAL;

export interface E4Group {
  readonly previous: 'prêmio' | 'sem prêmio';
  readonly pairs: number;
  readonly nextWins: number;
  /** nextWins / pairs; null quando o grupo não tem pares (não estimável). */
  readonly proportion: number | null;
}

export interface E4Result {
  readonly params: E4Params;
  /** Referência do modelo: Pr(G) = Pr(G_{i+1} | G_i) = Pr(G_{i+1} | G_i^c). */
  readonly reference: number;
  readonly groups: readonly [E4Group, E4Group];
  readonly totalPairs: number;
  /** Proporção de prêmios entre as rodadas 2..N (todas as "rodadas seguintes"). */
  readonly overallNextWinProportion: number | null;
  readonly checks: readonly Check[];
}

export function analyzeE4(rounds: readonly Round[], params: E4Params): E4Result {
  const acc = { win: { pairs: 0, nextWins: 0 }, loss: { pairs: 0, nextWins: 0 } };
  for (let i = 0; i + 1 < rounds.length; i++) {
    const g = isWin(rounds[i] as Round) ? acc.win : acc.loss;
    g.pairs++;
    if (isWin(rounds[i + 1] as Round)) g.nextWins++;
  }

  const groups: [E4Group, E4Group] = [
    { previous: 'prêmio', ...acc.win, proportion: proportion(acc.win.nextWins, acc.win.pairs) },
    { previous: 'sem prêmio', ...acc.loss, proportion: proportion(acc.loss.nextWins, acc.loss.pairs) },
  ];
  const totalPairs = acc.win.pairs + acc.loss.pairs;

  return {
    params,
    reference: theoryFor(params.table).winProbability.value,
    groups,
    totalPairs,
    overallNextWinProportion: proportion(acc.win.nextWins + acc.loss.nextWins, totalPairs),
    checks: [check('Pares consecutivos examinados = N − 1', Math.max(rounds.length - 1, 0), totalPairs)],
  };
}

export function runE4(params: E4Params = E4_OFFICIAL, rounds?: readonly Round[]): E4Result {
  return analyzeE4(rounds ?? e1Rounds(params), params);
}
