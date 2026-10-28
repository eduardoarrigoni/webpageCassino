import { boardRows, logSpacedIndices, type E1Result, type E2Result, type Round } from '@/core';
import { LIMITS } from './limits';

/** Quantas rodadas do E1 voltam como amostra do registro. */
const E1_SAMPLE = 20;

/** Rodada no formato da interface: inclui as linhas do tabuleiro 3 × 3 (topo, centro, base). */
export function roundView<R extends Round>(r: R) {
  return { ...r, rows: boardRows(r) };
}

export function e1View(result: E1Result, rounds: readonly Round[]) {
  return { ...result, sampleRounds: rounds.slice(0, E1_SAMPLE).map(roundView) };
}

/** Trajetórias longas são devolvidas em pontos amostrados em escala log (os CSVs têm todas). */
export function e2View(result: E2Result) {
  const idx = logSpacedIndices(result.params.rounds, result.params.checkpoints, LIMITS.e2TrajectoryPoints);
  return {
    ...result,
    runs: result.runs.map((r) => ({
      seed: r.seed,
      checkpointMeans: r.checkpointMeans,
      trajectory: idx.map((n) => ({ n, mean: r.trajectory[n - 1] as number })),
    })),
  };
}
