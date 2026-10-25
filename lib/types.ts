/**
 * Tipos das respostas da API (formato JSON). A interface não importa nada do core:
 * as regras rodam no servidor e aqui só descrevemos o que ele devolve.
 */

// ---------- regras e rodadas ----------

export type Sym = 'A' | 'B' | 'C' | 'D' | 'E';
export type Triple = readonly [Sym, Sym, Sym];
export type PayTableId = 'base' | 'plus10' | 'arcade';
export type PayTable = Readonly<Record<Sym, number>>;

/** Valor exato ("21/25") com a aproximação decimal. */
export interface ExactValue {
  fraction: string;
  value: number;
}

export interface Round {
  index: number;
  stops: readonly [number, number, number];
  columns: readonly [Triple, Triple, Triple];
  center: Triple;
  prize: number;
  profit: number;
}

export interface Check {
  description: string;
  expected: number | string;
  observed: number | string;
  ok: boolean;
}

// ---------- teoria ----------

export interface TheorySummary {
  table: PayTableId;
  sampleSpaceSize: number;
  winningTriples: number;
  outcomes: { label: string; symbol: Sym | null; triples: number; prize: number; profit: number; probability: ExactValue }[];
  profitDistribution: { profit: number; probability: ExactValue; contribution: ExactValue }[];
  winProbability: ExactValue;
  expectedPrize: ExactValue;
  expectedProfit: ExactValue;
  rtp: ExactValue;
  houseEdge: ExactValue;
  profitVariance: ExactValue;
  profitStdDev: number;
}

// ---------- experimentos ----------

export interface E1Params {
  seed: number;
  rounds: number;
  table: PayTableId;
}
export interface E1Result {
  params: E1Params;
  theory: TheorySummary;
  rows: { label: string; symbol: Sym | null; profit: number; probability: ExactValue; count: number; relativeFrequency: number }[];
  summary: {
    n: number;
    meanProfit: number;
    observedRtp: number;
    winProportion: number;
    profitStdDev: number;
    totalPrize: number;
    totalProfit: number;
  };
  checks: Check[];
}

export interface E2Params {
  seeds: number[];
  rounds: number;
  checkpoints: number[];
  reproductionSeed: number;
  reproductionCount: number;
  table: PayTableId;
}
interface E2RoundSummary {
  stops: string;
  center: string;
  profit: number;
}
export interface E2Result {
  params: E2Params;
  expectedProfit: number;
  runs: { seed: number; checkpointMeans: { after: number; mean: number }[]; trajectory: number[] }[];
  reproduction: {
    seed: number;
    rows: { index: number; first: E2RoundSummary; second: E2RoundSummary; equal: boolean }[];
    reproduced: boolean;
  };
  checks: Check[];
}

export interface E3Params {
  seed: number;
  participants: number;
  initialBalance: number;
  maxRounds: number;
  trajectoriesShown: number;
  table: PayTableId;
}
export type E3Outcome = 'ganho' | 'empate' | 'perda';
export interface E3Result {
  params: E3Params;
  expectedProfit: number;
  participants: { id: number; finalBalance: number; rounds: number; depleted: boolean; outcome: E3Outcome }[];
  summary: {
    counts: Record<E3Outcome, number>;
    proportions: Record<E3Outcome, number>;
    depletedCount: number;
    depletedProportion: number;
    depletedAmongLosses: number | null;
    meanFinalBalance: number;
    medianFinalBalance: number;
    meanRounds: number;
    medianRounds: number;
  };
  trajectories: { id: number; balances: number[]; stoppedAt: number }[];
  checks: Check[];
}

export interface E4Params {
  seed: number;
  rounds: number;
  table: PayTableId;
}
export interface E4Group {
  previous: 'prêmio' | 'sem prêmio';
  pairs: number;
  nextWins: number;
  proportion: number | null;
}
export interface E4Result {
  params: E4Params;
  reference: number;
  groups: [E4Group, E4Group];
  totalPairs: number;
  overallNextWinProportion: number | null;
  checks: Check[];
}

export interface E5Params {
  seed: number;
  rounds: number;
  tables: PayTableId[];
}
export interface E5Result {
  params: E5Params;
  rows: {
    table: PayTableId;
    label: string;
    winProbability: ExactValue;
    winFrequency: number;
    wins: number;
    meanPrize: number;
    meanPrizeWhenWon: number | null;
    expectedPrize: ExactValue;
    meanProfit: number;
    expectedProfit: ExactValue;
    rtpTheoretical: ExactValue;
    rtpObserved: number;
  }[];
  checks: Check[];
}

// ---------- respostas da API ----------

export type RoundView = Round & { rows: readonly [Triple, Triple, Triple] };
export type LiveRoundView = RoundView & { bet: number; balanceBefore: number; balanceAfter: number };

export interface Meta {
  disclaimer: string;
  rules: { reel: Sym[]; bet: number; paytables: Record<PayTableId, PayTable>; paytableLabels: Record<PayTableId, string> };
  arcade: { table: PayTableId; initialBalance: number; bets: number[]; defaultBet: number };
  generator: { library: string; version: string; algorithm: string; distribution: string; maxSeed: number };
  runtime: { node: string };
  officialParams: { 1: E1Params; 2: E2Params; 3: E3Params; 4: E4Params; 5: E5Params };
  limits: Record<string, number>;
}

export interface TheoryResponse extends TheorySummary {
  stopProbability: ExactValue;
  windows: { stop: number; column: Triple }[];
  centerDistribution: { symbol: Sym; probability: ExactValue }[];
  sampleSpace: { triple: Triple; prize: number; profit: number; probability: ExactValue }[];
}

export interface SessionState {
  id: string;
  seed: number;
  seedSource: 'usuário' | 'servidor';
  table: PayTableId;
  bet: number;
  initialBalance: number;
  balance: number;
  canPlay: boolean;
  roundsPlayed: number;
  wins: number;
  totalPrize: number;
  totalProfit: number;
  totalBet: number;
  history: LiveRoundView[];
  historySize: number;
  winProportion: number | null;
  observedRtp: number | null;
}

export interface SpinResponse {
  rounds: LiveRoundView[];
  state: SessionState;
}

export type E1View = E1Result & { sampleRounds: RoundView[] };
export type E2View = Omit<E2Result, 'runs'> & {
  runs: { seed: number; checkpointMeans: E2Result['runs'][number]['checkpointMeans']; trajectory: { n: number; mean: number }[] }[];
};

export interface ResultsById {
  1: E1View;
  2: E2View;
  3: E3Result;
  4: E4Result;
  5: E5Result;
}
export interface ParamsById {
  1: E1Params;
  2: E2Params;
  3: E3Params;
  4: E4Params;
  5: E5Params;
}

export type ExperimentId = 1 | 2 | 3 | 4 | 5;

export interface Envelope<N extends ExperimentId> {
  experiment: N;
  official: boolean;
  params: ParamsById[N];
  result: ResultsById[N];
}
