import { randomInt } from 'node:crypto';
import { LiveSession, MAX_SEED, PAYTABLES, createRng, restoreRng, type LiveRound, type PayTableId } from '@/core';
import { decodeSession, encodeSession, type SessionPayload } from './session-token';
import { roundView } from './views';

/** Estado público da sessão, com o token que o cliente reenvia a cada giro. */
function state(p: SessionPayload) {
  return {
    seed: p.seed,
    seedSource: p.seedSource,
    table: p.table,
    bet: p.bet,
    initialBalance: p.initialBalance,
    balance: p.balance,
    canPlay: p.balance >= p.bet,
    roundsPlayed: p.played,
    wins: p.wins,
    totalPrize: p.totalPrize,
    totalProfit: p.balance - p.initialBalance,
    totalBet: p.totalBet,
    winProportion: p.played === 0 ? null : p.wins / p.played,
    observedRtp: p.totalBet === 0 ? null : p.totalPrize / p.totalBet,
    token: encodeSession(p),
  };
}

export function createSession(input: { seed?: number; initialBalance?: number; table?: PayTableId }) {
  const seed = input.seed ?? randomInt(0, MAX_SEED + 1);
  // O gerador é criado uma vez aqui; daqui em diante só é restaurado a partir do token.
  const rng = createRng(seed);
  const initialBalance = input.initialBalance ?? 100;
  return state({
    v: 1,
    seed,
    seedSource: input.seed === undefined ? 'servidor' : 'usuário',
    table: input.table ?? 'base',
    bet: 1,
    initialBalance,
    balance: initialBalance,
    played: 0,
    wins: 0,
    totalPrize: 0,
    totalBet: 0,
    rng: [...rng.getState()],
  });
}

/**
 * Joga até `count` rodadas com a aposta `bet` (padrão: a da sessão); para antes se o saldo
 * não cobrir a aposta. A primeira rodada exige saldo (409 se não houver).
 */
export function spinSession(token: string, count: number, bet?: number) {
  const p = decodeSession(token);
  const rng = restoreRng(p.seed, p.rng);
  const session = new LiveSession(rng, PAYTABLES[p.table], p.initialBalance, p.bet, { balance: p.balance, played: p.played });
  const b = bet ?? p.bet;

  const rounds: LiveRound[] = [session.spin(b)];
  while (rounds.length < count && session.balance >= b) rounds.push(session.spin(b));

  const next: SessionPayload = {
    ...p,
    balance: session.balance,
    played: session.roundsPlayed,
    wins: p.wins + rounds.filter((r) => r.prize > 0).length,
    totalPrize: p.totalPrize + rounds.reduce((s, r) => s + r.prize, 0),
    totalBet: p.totalBet + rounds.reduce((s, r) => s + r.bet, 0),
    rng: [...rng.getState()],
  };
  return { rounds: rounds.map(roundView), state: state(next) };
}
