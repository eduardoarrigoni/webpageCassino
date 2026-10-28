import { describe, expect, it } from 'vitest';
import { Fraction, countBy, cumulativeMeans, mean, median, proportion, sampleStdDev } from '../index';

describe('estatística descritiva', () => {
  it('média, mediana e desvio-padrão amostral (N − 1)', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(mean(xs)).toBe(5);
    expect(median(xs)).toBe(4.5);
    expect(median([3, 1, 2])).toBe(2);
    expect(sampleStdDev(xs)).toBeCloseTo(Math.sqrt(32 / 7), 12);
  });

  it('média acumulada', () => {
    expect(cumulativeMeans([1, 3, 5])).toEqual([1, 2, 3]);
  });

  it('contagem preserva chaves sem ocorrência', () => {
    expect([...countBy([-1, -1, 4], [-1, 4, 9])]).toEqual([[-1, 2], [4, 1], [9, 0]]);
  });

  it('proporção com denominador zero é não estimável', () => {
    expect(proportion(0, 0)).toBeNull();
    expect(proportion(1, 4)).toBe(0.25);
  });

  it('amostras vazias ou curtas são rejeitadas', () => {
    expect(() => mean([])).toThrow();
    expect(() => sampleStdDev([1])).toThrow();
  });
});

describe('frações', () => {
  it('reduz e converte decimais com exatidão', () => {
    expect(Fraction.of(120, 125).toString()).toBe('24/25');
    expect(Fraction.fromDecimal(16.5).toString()).toBe('33/2');
    expect(Fraction.fromDecimal(-0.076).toString()).toBe('-19/250');
    expect(Fraction.of(1, 3).add(Fraction.of(1, 6)).toString()).toBe('1/2');
  });
});
