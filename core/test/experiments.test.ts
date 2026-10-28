import { describe, expect, it } from 'vitest';
import { analyzeE4, runE2, runE3, runOfficial, type Round } from '../index';

const official = runOfficial();

describe('Experimento 1', () => {
  const { rows, summary, checks } = official.e1;

  it('seis resultados, contagens somam 10.000', () => {
    expect(rows).toHaveLength(6);
    expect(rows.reduce((s, r) => s + r.count, 0)).toBe(10_000);
    expect(rows.map((r) => r.profit)).toEqual([-1, 4, 9, 14, 24, 49]);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('resumo coerente com as contagens', () => {
    const totalPrize = rows.reduce((s, r) => s + r.count * (r.profit + 1), 0);
    expect(summary.totalPrize).toBe(totalPrize);
    expect(summary.observedRtp).toBeCloseTo(totalPrize / 10_000, 12);
    expect(summary.meanProfit).toBeCloseTo(summary.observedRtp - 1, 12);
    expect(summary.winProportion).toBeCloseTo(1 - (rows[0]!.count / 10_000), 12);
  });
});

describe('Experimento 2', () => {
  const { runs, reproduction } = official.e2;

  it('reutiliza a sequência de 2026 do E1', () => {
    const run2026 = runs.find((r) => r.seed === 2026)!;
    expect(run2026.checkpointMeans.at(-1)!.mean).toBeCloseTo(official.e1.summary.meanProfit, 12);
  });

  it('tabela 3 × 3 e reprodução dos dez primeiros resultados', () => {
    expect(runs.map((r) => r.checkpointMeans.map((c) => c.after))).toEqual([
      [100, 1000, 10000],
      [100, 1000, 10000],
      [100, 1000, 10000],
    ]);
    expect(reproduction.rows).toHaveLength(10);
    expect(reproduction.reproduced).toBe(true);
  });

  it('regenerar sem reaproveitar produz os mesmos números', () => {
    const fresh = runE2();
    expect(fresh.runs.map((r) => r.checkpointMeans)).toEqual(runs.map((r) => r.checkpointMeans));
  });
});

describe('Experimento 3', () => {
  const { participants, summary, trajectories, checks } = official.e3;

  it('100 participantes, categorias somam 100%', () => {
    expect(participants).toHaveLength(100);
    const { ganho, empate, perda } = summary.proportions;
    expect(ganho + empate + perda).toBeCloseTo(1, 12);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('sessões respeitam as regras de parada', () => {
    for (const p of participants) {
      expect(p.rounds).toBeLessThanOrEqual(500);
      expect(p.depleted ? p.finalBalance < 1 : p.rounds === 500).toBe(true);
    }
  });

  it('trajetórias dos 5 primeiros, com 501 pontos e saldo constante após a parada', () => {
    expect(trajectories.map((t) => t.id)).toEqual([1, 2, 3, 4, 5]);
    for (const t of trajectories) {
      expect(t.balances).toHaveLength(501);
      expect(t.balances[0]).toBe(100);
      const final = participants[t.id - 1]!.finalBalance;
      expect(t.balances.slice(t.stoppedAt).every((b) => b === final)).toBe(true);
    }
  });

  it('o gerador continua entre participantes (não é reiniciado)', () => {
    const one = runE3({ ...official.e3.params, participants: 1 });
    expect(one.participants[0]).toEqual(participants[0]);
    // Se fosse reiniciado, todos os participantes seriam idênticos.
    expect(new Set(participants.map((p) => `${p.finalBalance}/${p.rounds}`)).size).toBeGreaterThan(1);
  });
});

describe('Experimento 4', () => {
  it('9.999 pares, grupos somam o total', () => {
    const { groups, totalPairs, checks } = official.e4;
    expect(totalPairs).toBe(9_999);
    expect(groups[0].pairs + groups[1].pairs).toBe(9_999);
    // Pares "após prêmio" = prêmios entre as rodadas 1..N−1.
    const wins = 10_000 - official.e1.rows[0]!.count;
    const lastWon = official.e1Rounds.at(-1)!.prize > 0 ? 1 : 0;
    expect(groups[0].pairs).toBe(wins - lastWon);
    expect(official.e4.reference).toBeCloseTo(0.04, 12);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('caso-limite: grupo sem pares é não estimável', () => {
    const losing = Array.from({ length: 5 }, () => ({ prize: 0 }) as Round);
    const r = analyzeE4(losing, official.e4.params);
    expect(r.groups[0]).toMatchObject({ pairs: 0, proportion: null });
    expect(r.groups[1]).toMatchObject({ pairs: 4, nextWins: 0, proportion: 0 });
  });
});

describe('Experimento 5', () => {
  const [base, plus] = official.e5.rows;

  it('mesmas rodadas: mesma frequência de prêmio nas duas tabelas', () => {
    expect(base!.wins).toBe(plus!.wins);
    expect(base!.winProbability.value).toBeCloseTo(0.04, 12);
    expect(plus!.winProbability.value).toBeCloseTo(0.04, 12);
  });

  it('prêmios +10% multiplicam o RTP observado por 1,10', () => {
    expect(plus!.rtpObserved).toBeCloseTo(base!.rtpObserved * 1.1, 10);
    expect(base!.rtpObserved).toBeCloseTo(official.e1.summary.observedRtp, 12);
  });

  it('referências teóricas: 84% / 92,4% e −0,16 / −0,076', () => {
    expect(base!.rtpTheoretical.fraction).toBe('21/25');
    expect(plus!.rtpTheoretical.value).toBeCloseTo(0.924, 12);
    expect(plus!.expectedProfit.value).toBeCloseTo(-0.076, 12);
    expect(official.e5.checks.every((c) => c.ok)).toBe(true);
  });
});
