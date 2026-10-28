import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST as runExperiment } from '@/app/api/experiments/[n]/route';
import { GET as officialExperiment } from '@/app/api/experiments/[n]/official/route';
import { GET as meta } from '@/app/api/meta/route';
import { POST as createSession } from '@/app/api/sessions/route';
import { POST as spin } from '@/app/api/sessions/spin/route';
import { GET as theory } from '@/app/api/theory/route';

/** Testa os Route Handlers chamando-os diretamente, como o Next faria. */

const URL_BASE = 'http://localhost';
const req = (path: string, body?: unknown) =>
  new NextRequest(URL_BASE + path, body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) });
const ctx = (n: string | number) => ({ params: Promise.resolve({ n: String(n) }) });

async function json(resPromise: Response | Promise<Response>, status: number) {
  const res = await resPromise;
  const body = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(status);
  return body;
}

const newSession = (body: object) => json(createSession(req('/api/sessions', body)), 201);
const spinSession = (body: object, status = 200) => json(spin(req('/api/sessions/spin', body)), status);
const stopsOf = (rounds: { stops: number[] }[]) => rounds.map((r) => r.stops);

describe('meta e teoria', () => {
  it('exibe o aviso e o gerador', async () => {
    const body = await json(meta(), 200);
    expect(body.disclaimer).toBe('Simulador acadêmico - somente créditos fictícios');
    expect(body.generator).toMatchObject({ library: 'pure-rand', algorithm: 'xoroshiro128plus' });
    expect(body.officialParams['1']).toEqual({ seed: 2026, rounds: 10000, table: 'base' });
  });

  it('teoria da tabela base: 125 resultados, RTP 84%, E[X] = −4/25', async () => {
    const body = await json(theory(req('/api/theory')), 200);
    expect(body.sampleSpace).toHaveLength(125);
    expect(body.rtp.fraction).toBe('21/25');
    expect(body.expectedProfit.fraction).toBe('-4/25');
    expect(body.windows[4].column).toEqual(['E', 'A', 'B']);
  });

  it('teoria da tabela +10% e rejeição de tabela inexistente', async () => {
    expect((await json(theory(req('/api/theory?table=plus10')), 200)).rtp.fraction).toBe('231/250');
    await json(theory(req('/api/theory?table=xyz')), 400);
  });
});

describe('sessões (rodada interativa, com token)', () => {
  it('a mesma semente reproduz as mesmas rodadas', async () => {
    const play = async () => spinSession({ token: (await newSession({ seed: 2026 })).token, count: 10 });
    const [a, b] = [await play(), await play()];
    expect(stopsOf(a.rounds)).toEqual(stopsOf(b.rounds));
    expect(a.rounds[0].rows).toHaveLength(3);
    expect(a.state).toMatchObject({ roundsPlayed: 10, seed: 2026, seedSource: 'usuário' });
  });

  it('as rodadas da sessão coincidem com o registro do E1 (semente 2026)', async () => {
    const spun = await spinSession({ token: (await newSession({ seed: 2026 })).token, count: 20 });
    const e1 = await json(officialExperiment(req('/api/experiments/1/official'), ctx(1)), 200);
    expect(stopsOf(spun.rounds)).toEqual(stopsOf(e1.result.sampleRounds));
  });

  it('girar em vários pedidos dá o mesmo que girar de uma vez (o token carrega o gerador)', async () => {
    const all = await spinSession({ token: (await newSession({ seed: 99, table: 'arcade', initialBalance: 1000 })).token, count: 30, bet: 5 });
    let token = (await newSession({ seed: 99, table: 'arcade', initialBalance: 1000 })).token;
    const parts: { stops: number[] }[] = [];
    for (const count of [1, 11, 18]) {
      const r = await spinSession({ token, count, bet: 5 });
      parts.push(...r.rounds);
      token = r.state.token;
    }
    expect(stopsOf(parts)).toEqual(stopsOf(all.rounds));
    expect((await spinSession({ token, count: 1, bet: 5 })).state.roundsPlayed).toBe(31);
  });

  it('token adulterado ou inválido é rejeitado (401)', async () => {
    const { token } = await newSession({ seed: 5, initialBalance: 100 });
    const [data, sig] = token.split('.');
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    payload.balance = 1_000_000; // tentativa de aumentar o saldo
    const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
    await spinSession({ token: forged }, 401);
    await spinSession({ token: 'lixo' }, 401);
  });

  it('sem semente, o servidor sorteia e informa', async () => {
    const s = await newSession({});
    expect(Number.isInteger(s.seed)).toBe(true);
    expect(s.seedSource).toBe('servidor');
  });

  it('saldo esgotado: para no meio do lote e depois responde 409', async () => {
    const s = await newSession({ seed: 1, initialBalance: 3 });
    const r = await spinSession({ token: s.token, count: 1000 });
    expect(r.state.canPlay).toBe(false);
    expect(r.state.balance).toBeLessThan(1);
    await spinSession({ token: r.state.token }, 409);
  });

  it('valida a entrada', async () => {
    await json(createSession(req('/api/sessions', { seed: -1 })), 400);
    await json(createSession(req('/api/sessions', { seed: 1.5 })), 400);
    await json(createSession(req('/api/sessions', { extra: 1 })), 400);
    await spinSession({}, 400);
  });
});

describe('experimentos', () => {
  const officialOf = (n: number, status = 200) => json(officialExperiment(req(`/api/experiments/${n}/official`), ctx(n)), status);
  const run = (n: number, body: object, status = 200) => json(runExperiment(req(`/api/experiments/${n}`, body), ctx(n)), status);

  it('E1 oficial: contagens somam 10.000 e conferências ok', async () => {
    const body = await officialOf(1);
    expect(body.official).toBe(true);
    expect(body.result.rows.reduce((s: number, r: { count: number }) => s + r.count, 0)).toBe(10000);
    expect(body.result.checks.every((c: { ok: boolean }) => c.ok)).toBe(true);
  });

  it('todos os oficiais respondem com conferências ok', async () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const body = await officialOf(n);
      expect(body.official).toBe(true);
      expect(body.result.checks.every((c: { ok: boolean }) => c.ok)).toBe(true);
    }
  });

  it('parâmetros enviados iguais aos oficiais reproduzem o resultado oficial', async () => {
    const official = await officialOf(4);
    const posted = await run(4, { seed: 2026 });
    expect(posted.official).toBe(true);
    expect(posted.result.groups).toEqual(official.result.groups);
  });

  it('parâmetros livres são marcados como não oficiais', async () => {
    const body = await run(1, { seed: 7, rounds: 500 });
    expect(body.official).toBe(false);
    expect(body.params).toEqual({ seed: 7, rounds: 500, table: 'base' });
    expect(body.result.summary.n).toBe(500);
  });

  it('E2 devolve trajetórias amostradas com os pontos de controle', async () => {
    const body = await officialOf(2);
    const ns = body.result.runs[0].trajectory.map((p: { n: number }) => p.n);
    expect(ns).toEqual(expect.arrayContaining([1, 100, 1000, 10000]));
    expect(ns.length).toBeLessThan(500);
    expect(body.result.reproduction.reproduced).toBe(true);
  });

  it('rejeita parâmetros fora dos limites', async () => {
    await run(1, { rounds: 0 }, 400);
    await run(1, { rounds: 10_000_000 }, 400);
    await run(2, { seeds: [1, 1] }, 400);
    await run(3, { participants: 2000, maxRounds: 5000 }, 400);
    await run(5, { tables: ['outra'] }, 400);
    await officialOf(9, 404);
    await run(9, {}, 404);
  });
});

describe('jogo da tela Rodada (aposta variável)', () => {
  it('prêmio = multiplicador × aposta, saldo e RTP pelo total apostado', async () => {
    const s = await newSession({ seed: 2026, table: 'arcade', initialBalance: 1000 });
    const r = await spinSession({ token: s.token, count: 3, bet: 10 });
    // A 3ª rodada da semente 2026 é D–D–D (multiplicador 15).
    expect(r.rounds[2]).toMatchObject({ bet: 10, prize: 150, profit: 140 });
    expect(r.state.balance).toBe(1000 - 10 - 10 + 140);
    expect(r.state.totalBet).toBe(30);
    expect(r.state.observedRtp).toBeCloseTo(150 / 30, 12);
  });

  it('aposta acima do saldo responde 409; aposta inválida 400', async () => {
    const s = await newSession({ seed: 1, table: 'arcade', initialBalance: 5 });
    await spinSession({ token: s.token, bet: 10 }, 409);
    await spinSession({ token: s.token, bet: 0 }, 400);
  });
});
