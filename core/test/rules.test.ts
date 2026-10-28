import { describe, expect, it } from 'vitest';
import {
  BET,
  Fraction,
  PAYTABLES,
  SYMBOLS,
  computeTheory,
  prizeFor,
  profitFor,
  sampleSpace,
  windowAt,
  type Stop,
} from '../index';

describe('janela do rolo', () => {
  it('K = 4 mostra E, A, B (Figura 3)', () => {
    expect(windowAt(4)).toEqual(['E', 'A', 'B']);
  });

  it('cada parada mostra posições consecutivas com volta mod 5', () => {
    const expected = [
      ['A', 'B', 'C'],
      ['B', 'C', 'D'],
      ['C', 'D', 'E'],
      ['D', 'E', 'A'],
      ['E', 'A', 'B'],
    ];
    for (let k = 0; k < 5; k++) expect(windowAt(k as Stop)).toEqual(expected[k]);
  });
});

describe('pagamentos (Tabela 1)', () => {
  const table = PAYTABLES.base;

  it('as cinco triplas iguais pagam o valor da tabela', () => {
    expect(prizeFor(['A', 'A', 'A'], table)).toBe(5);
    expect(prizeFor(['B', 'B', 'B'], table)).toBe(10);
    expect(prizeFor(['C', 'C', 'C'], table)).toBe(15);
    expect(prizeFor(['D', 'D', 'D'], table)).toBe(25);
    expect(prizeFor(['E', 'E', 'E'], table)).toBe(50);
  });

  it('as outras 120 triplas pagam zero', () => {
    const space = sampleSpace();
    expect(space).toHaveLength(125);
    const losing = space.filter((t) => !(t[0] === t[1] && t[1] === t[2]));
    expect(losing).toHaveLength(120);
    for (const t of losing) expect(prizeFor(t, table)).toBe(0);
  });

  it('o exemplo B–D–A da Figura 2 não paga', () => {
    expect(prizeFor(['B', 'D', 'A'], table)).toBe(0);
  });

  it('lucro desconta a aposta: X = P − 1 em todas as 125 triplas', () => {
    for (const t of sampleSpace()) {
      const p = prizeFor(t, table);
      expect(profitFor(p)).toBe(p - BET);
    }
    expect(profitFor(0)).toBe(-1);
    expect(profitFor(50)).toBe(49);
  });

  it('a tabela +10% é exatamente 1,10 × base', () => {
    for (const s of SYMBOLS) {
      expect(Fraction.fromDecimal(PAYTABLES.plus10[s]).equals(Fraction.fromDecimal(PAYTABLES.base[s]).mul(Fraction.of(11, 10)))).toBe(true);
    }
  });
});

describe('teoria (seção 6)', () => {
  const base = computeTheory(PAYTABLES.base);

  it('espaço amostral e eventos', () => {
    expect(base.sampleSpaceSize).toBe(125);
    expect(base.winningTriples).toBe(5);
    expect(base.outcomes.map((o) => o.label)).toEqual([
      'A–A–A',
      'B–B–B',
      'C–C–C',
      'D–D–D',
      'E–E–E',
      'Qualquer outra tripla',
    ]);
    for (const o of base.outcomes.slice(0, 5)) expect(o.probability.toString()).toBe('1/125');
    expect(base.outcomes[5]!.probability.equals(Fraction.of(120, 125))).toBe(true);
  });

  it('probabilidades somam 1', () => {
    const total = base.outcomes.reduce((s, o) => s.add(o.probability), Fraction.of(0));
    expect(total.toString()).toBe('1');
  });

  it('chance de prêmio 4%, E[P] = 0,84, E[X] = −0,16, RTP 84%', () => {
    expect(base.winProbability.toString()).toBe('1/25');
    expect(base.expectedPrize.toString()).toBe('21/25');
    expect(base.expectedProfit.toString()).toBe('-4/25');
    expect(base.rtp.toNumber()).toBeCloseTo(0.84, 12);
    expect(base.houseEdge.toNumber()).toBeCloseTo(0.16, 12);
  });

  it('contribuições x·Pr(X=x) da Figura 4', () => {
    expect(base.profitDistribution.map((v) => v.contribution.toNumber())).toEqual([
      -0.96, 0.032, 0.072, 0.112, 0.192, 0.392,
    ]);
  });

  it('tabela +10%: RTP 92,4% e E[X] = −0,076, chance de prêmio inalterada', () => {
    const plus = computeTheory(PAYTABLES.plus10);
    expect(plus.rtp.equals(Fraction.of(924, 1000))).toBe(true);
    expect(plus.expectedProfit.equals(Fraction.of(-76, 1000))).toBe(true);
    expect(plus.winProbability.equals(base.winProbability)).toBe(true);
  });
});
