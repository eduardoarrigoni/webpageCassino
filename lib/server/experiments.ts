import { isDeepStrictEqual } from 'node:util';
import {
  E1_OFFICIAL,
  E2_OFFICIAL,
  E3_OFFICIAL,
  E4_OFFICIAL,
  E5_OFFICIAL,
  runE1,
  runE2,
  runE3,
  runE4,
  runE5,
  runOfficial,
  type E1Params,
  type E2Params,
  type E3Params,
  type E4Params,
  type E5Params,
} from '@/core';
import { LIMITS } from './limits';
import { e1View, e2View } from './views';

export type ExperimentId = 1 | 2 | 3 | 4 | 5;
export const EXPERIMENT_IDS: readonly ExperimentId[] = [1, 2, 3, 4, 5];

const OFFICIAL = { 1: E1_OFFICIAL, 2: E2_OFFICIAL, 3: E3_OFFICIAL, 4: E4_OFFICIAL, 5: E5_OFFICIAL } as const;

/** Remove campos não enviados, para que o valor oficial prevaleça. */
function defined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function envelope<P, R>(id: ExperimentId, params: P, result: R) {
  return { experiment: id, official: isDeepStrictEqual(params, OFFICIAL[id]), params, result };
}

let officialCache: ReturnType<typeof buildOfficial> | undefined;

/**
 * Os oficiais são determinísticos: calculados uma vez (no build, pelas rotas estáticas),
 * com a sequência 2026 compartilhada por E1, E2, E4 e E5.
 */
export function official(id: ExperimentId) {
  officialCache ??= buildOfficial();
  return officialCache[id];
}

function buildOfficial() {
  const o = runOfficial();
  return {
    1: envelope(1, o.e1.params, e1View(o.e1, o.e1Rounds)),
    2: envelope(2, o.e2.params, e2View(o.e2)),
    3: envelope(3, o.e3.params, o.e3),
    4: envelope(4, o.e4.params, o.e4),
    5: envelope(5, o.e5.params, o.e5),
  };
}

export function e1(input: Partial<E1Params>) {
  const params: E1Params = { ...E1_OFFICIAL, ...defined(input) };
  const { result, rounds } = runE1(params);
  return envelope(1, params, e1View(result, rounds));
}

export function e2(input: Partial<E2Params>) {
  const params: E2Params = { ...E2_OFFICIAL, ...defined(input) };
  return envelope(2, params, e2View(runE2(params)));
}

export function e3(input: Partial<E3Params>) {
  const params: E3Params = { ...E3_OFFICIAL, ...defined(input) };
  if (params.participants * params.maxRounds > LIMITS.e3MaxWork) {
    throw new RangeError(`participantes × rodadas máximas não pode passar de ${LIMITS.e3MaxWork.toLocaleString('pt-BR')}`);
  }
  return envelope(3, params, runE3(params));
}

export function e4(input: Partial<E4Params>) {
  const params: E4Params = { ...E4_OFFICIAL, ...defined(input) };
  return envelope(4, params, runE4(params));
}

export function e5(input: Partial<E5Params>) {
  const params: E5Params = { ...E5_OFFICIAL, ...defined(input) };
  return envelope(5, params, runE5(params));
}
