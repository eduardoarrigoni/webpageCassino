/**
 * Tipos das respostas da API, derivados do próprio código do servidor (core e lib/server).
 * São só tipos (`import type`): nenhuma regra é enviada para o navegador.
 */
import type {
  E1Params,
  E2Params,
  E3Params,
  E4Params,
  E5Params,
  ExactValue,
  PayTable,
  PayTableId,
  Round,
  Sym,
  TheorySummary,
  Triple,
} from '@/core';
import type * as Experiments from '@/lib/server/experiments';
import type { createSession, spinSession } from '@/lib/server/sessions';
import type { roundView } from '@/lib/server/views';

export type { ExactValue, PayTable, PayTableId, Sym, Triple };

export type RoundView = ReturnType<typeof roundView<Round>>;

export type SessionState = ReturnType<typeof createSession>;
export type SpinResponse = ReturnType<typeof spinSession>;
export type LiveRoundView = SpinResponse['rounds'][number];

export interface Meta {
  disclaimer: string;
  rules: { reel: Sym[]; bet: number; paytables: Record<PayTableId, PayTable>; paytableLabels: Record<PayTableId, string> };
  arcade: { table: PayTableId; initialBalance: number; bets: number[]; defaultBet: number };
  generator: { library: string; version: string; algorithm: string; distribution: string; maxSeed: number };
  runtime: { node: string };
  officialParams: ParamsById;
  limits: Record<string, number>;
}

export interface TheoryResponse extends TheorySummary {
  stopProbability: ExactValue;
  windows: { stop: number; column: Triple }[];
  centerDistribution: { symbol: Sym; probability: ExactValue }[];
  sampleSpace: { triple: Triple; prize: number; profit: number; probability: ExactValue }[];
}

export type ExperimentId = Experiments.ExperimentId;

export interface ParamsById {
  1: E1Params;
  2: E2Params;
  3: E3Params;
  4: E4Params;
  5: E5Params;
}

/** Resposta de um experimento: { experiment, official, params, result }. */
export type Envelope<N extends ExperimentId> = ReturnType<
  { 1: typeof Experiments.e1; 2: typeof Experiments.e2; 3: typeof Experiments.e3; 4: typeof Experiments.e4; 5: typeof Experiments.e5 }[N]
>;
