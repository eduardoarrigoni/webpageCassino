import { reevaluate, type Round } from '../round';
import { BET, PAYTABLES, PAYTABLE_LABELS, type PayTableId } from '../rules';
import { mean } from '../stats';
import { check, isWin, theoryFor, type Check, type ExactValue } from './common';
import { e1Rounds, E1_OFFICIAL } from './e1';

/** Experimento 5. Prêmios maiores tornam o jogo favorável? */

export interface E5Params {
  readonly seed: number;
  readonly rounds: number;
  readonly tables: readonly PayTableId[];
}

/** Usa as mesmas rodadas do Experimento 1, reavaliadas com cada tabela. */
export const E5_OFFICIAL: E5Params = { seed: E1_OFFICIAL.seed, rounds: E1_OFFICIAL.rounds, tables: ['base', 'plus10'] };

export interface E5Row {
  readonly table: PayTableId;
  readonly label: string;
  readonly winProbability: ExactValue;
  readonly winFrequency: number;
  readonly wins: number;
  /** Prêmio médio por rodada, Σ P / N. */
  readonly meanPrize: number;
  /** Prêmio médio entre as rodadas premiadas; null se não houve prêmio. */
  readonly meanPrizeWhenWon: number | null;
  readonly expectedPrize: ExactValue;
  readonly meanProfit: number;
  readonly expectedProfit: ExactValue;
  readonly rtpTheoretical: ExactValue;
  readonly rtpObserved: number;
}

export interface E5Result {
  readonly params: E5Params;
  readonly rows: readonly E5Row[];
  readonly checks: readonly Check[];
}

export function analyzeE5(spins: readonly Round[], params: E5Params): E5Result {
  const n = spins.length;
  const rows: E5Row[] = params.tables.map((id) => {
    // Mesmos sorteios, outra tabela: nenhum novo sorteio é feito.
    const rounds = reevaluate(spins, PAYTABLES[id]);
    const won = rounds.filter(isWin);
    const theory = theoryFor(id);
    const totalPrize = rounds.reduce((s, r) => s + r.prize, 0);
    return {
      table: id,
      label: PAYTABLE_LABELS[id],
      winProbability: theory.winProbability,
      winFrequency: won.length / n,
      wins: won.length,
      meanPrize: totalPrize / n,
      meanPrizeWhenWon: won.length === 0 ? null : mean(won.map((r) => r.prize)),
      expectedPrize: theory.expectedPrize,
      meanProfit: mean(rounds.map((r) => r.profit)),
      expectedProfit: theory.expectedProfit,
      rtpTheoretical: theory.rtp,
      rtpObserved: totalPrize / (n * BET),
    };
  });

  const winCounts = rows.map((r) => r.wins);
  return {
    params,
    rows,
    checks: [
      check('Mesmo número de rodadas premiadas em todas as tabelas (mesma sequência)', Math.max(...winCounts), Math.min(...winCounts)),
      check('Rodadas reavaliadas', params.rounds, n),
      ...rows
        .filter((r) => r.table === 'plus10')
        .flatMap((r) => [
          check('RTP teórico +10% = 92,4%', '231/250', r.rtpTheoretical.fraction),
          check('E[X] teórico +10% = −0,076', '-19/250', r.expectedProfit.fraction),
        ]),
    ],
  };
}

export function runE5(params: E5Params = E5_OFFICIAL, rounds?: readonly Round[]): E5Result {
  return analyzeE5(rounds ?? e1Rounds({ seed: params.seed, rounds: params.rounds, table: 'base' }), params);
}
