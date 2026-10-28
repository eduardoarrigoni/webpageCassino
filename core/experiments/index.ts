import type { E1Result } from './e1';
import { runE1, E1_OFFICIAL } from './e1';
import { runE2, E2_OFFICIAL, type E2Result } from './e2';
import { runE3, E3_OFFICIAL, type E3Result } from './e3';
import { analyzeE4, type E4Result } from './e4';
import { analyzeE5, E5_OFFICIAL, type E5Result } from './e5';
import type { Round } from '../round';

export * from './common';
export * from './e1';
export * from './e2';
export * from './e3';
export * from './e4';
export * from './e5';

export interface OfficialResults {
  readonly e1: E1Result;
  readonly e2: E2Result;
  readonly e3: E3Result;
  readonly e4: E4Result;
  readonly e5: E5Result;
  /** As 10.000 rodadas da semente 2026, compartilhadas por E1, E2, E4 e E5. */
  readonly e1Rounds: readonly Round[];
}

/**
 * Executa os cinco experimentos com os parâmetros do enunciado.
 * A sequência da semente 2026 é sorteada uma vez e reutilizada em E2, E4 e E5.
 */
export function runOfficial(): OfficialResults {
  const { result: e1, rounds } = runE1(E1_OFFICIAL);
  return {
    e1,
    e2: runE2(E2_OFFICIAL, new Map([[E1_OFFICIAL.seed, rounds]])),
    e3: runE3(E3_OFFICIAL),
    e4: analyzeE4(rounds, E1_OFFICIAL),
    e5: analyzeE5(rounds, E5_OFFICIAL),
    e1Rounds: rounds,
  };
}
