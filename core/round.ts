import type { Rng, Stop } from './rng';
import { BET, REEL, REEL_LENGTH, type PayTable, type Sym } from './rules';

/** Coluna visível de um rolo: [topo, centro, base]. */
export type Column = readonly [Sym, Sym, Sym];
export type Triple = readonly [Sym, Sym, Sym];

/** Resultado do sorteio, independente da tabela de pagamentos. */
export interface Spin {
  /** Paradas K1, K2, K3, sorteadas nessa ordem. */
  readonly stops: readonly [Stop, Stop, Stop];
  /** Uma coluna por rolo. */
  readonly columns: readonly [Column, Column, Column];
  /** Linha central: a única avaliada. */
  readonly center: Triple;
}

/** Rodada avaliada: o sorteio mais o prêmio bruto P e o lucro líquido X = P − aposta. */
export interface Round extends Spin {
  /** Índice da rodada na execução, começando em 1. */
  readonly index: number;
  readonly prize: number;
  readonly profit: number;
}

/** Janela do rolo para a parada K: R[K], R[(K+1) mod 5], R[(K+2) mod 5]. */
export function windowAt(stop: Stop): Column {
  const at = (offset: number) => REEL[(stop + offset) % REEL_LENGTH] as Sym;
  return [at(0), at(1), at(2)];
}

/** Sorteia os três rolos de forma independente, usando o gerador recebido. */
export function spin(rng: Rng): Spin {
  const stops = [rng.nextStop(), rng.nextStop(), rng.nextStop()] as const;
  const columns = [windowAt(stops[0]), windowAt(stops[1]), windowAt(stops[2])] as const;
  const center = [columns[0][1], columns[1][1], columns[2][1]] as const;
  return { stops, columns, center };
}

/** Linhas do tabuleiro 3 × 3 (topo, centro, base), para exibição. */
export function boardRows(s: Spin): readonly [Triple, Triple, Triple] {
  const row = (r: 0 | 1 | 2): Triple => [s.columns[0][r], s.columns[1][r], s.columns[2][r]];
  return [row(0), row(1), row(2)];
}

/** Prêmio bruto P: paga somente se os três símbolos centrais forem iguais (tabela × aposta). */
export function prizeFor(center: Triple, table: PayTable, bet: number = BET): number {
  const [a, b, c] = center;
  return a === b && b === c ? table[a] * bet : 0;
}

/** Lucro líquido X = P − aposta. */
export function profitFor(prize: number, bet: number = BET): number {
  return prize - bet;
}

/** Aplica uma tabela de pagamentos a um sorteio já realizado (sem novo sorteio). */
export function evaluate(s: Spin, index: number, table: PayTable, bet: number = BET): Round {
  const prize = prizeFor(s.center, table, bet);
  return { ...s, index, prize, profit: profitFor(prize, bet) };
}

export function playRound(rng: Rng, index: number, table: PayTable, bet: number = BET): Round {
  return evaluate(spin(rng), index, table, bet);
}

/** Executa n rodadas fixas, sem saldo nem regra de parada, continuando o mesmo gerador. */
export function playRounds(rng: Rng, n: number, table: PayTable, bet: number = BET): Round[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`Número de rodadas inválido: ${n}`);
  const rounds: Round[] = [];
  for (let i = 1; i <= n; i++) rounds.push(playRound(rng, i, table, bet));
  return rounds;
}

/** Reavalia rodadas existentes com outra tabela, preservando os mesmos sorteios. */
export function reevaluate(rounds: readonly Spin[], table: PayTable, bet: number = BET): Round[] {
  return rounds.map((s, i) => evaluate(s, i + 1, table, bet));
}
