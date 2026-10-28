import { describe, expect, it } from 'vitest';
import { InsufficientBalanceError, LiveSession, PAYTABLES, createRng, playSession, restoreRng, type PayTable, type Rng } from '../index';

/** Gerador fixo para casos-limite: repete a sequência de paradas dada. */
const scripted = (stops: number[]): Rng => {
  let i = 0;
  return { seed: 0, nextStop: () => stops[i++ % stops.length] as 0 | 1 | 2 | 3 | 4 };
};

const LOSE = [0, 1, 2]; // centro B–C–D
const WIN_A = [4, 4, 4]; // centro A–A–A

describe('sessão com saldo limitado', () => {
  it('caso-limite: saldo 1 que perde encerra com esgotamento após 1 rodada', () => {
    const r = playSession(scripted(LOSE), { initialBalance: 1, maxRounds: 500, table: PAYTABLES.base });
    expect(r).toMatchObject({ finalBalance: 0, rounds: 1, depleted: true });
    expect(r.trajectory).toEqual([1, 0]);
  });

  it('saldo inicial abaixo da aposta não joga', () => {
    const r = playSession(scripted(LOSE), { initialBalance: 0.5, maxRounds: 500, table: PAYTABLES.base });
    expect(r).toMatchObject({ rounds: 0, depleted: true, finalBalance: 0.5 });
  });

  it('para ao completar o limite de rodadas', () => {
    const r = playSession(scripted(WIN_A), { initialBalance: 100, maxRounds: 500, table: PAYTABLES.base });
    expect(r).toMatchObject({ rounds: 500, depleted: false, finalBalance: 100 + 500 * 4 });
  });

  it('atualiza B(t+1) = B(t) + X(t+1)', () => {
    const r = playSession(scripted([...WIN_A, ...LOSE]), { initialBalance: 10, maxRounds: 4, table: PAYTABLES.base });
    expect(r.trajectory).toEqual([10, 14, 13, 17, 16]);
  });

  it('trajetória tem rounds + 1 pontos e termina no saldo final', () => {
    const rng = createRng(42);
    const table: PayTable = PAYTABLES.base;
    for (let p = 0; p < 20; p++) {
      const r = playSession(rng, { initialBalance: 100, maxRounds: 500, table });
      expect(r.trajectory).toHaveLength(r.rounds + 1);
      expect(r.trajectory.at(-1)).toBe(r.finalBalance);
      expect(r.depleted ? r.finalBalance < 1 : r.rounds === 500).toBe(true);
    }
  });
});

describe('sessão interativa', () => {
  it('segue a mesma sequência e o mesmo saldo de playSession', () => {
    const batch = playSession(createRng(7), { initialBalance: 20, maxRounds: 50, table: PAYTABLES.base });
    const live = new LiveSession(createRng(7), PAYTABLES.base, 20);
    const balances = [live.balance];
    while (live.canPlay && live.roundsPlayed < 50) balances.push(live.spin().balanceAfter);
    expect(balances).toEqual(batch.trajectory);
  });

  it('recusa rodada sem saldo (sem empréstimo)', () => {
    const live = new LiveSession(scripted(LOSE), PAYTABLES.base, 1);
    expect(live.spin()).toMatchObject({ balanceBefore: 1, balanceAfter: 0, profit: -1 });
    expect(live.canPlay).toBe(false);
    expect(() => live.spin()).toThrow(InsufficientBalanceError);
  });
});

describe('aposta variável (tela Rodada)', () => {
  it('prêmio = multiplicador × aposta e lucro = prêmio − aposta', () => {
    const live = new LiveSession(scripted([1, 1, 1]), PAYTABLES.arcade, 1000); // centro C–C–C
    expect(live.spin(10)).toMatchObject({ bet: 10, prize: 100, profit: 90, balanceAfter: 1090 });
  });

  it('recusa aposta maior que o saldo', () => {
    const live = new LiveSession(scripted(LOSE), PAYTABLES.arcade, 5);
    expect(() => live.spin(10)).toThrow(InsufficientBalanceError);
    expect(live.spin(5)).toMatchObject({ balanceAfter: 0 });
  });
});

describe('sessão retomada', () => {
  it('retomar do estado salvo dá as mesmas rodadas e o mesmo saldo da sessão continua', () => {
    const continua = new LiveSession(createRng(2026), PAYTABLES.arcade, 1000);
    const esperado = Array.from({ length: 30 }, () => continua.spin(10));

    const rng = createRng(2026);
    const parte1 = new LiveSession(rng, PAYTABLES.arcade, 1000);
    const a = Array.from({ length: 12 }, () => parte1.spin(10));
    const salvo = { state: rng.getState(), balance: parte1.balance, played: parte1.roundsPlayed };

    const parte2 = new LiveSession(restoreRng(2026, salvo.state), PAYTABLES.arcade, 1000, 1, salvo);
    const b = Array.from({ length: 18 }, () => parte2.spin(10));
    expect([...a, ...b]).toEqual(esperado);
  });
});
