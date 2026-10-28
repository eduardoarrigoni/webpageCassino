import type { Rng } from './rng';
import { playRound, type Round } from './round';
import { BET, type PayTable } from './rules';

export interface SessionParams {
  readonly initialBalance: number;
  readonly maxRounds: number;
  readonly table: PayTable;
  readonly bet?: number;
}

export interface SessionResult {
  readonly initialBalance: number;
  readonly finalBalance: number;
  /** Rodadas efetivamente jogadas. */
  readonly rounds: number;
  /** Encerrou porque o saldo ficou abaixo da aposta. */
  readonly depleted: boolean;
  /** Saldo antes da 1ª rodada e após cada rodada: B0, B1, ..., Bn. */
  readonly trajectory: readonly number[];
}

/**
 * Sessão com saldo limitado: B(t+1) = B(t) + X(t+1), sem empréstimo ou reposição.
 * Termina ao completar maxRounds ou quando o saldo fica abaixo da aposta.
 * Usa (e avança) o gerador recebido, que pode continuar em outras sessões.
 */
export function playSession(rng: Rng, params: SessionParams): SessionResult {
  const bet = params.bet ?? BET;
  const { initialBalance, maxRounds, table } = params;
  if (!(initialBalance >= 0)) throw new RangeError(`Saldo inicial inválido: ${initialBalance}`);
  if (!Number.isInteger(maxRounds) || maxRounds < 0) {
    throw new RangeError(`Limite de rodadas inválido: ${maxRounds}`);
  }

  let balance = initialBalance;
  const trajectory = [balance];
  while (trajectory.length - 1 < maxRounds && balance >= bet) {
    balance += playRound(rng, trajectory.length, table, bet).profit;
    trajectory.push(balance);
  }

  return {
    initialBalance,
    finalBalance: balance,
    rounds: trajectory.length - 1,
    depleted: balance < bet,
    trajectory,
  };
}

export interface LiveRound extends Round {
  readonly bet: number;
  readonly balanceBefore: number;
  readonly balanceAfter: number;
}

export class InsufficientBalanceError extends Error {
  constructor(balance: number, bet: number) {
    super(`Saldo insuficiente: ${balance} < aposta de ${bet}. Sem empréstimo ou reposição.`);
  }
}

/**
 * Sessão interativa (uma rodada por vez), com as mesmas regras de saldo de playSession.
 * O gerador é criado fora e mantido durante toda a sessão.
 */
export class LiveSession {
  readonly bet: number;
  private balanceValue: number;
  private played = 0;

  /**
   * `progress` retoma uma sessão salva (saldo e rodadas já jogadas), junto com o gerador
   * restaurado no mesmo ponto da sequência.
   */
  constructor(
    private readonly rng: Rng,
    readonly table: PayTable,
    readonly initialBalance: number,
    bet: number = BET,
    progress?: { readonly balance: number; readonly played: number },
  ) {
    if (!(initialBalance >= 0)) throw new RangeError(`Saldo inicial inválido: ${initialBalance}`);
    if (progress && (!Number.isFinite(progress.balance) || !Number.isInteger(progress.played) || progress.played < 0)) {
      throw new RangeError('Progresso da sessão inválido');
    }
    this.bet = bet;
    this.balanceValue = progress?.balance ?? initialBalance;
    this.played = progress?.played ?? 0;
  }

  get balance(): number {
    return this.balanceValue;
  }

  get roundsPlayed(): number {
    return this.played;
  }

  /** Há saldo para a aposta padrão (a menor permitida). */
  get canPlay(): boolean {
    return this.balanceValue >= this.bet;
  }

  /** Joga uma rodada com a aposta indicada (padrão: a aposta da sessão). */
  spin(bet: number = this.bet): LiveRound {
    if (!(bet > 0)) throw new RangeError(`Aposta inválida: ${bet}`);
    if (this.balanceValue < bet) throw new InsufficientBalanceError(this.balanceValue, bet);
    const round = playRound(this.rng, this.played + 1, this.table, bet);
    const balanceBefore = this.balanceValue;
    this.balanceValue += round.profit;
    this.played++;
    return { ...round, bet, balanceBefore, balanceAfter: this.balanceValue };
  }
}
