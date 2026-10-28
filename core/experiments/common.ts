import type { Fraction } from '../fraction';
import type { Round } from '../round';
import { PAYTABLES, type PayTableId, type Sym } from '../rules';
import { computeTheory, type Theory } from '../theory';

/**
 * Os experimentos devolvem objetos JSON-serializáveis (números e textos),
 * para que a CLI grave CSV e a API responda sem conversões extras.
 */

/** Valor exato acompanhado da sua aproximação decimal. */
export interface ExactValue {
  readonly fraction: string;
  readonly value: number;
}

export const exact = (f: Fraction): ExactValue => ({ fraction: f.toString(), value: f.toNumber() });

/** Resultado de uma conferência exigida pelo enunciado (ex.: "contagens somam 10.000"). */
export interface Check {
  readonly description: string;
  readonly expected: number | string;
  readonly observed: number | string;
  readonly ok: boolean;
}

export const check = (description: string, expected: number | string, observed: number | string): Check => ({
  description,
  expected,
  observed,
  ok: expected === observed,
});

/** Evento da Tabela 1 a que a rodada pertence: símbolo da tripla premiada ou null ("sem prêmio"). */
export function outcomeOf(r: Round): Sym | null {
  return r.prize > 0 ? r.center[0] : null;
}

export function isWin(r: Round): boolean {
  return r.prize > 0;
}

export interface TheorySummary {
  readonly table: PayTableId;
  readonly sampleSpaceSize: number;
  readonly winningTriples: number;
  readonly outcomes: readonly {
    readonly label: string;
    readonly symbol: Sym | null;
    readonly triples: number;
    readonly prize: number;
    readonly profit: number;
    readonly probability: ExactValue;
  }[];
  readonly profitDistribution: readonly {
    readonly profit: number;
    readonly probability: ExactValue;
    readonly contribution: ExactValue;
  }[];
  readonly winProbability: ExactValue;
  readonly expectedPrize: ExactValue;
  readonly expectedProfit: ExactValue;
  readonly rtp: ExactValue;
  readonly houseEdge: ExactValue;
  readonly profitVariance: ExactValue;
  readonly profitStdDev: number;
}

export function summarizeTheory(t: Theory, table: PayTableId): TheorySummary {
  return {
    table,
    sampleSpaceSize: t.sampleSpaceSize,
    winningTriples: t.winningTriples,
    outcomes: t.outcomes.map((o) => ({
      label: o.label,
      symbol: o.symbol,
      triples: o.triples,
      prize: o.prize.toNumber(),
      profit: o.profit.toNumber(),
      probability: exact(o.probability),
    })),
    profitDistribution: t.profitDistribution.map((v) => ({
      profit: v.profit.toNumber(),
      probability: exact(v.probability),
      contribution: exact(v.contribution),
    })),
    winProbability: exact(t.winProbability),
    expectedPrize: exact(t.expectedPrize),
    expectedProfit: exact(t.expectedProfit),
    rtp: exact(t.rtp),
    houseEdge: exact(t.houseEdge),
    profitVariance: exact(t.profitVariance),
    profitStdDev: Math.sqrt(t.profitVariance.toNumber()),
  };
}

export function theoryFor(table: PayTableId): TheorySummary {
  return summarizeTheory(computeTheory(PAYTABLES[table]), table);
}
