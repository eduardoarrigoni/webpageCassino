import { uniformInt } from 'pure-rand/distribution/uniformInt';
import { xoroshiro128plus, xoroshiro128plusFromState } from 'pure-rand/generator/xoroshiro128plus';
import { REEL_LENGTH } from './rules';

/** Parada de um rolo: posição 0..4 da sequência circular. */
export type Stop = 0 | 1 | 2 | 3 | 4;

/**
 * Identificação do gerador, registrada nos resultados.
 * A versão é conferida contra o pacote instalado em test/rng.test.ts.
 */
export const RNG_INFO = {
  library: 'pure-rand',
  version: '8.4.2',
  algorithm: 'xoroshiro128plus',
  distribution: 'uniformInt (amostragem por rejeição, sem viés)',
} as const;

/** O xoroshiro128plus usa só 32 bits da semente; limitamos para evitar sementes "apelidadas". */
export const MAX_SEED = 2 ** 31 - 1;

export interface Rng {
  readonly seed: number;
  /** Sorteia uma parada K uniforme em {0, 1, 2, 3, 4}. */
  nextStop(): Stop;
}

/** Estado interno do xoroshiro128plus: quatro inteiros de 32 bits. */
export type RngState = readonly [number, number, number, number];

/** Gerador cujo estado pode ser salvo e restaurado (ex.: sessão da Rodada sem memória no servidor). */
export interface StatefulRng extends Rng {
  getState(): RngState;
}

export function assertValidSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new RangeError(`Semente inválida: ${seed}. Use um inteiro entre 0 e ${MAX_SEED}.`);
  }
}

/**
 * Cria o gerador. Deve ser chamada UMA vez por execução, por quem inicia a execução,
 * e o mesmo gerador é passado adiante para todas as rodadas.
 */
export function createRng(seed: number): StatefulRng {
  assertValidSeed(seed);
  return wrap(seed, xoroshiro128plus(seed));
}

/**
 * Restaura um gerador a partir do estado salvo com getState(). A sequência continua
 * exatamente de onde parou, como se o gerador nunca tivesse sido interrompido.
 */
export function restoreRng(seed: number, state: readonly number[]): StatefulRng {
  assertValidSeed(seed);
  if (state.length !== 4 || !state.every((v) => Number.isInteger(v) && v >= -(2 ** 31) && v < 2 ** 31)) {
    throw new RangeError('Estado do gerador inválido');
  }
  return wrap(seed, xoroshiro128plusFromState(state));
}

function wrap(seed: number, generator: ReturnType<typeof xoroshiro128plus>): StatefulRng {
  return {
    seed,
    nextStop: () => uniformInt(generator, 0, REEL_LENGTH - 1) as Stop,
    getState: () => generator.getState() as unknown as RngState,
  };
}
