import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_SEED, PAYTABLES, RNG_INFO, centerSymbolDistribution, createRng, playRounds, restoreRng } from '../index';

const stopsOf = (seed: number, n: number) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng.nextStop());
};

describe('gerador e semente', () => {
  it('a mesma semente reproduz a mesma sequência', () => {
    expect(stopsOf(2026, 300)).toEqual(stopsOf(2026, 300));
  });

  it('sementes diferentes produzem sequências diferentes', () => {
    expect(stopsOf(2026, 300)).not.toEqual(stopsOf(10, 300));
  });

  it('paradas ficam em {0,...,4}', () => {
    for (const k of stopsOf(42, 5000)) expect([0, 1, 2, 3, 4]).toContain(k);
  });

  it('as rodadas reproduzem as mesmas paradas e resultados', () => {
    const a = playRounds(createRng(2026), 10, PAYTABLES.base);
    const b = playRounds(createRng(2026), 10, PAYTABLES.base);
    expect(a).toEqual(b);
  });

  it('o gerador continua entre chamadas (não é reiniciado)', () => {
    const rng = createRng(2026);
    const first = playRounds(rng, 5, PAYTABLES.base).map((r) => r.stops);
    const next = playRounds(rng, 5, PAYTABLES.base).map((r) => r.stops);
    const all = playRounds(createRng(2026), 10, PAYTABLES.base).map((r) => r.stops);
    expect([...first, ...next]).toEqual(all);
  });

  it('salvar e restaurar o estado continua exatamente a mesma sequência', () => {
    const continuous = stopsOf(2026, 200);
    const rng = createRng(2026);
    const first = Array.from({ length: 77 }, () => rng.nextStop());
    const state = JSON.parse(JSON.stringify(rng.getState())); // como se viajasse num token
    const restored = restoreRng(2026, state);
    const rest = Array.from({ length: 123 }, () => restored.nextStop());
    expect([...first, ...rest]).toEqual(continuous);
  });

  it('rejeita estado de gerador inválido', () => {
    expect(() => restoreRng(1, [1, 2, 3])).toThrow(RangeError);
    expect(() => restoreRng(1, [1, 2, 3, 2 ** 40])).toThrow(RangeError);
    expect(() => restoreRng(1, [1.5, 2, 3, 4])).toThrow(RangeError);
  });

  it('rejeita sementes inválidas', () => {
    expect(() => createRng(-1)).toThrow(RangeError);
    expect(() => createRng(1.5)).toThrow(RangeError);
    expect(() => createRng(MAX_SEED + 1)).toThrow(RangeError);
    expect(() => createRng(MAX_SEED)).not.toThrow();
  });

  it('cada símbolo tem chance 1/5 no centro', () => {
    for (const p of centerSymbolDistribution().values()) expect(p.toString()).toBe('1/5');
  });

  it('RNG_INFO.version coincide com o pure-rand instalado', () => {
    const require = createRequire(import.meta.url);
    const entry = require.resolve('pure-rand/generator/xoroshiro128plus');
    let dir = dirname(entry);
    while (!dir.endsWith(join('node_modules', 'pure-rand'))) dir = dirname(dir);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe(RNG_INFO.version);
  });
});
