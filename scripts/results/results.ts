/**
 * Gera os resultados oficiais: executa a teoria e os cinco experimentos com os parâmetros
 * do enunciado e grava CSV, SVG e manifest.json em apps/web/results.
 *
 * Uso: pnpm results
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { arch, platform, release } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as vega from 'vega';
import { version as vegaLiteVersion } from 'vega-lite';
import {
  DISCLAIMER,
  PAYTABLES,
  RNG_INFO,
  runOfficial,
  theoryFor,
  type Check,
  type PayTableId,
} from '../../core';
import * as charts from './charts';
import { toCsv, type Cell } from './csv';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../results');

const written: { path: string; bytes: number; sha256: string; description: string }[] = [];

async function save(name: string, content: string, description: string): Promise<void> {
  await writeFile(join(OUT_DIR, name), content, 'utf8');
  const bytes = Buffer.byteLength(content, 'utf8');
  written.push({ path: name, bytes, sha256: createHash('sha256').update(content).digest('hex'), description });
  console.log(`  ${name.padEnd(34)} ${description}`);
}

const csv = (name: string, description: string, header: string[], rows: Cell[][]) =>
  save(name, toCsv(header, rows), description);

const svg = async (name: string, description: string, spec: Parameters<typeof charts.renderSvg>[0]) =>
  save(name, await charts.renderSvg(spec), description);

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(DISCLAIMER);
  console.log(`Gravando em ${OUT_DIR}\n`);

  const startedAt = new Date();
  const o = runOfficial();
  // Tabelas do enunciado (a tabela 'arcade' é só da tela Rodada).
  const tables: PayTableId[] = ['base', 'plus10'];
  const theories = tables.map(theoryFor);

  // ------------------------------------------------------------ teoria
  await csv(
    'teoria.csv',
    'Tabela 1 por tabela de pagamentos: P, X, probabilidade e contribuição para E[X]',
    ['tabela', 'resultado', 'triplas', 'premio_P', 'lucro_X', 'probabilidade_fracao', 'probabilidade', 'contribuicao_E_X'],
    theories.flatMap((t) =>
      t.outcomes.map((r) => [t.table, r.label, r.triples, r.prize, r.profit, r.probability.fraction, r.probability.value, r.profit * r.probability.value]),
    ),
  );
  await csv(
    'teoria_resumo.csv',
    'Espaço amostral, chance de prêmio, E[P], E[X], RTP, vantagem, Var(X)',
    ['tabela', 'medida', 'fracao', 'valor'],
    theories.flatMap((t) => [
      [t.table, 'tamanho do espaço amostral', String(t.sampleSpaceSize), t.sampleSpaceSize],
      [t.table, 'triplas premiadas', String(t.winningTriples), t.winningTriples],
      [t.table, 'Pr(prêmio)', t.winProbability.fraction, t.winProbability.value],
      [t.table, 'E[P]', t.expectedPrize.fraction, t.expectedPrize.value],
      [t.table, 'E[X]', t.expectedProfit.fraction, t.expectedProfit.value],
      [t.table, 'RTP = E[P]/aposta', t.rtp.fraction, t.rtp.value],
      [t.table, 'vantagem do operador = 1 − RTP', t.houseEdge.fraction, t.houseEdge.value],
      [t.table, 'Var(X)', t.profitVariance.fraction, t.profitVariance.value],
      [t.table, 'DP(X)', null, t.profitStdDev],
    ]),
  );
  const base = theories.find((t) => t.table === 'base')!;
  await svg('teoria_distribuicao_lucro.svg', 'Figura 4 (esq.): distribuição teórica de X', charts.theoryDistributionChart(base));
  await svg('teoria_contribuicoes.svg', 'Figura 4 (dir.): contribuições x·Pr(X=x)', charts.theoryContributionChart(base));

  // ------------------------------------------------------------ E1
  const { e1 } = o;
  await csv(
    'e1_rodadas.csv',
    'Registro das 10.000 rodadas (semente 2026), usado em E1, E2, E4 e E5',
    ['rodada', 'K1', 'K2', 'K3', 'rolo1_topo_centro_base', 'rolo2_topo_centro_base', 'rolo3_topo_centro_base', 'linha_central', 'premio_P', 'lucro_X'],
    o.e1Rounds.map((r) => [r.index, ...r.stops, ...r.columns.map((c) => c.join('')), r.center.join('-'), r.prize, r.profit]),
  );
  await csv(
    'e1_frequencias.csv',
    'Lucro, probabilidade teórica, contagem e frequência relativa',
    ['resultado', 'lucro_X', 'probabilidade_teorica_fracao', 'probabilidade_teorica', 'contagem', 'frequencia_relativa'],
    [
      ...e1.rows.map((r) => [r.label, r.profit, r.probability.fraction, r.probability.value, r.count, r.relativeFrequency]),
      ['Total', null, '1', 1, e1.rows.reduce((s, r) => s + r.count, 0), e1.rows.reduce((s, r) => s + r.relativeFrequency, 0)],
    ],
  );
  await csv(
    'e1_resumo.csv',
    'Lucro médio, RTP observado, proporção de prêmios e desvio-padrão',
    ['medida', 'unidade', 'observado', 'teorico'],
    [
      ['rodadas N', 'rodadas', e1.summary.n, null],
      ['lucro médio', 'créditos por rodada', e1.summary.meanProfit, e1.theory.expectedProfit.value],
      ['RTP', 'proporção do apostado', e1.summary.observedRtp, e1.theory.rtp.value],
      ['proporção de rodadas premiadas', 'proporção', e1.summary.winProportion, e1.theory.winProbability.value],
      ['desvio-padrão do lucro (amostral, N−1)', 'créditos', e1.summary.profitStdDev, e1.theory.profitStdDev],
      ['prêmio total', 'créditos', e1.summary.totalPrize, null],
      ['lucro total', 'créditos', e1.summary.totalProfit, null],
    ],
  );
  await svg('e1_teoria_vs_observado.svg', 'Barras: probabilidade teórica × frequência observada', charts.e1Chart(e1));
  await svg('e1_premios_detalhe.svg', 'Detalhe das cinco triplas premiadas', charts.e1PrizesChart(e1));

  // ------------------------------------------------------------ E2
  const { e2 } = o;
  const cps = e2.params.checkpoints;
  await csv(
    'e2_medias.csv',
    'Tabela 3×3: média acumulada após 100, 1.000 e 10.000 rodadas',
    ['semente', ...cps.map((c) => `media_apos_${c}`)],
    e2.runs.map((r) => [r.seed, ...r.checkpointMeans.map((c) => c.mean)]),
  );
  await csv(
    'e2_trajetorias.csv',
    'Média acumulada após cada rodada, por semente',
    ['rodada', ...e2.runs.map((r) => `semente_${r.seed}`)],
    Array.from({ length: e2.params.rounds }, (_, i) => [i + 1, ...e2.runs.map((r) => r.trajectory[i] as number)]),
  );
  await csv(
    'e2_reproducao.csv',
    `Reexecução da semente ${e2.reproduction.seed}: dez primeiros resultados`,
    ['rodada', 'paradas_execucao_1', 'centro_execucao_1', 'lucro_execucao_1', 'paradas_execucao_2', 'centro_execucao_2', 'lucro_execucao_2', 'iguais'],
    e2.reproduction.rows.map((r) => [r.index, r.first.stops, r.first.center, r.first.profit, r.second.stops, r.second.center, r.second.profit, r.equal]),
  );
  await svg('e2_medias_acumuladas.svg', 'Trajetórias das médias acumuladas e referência E[X]', charts.e2Chart(e2));

  // ------------------------------------------------------------ E3
  const { e3 } = o;
  await csv(
    'e3_participantes.csv',
    'Saldo final, rodadas e esgotamento de cada participante',
    ['participante', 'saldo_inicial', 'saldo_final', 'rodadas', 'esgotou', 'resultado'],
    e3.participants.map((p) => [p.id, e3.params.initialBalance, p.finalBalance, p.rounds, p.depleted, p.outcome]),
  );
  const s3 = e3.summary;
  await csv(
    'e3_resumo.csv',
    'Proporções de ganho/empate/perda, esgotamento, média e mediana',
    ['medida', 'contagem', 'valor'],
    [
      ['participantes', e3.participants.length, null],
      ['ganho (saldo final > inicial)', s3.counts.ganho, s3.proportions.ganho],
      ['empate (saldo final = inicial)', s3.counts.empate, s3.proportions.empate],
      ['perda (saldo final < inicial)', s3.counts.perda, s3.proportions.perda],
      ['esgotamento (proporção dos participantes)', s3.depletedCount, s3.depletedProportion],
      ['esgotamento entre as perdas', s3.depletedCount, s3.depletedAmongLosses],
      ['saldo final médio (créditos)', null, s3.meanFinalBalance],
      ['saldo final mediano (créditos)', null, s3.medianFinalBalance],
      ['rodadas jogadas, média', null, s3.meanRounds],
      ['rodadas jogadas, mediana', null, s3.medianRounds],
    ],
  );
  await csv(
    'e3_trajetorias.csv',
    'Saldo após cada rodada dos 5 primeiros participantes (constante após a parada)',
    ['rodada', ...e3.trajectories.map((t) => `participante_${t.id}`)],
    Array.from({ length: e3.params.maxRounds + 1 }, (_, i) => [i, ...e3.trajectories.map((t) => t.balances[i] as number)]),
  );
  await svg('e3_trajetorias.svg', 'Trajetórias de saldo dos 5 primeiros participantes', charts.e3TrajectoriesChart(e3));
  await svg('e3_saldos_finais.svg', 'Distribuição dos saldos finais, com média e mediana', charts.e3FinalBalancesChart(e3));

  // ------------------------------------------------------------ E4
  const { e4 } = o;
  await csv(
    'e4_condicional.csv',
    'Proporção de prêmio na rodada seguinte, por resultado anterior',
    ['resultado_anterior', 'total_pares', 'premios_rodada_seguinte', 'proporcao', 'referencia_modelo'],
    [
      ...e4.groups.map((g) => [g.previous, g.pairs, g.nextWins, g.proportion ?? 'não estimável', e4.reference]),
      ['todos', e4.totalPairs, e4.groups[0].nextWins + e4.groups[1].nextWins, e4.overallNextWinProportion, e4.reference],
    ],
  );
  await svg('e4_condicional.svg', 'Proporção de prêmio após prêmio e após sem prêmio', charts.e4Chart(e4));

  // ------------------------------------------------------------ E5
  const { e5 } = o;
  await csv(
    'e5_comparacao.csv',
    'Base × Prêmios +10% sobre as mesmas 10.000 rodadas',
    [
      'tabela', 'prob_premio_teorica', 'freq_premio_observada', 'rodadas_premiadas', 'premio_medio_por_rodada',
      'premio_medio_quando_premiado', 'premio_esperado_E_P', 'lucro_medio', 'lucro_esperado_E_X', 'rtp_teorico', 'rtp_observado',
    ],
    e5.rows.map((r) => [
      r.label, r.winProbability.value, r.winFrequency, r.wins, r.meanPrize, r.meanPrizeWhenWon,
      r.expectedPrize.value, r.meanProfit, r.expectedProfit.value, r.rtpTheoretical.value, r.rtpObserved,
    ]),
  );
  await svg('e5_rtp.svg', 'RTP teórico × observado nas duas tabelas', charts.e5Chart(e5));

  // ------------------------------------------------------------ conferências
  const checks: { experiment: string; check: Check }[] = (
    [['E1', e1], ['E2', e2], ['E3', e3], ['E4', e4], ['E5', e5]] as const
  ).flatMap(([experiment, r]) => r.checks.map((check) => ({ experiment, check })));
  await csv(
    'verificacoes.csv',
    'Conferências automáticas de cada experimento',
    ['experimento', 'verificacao', 'esperado', 'observado', 'ok'],
    checks.map(({ experiment, check: c }) => [experiment, c.description, c.expected, c.observed, c.ok]),
  );

  // ------------------------------------------------------------ manifesto
  const manifest = {
    title: 'Máquina didática: resultados oficiais',
    disclaimer: DISCLAIMER,
    generatedAt: startedAt.toISOString(),
    command: 'pnpm results',
    environment: { node: process.version, platform: platform(), arch: arch(), osRelease: release() },
    generator: RNG_INFO,
    seedPolicy: 'O gerador é criado uma única vez por execução/semente e nunca reiniciado entre rodadas ou participantes.',
    libraries: { 'pure-rand': RNG_INFO.version, vega: vega.version, 'vega-lite': vegaLiteVersion },
    rules: { reel: 'A,B,C,D,E (circular, posições 0–4)', bet: 1, paytables: { base: PAYTABLES.base, plus10: PAYTABLES.plus10 } },
    experiments: {
      E1: e1.params,
      E2: e2.params,
      E3: e3.params,
      E4: { ...e4.params, note: 'Mesmas rodadas do E1 (não sorteadas de novo).' },
      E5: { ...e5.params, note: 'Mesmas rodadas do E1 reavaliadas com cada tabela (sem novo sorteio).' },
    },
    checks: { total: checks.length, allOk: checks.every((c) => c.check.ok) },
    files: [...written],
  };
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`  ${'manifest.json'.padEnd(34)} Parâmetros, sementes, gerador, versões e hashes`);

  const failed = checks.filter((c) => !c.check.ok);
  console.log(`\nConferências: ${checks.length - failed.length}/${checks.length} ok`);
  for (const f of failed) console.log(`  FALHOU [${f.experiment}] ${f.check.description}: esperado ${f.check.expected}, observado ${f.check.observed}`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
