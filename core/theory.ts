import { Fraction } from './fraction';
import type { Stop } from './rng';
import { prizeFor, windowAt, type Triple } from './round';
import { BET, REEL, REEL_LENGTH, SYMBOLS, type PayTable, type Sym } from './rules';

/**
 * Teoria do modelo (seção 6), obtida por enumeração: nada aqui é escrito à mão.
 * Os valores vêm das regras (rolo, tabela de pagamentos e aposta).
 */

const ALL_STOPS = Array.from({ length: REEL_LENGTH }, (_, k) => k as Stop);

/** Pr(K = k) = 1/5 para cada parada. */
export const STOP_PROBABILITY = Fraction.of(1, REEL_LENGTH);

/**
 * Distribuição do símbolo central de um rolo: a soma de Pr(K = k) sobre as paradas k
 * que levam o símbolo ao centro, R[(k+1) mod 5]. Cada símbolo resulta em 1/5.
 */
export function centerSymbolDistribution(): Map<Sym, Fraction> {
  const dist = new Map<Sym, Fraction>(SYMBOLS.map((s) => [s, Fraction.of(0)]));
  for (const k of ALL_STOPS) {
    const c = windowAt(k)[1];
    dist.set(c, (dist.get(c) as Fraction).add(STOP_PROBABILITY));
  }
  return dist;
}

/** Os 5³ = 125 resultados centrais, em ordem lexicográfica. */
export function sampleSpace(): Triple[] {
  const out: Triple[] = [];
  for (const a of REEL) for (const b of REEL) for (const c of REEL) out.push([a, b, c]);
  return out;
}

/**
 * Probabilidade de uma tripla central. As três células centrais são independentes,
 * então multiplicamos as probabilidades dos símbolos.
 */
export function tripleProbability(t: Triple): Fraction {
  const dist = centerSymbolDistribution();
  return t.reduce((p, s) => p.mul(dist.get(s) as Fraction), Fraction.of(1));
}

export interface OutcomeRow {
  /** Ex.: "A–A–A" ou "Qualquer outra tripla". */
  readonly label: string;
  /** Símbolo da tripla premiada; null para o evento "sem prêmio". */
  readonly symbol: Sym | null;
  /** Quantidade de triplas do espaço amostral neste evento. */
  readonly triples: number;
  readonly prize: Fraction;
  readonly profit: Fraction;
  readonly probability: Fraction;
}

export interface ProfitValue {
  readonly profit: Fraction;
  readonly probability: Fraction;
  /** x · Pr(X = x), a parcela deste valor em E[X]. */
  readonly contribution: Fraction;
}

export interface Theory {
  readonly sampleSpaceSize: number;
  readonly winningTriples: number;
  readonly bet: Fraction;
  /** Tabela 1: as cinco triplas premiadas e o evento "sem prêmio". */
  readonly outcomes: readonly OutcomeRow[];
  /** Distribuição de X agrupada por valor, em ordem crescente. */
  readonly profitDistribution: readonly ProfitValue[];
  readonly winProbability: Fraction;
  readonly expectedPrize: Fraction;
  readonly expectedProfit: Fraction;
  /** E[P] / aposta. */
  readonly rtp: Fraction;
  /** 1 − RTP. */
  readonly houseEdge: Fraction;
  /** Var(X) = E[X²] − E[X]². */
  readonly profitVariance: Fraction;
}

export const NO_PRIZE_LABEL = 'Qualquer outra tripla';

export function tripleLabel(s: Sym): string {
  return `${s}–${s}–${s}`;
}

export function computeTheory(table: PayTable, bet: number = BET): Theory {
  const betF = Fraction.fromDecimal(bet);
  const space = sampleSpace();

  // Agrupa as 125 triplas por evento: tripla premiada de cada símbolo ou "sem prêmio".
  const groups = new Map<Sym | null, { triples: number; probability: Fraction; prize: Fraction }>();
  for (const t of space) {
    const p = prizeFor(t, table);
    const key = p > 0 ? t[0] : null;
    const g = groups.get(key) ?? { triples: 0, probability: Fraction.of(0), prize: Fraction.fromDecimal(p) };
    g.triples += 1;
    g.probability = g.probability.add(tripleProbability(t));
    groups.set(key, g);
  }

  const outcomes: OutcomeRow[] = [...SYMBOLS, null]
    .filter((k) => groups.has(k))
    .map((k) => {
      const g = groups.get(k)!;
      return {
        label: k === null ? NO_PRIZE_LABEL : tripleLabel(k),
        symbol: k,
        triples: g.triples,
        prize: g.prize,
        profit: g.prize.sub(betF),
        probability: g.probability,
      };
    });

  // Distribuição de X por valor (tabelas com prêmios repetidos se fundem aqui).
  const byProfit = new Map<string, { profit: Fraction; probability: Fraction }>();
  for (const o of outcomes) {
    const k = o.profit.toString();
    const cur = byProfit.get(k);
    byProfit.set(k, { profit: o.profit, probability: cur ? cur.probability.add(o.probability) : o.probability });
  }
  const profitDistribution = [...byProfit.values()]
    .sort((a, b) => a.profit.sub(b.profit).toNumber())
    .map((v) => ({ ...v, contribution: v.profit.mul(v.probability) }));

  const zero = Fraction.of(0);
  const winProbability = outcomes.filter((o) => o.symbol !== null).reduce((s, o) => s.add(o.probability), zero);
  const expectedPrize = outcomes.reduce((s, o) => s.add(o.prize.mul(o.probability)), zero);
  const expectedProfit = profitDistribution.reduce((s, v) => s.add(v.contribution), zero);
  const rtp = expectedPrize.div(betF);
  const profitVariance = profitDistribution
    .reduce((s, v) => s.add(v.profit.mul(v.profit).mul(v.probability)), zero)
    .sub(expectedProfit.mul(expectedProfit));

  return {
    sampleSpaceSize: space.length,
    winningTriples: outcomes.filter((o) => o.symbol !== null).reduce((n, o) => n + o.triples, 0),
    bet: betF,
    outcomes,
    profitDistribution,
    winProbability,
    expectedPrize,
    expectedProfit,
    rtp,
    houseEdge: Fraction.of(1).sub(rtp),
    profitVariance,
  };
}
