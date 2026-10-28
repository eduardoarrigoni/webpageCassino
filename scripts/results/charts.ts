import * as vega from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';
import { logSpacedIndices, type E1Result, type E2Result, type E3Result, type E4Result, type E5Result, type TheorySummary } from '../../core';

/**
 * Gráficos exportados em SVG para o relatório.
 * Sem título dentro da imagem: número, legenda e fonte ficam no editor de texto (seção 9 do enunciado).
 * Paleta categórica validada (azul, laranja, verde-água, amarelo, magenta), sobre superfície clara.
 */

const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const INK = { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' };
const SURFACE = '#fcfcfb';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Liberation Sans", "DejaVu Sans", sans-serif';

const config = {
  background: SURFACE,
  font: FONT,
  view: { stroke: null },
  locale: { number: { decimal: ',', thousands: '.', grouping: [3], currency: ['', ''] } },
  axis: {
    gridColor: INK.grid,
    domainColor: INK.axis,
    tickColor: INK.axis,
    labelColor: INK.secondary,
    titleColor: INK.secondary,
    titleFontWeight: 'normal',
    labelFontSize: 11,
    titleFontSize: 12,
  },
  legend: { labelColor: INK.secondary, titleColor: INK.secondary, titleFontWeight: 'normal', orient: 'top', labelLimit: 0, labelFontSize: 12 },
  bar: { cornerRadiusEnd: 4 },
  line: { strokeWidth: 2, strokeCap: 'round', strokeJoin: 'round' },
  text: { color: INK.secondary, fontSize: 11 },
} as const;

const W = 560;
const H = 300;

export async function renderSvg(spec: TopLevelSpec): Promise<string> {
  const full = { ...spec, config } as unknown as TopLevelSpec;
  const view = new vega.View(vega.parse(compile(full).spec), { renderer: 'none' });
  const svg = await view.toSVG();
  view.finalize();
  return svg;
}

const fmtNum = (v: number) => v.toLocaleString('pt-BR').replace('-', '−');

const pct = (digits: number) => `format(datum.v * 100, '.${digits}f') + '%'`;

/**
 * Linhas de referência tracejadas, identificadas na legenda (não por texto solto,
 * que colide com barras e linhas). Cada item tem seu próprio tracejado.
 */
const DASHES = [[4, 4], [1, 3]];

function referenceRules(channel: 'x' | 'y', field: string, refs: readonly { value: number; label: string }[], color: string = INK.muted) {
  return [
    {
      data: { values: refs.map((r) => ({ [field]: r.value, ref: r.label })) },
      mark: { type: 'rule', color, strokeWidth: 1.5 },
      encoding: {
        [channel]: { field, type: 'quantitative' },
        strokeDash: {
          field: 'ref',
          type: 'nominal',
          title: null,
          sort: null,
          scale: { domain: refs.map((r) => r.label), range: DASHES.slice(0, refs.length) },
        },
      },
    },
  ];
}

const referenceRule = (y: number, label: string, field: string) => referenceRules('y', field, [{ value: y, label }]);

// ---------------------------------------------------------------- teoria (Figura 4)

export function theoryDistributionChart(t: TheorySummary): TopLevelSpec {
  const values = t.profitDistribution.map((d) => ({ x: d.profit, v: d.probability.value }));
  return {
    width: W,
    height: H,
    data: { values },
    transform: [{ calculate: pct(1), as: 'label' }],
    encoding: {
      x: { field: 'x', type: 'ordinal', title: 'Lucro X por rodada (créditos)', axis: { labelAngle: 0 } },
      y: { field: 'v', type: 'quantitative', title: 'Probabilidade', axis: { format: '.0%' }, scale: { domain: [0, 1] } },
    },
    layer: [
      { mark: { type: 'bar', width: 24, color: COLORS[0] } },
      { mark: { type: 'text', dy: -6 }, encoding: { text: { field: 'label' } } },
    ],
  } as TopLevelSpec;
}

export function theoryContributionChart(t: TheorySummary): TopLevelSpec {
  const values = t.profitDistribution.map((d) => ({ x: d.profit, v: d.contribution.value }));
  return {
    width: W,
    height: H,
    data: { values },
    transform: [{ calculate: "format(datum.v, '.3f')", as: 'label' }],
    encoding: {
      x: { field: 'x', type: 'ordinal', title: 'Lucro X por rodada (créditos)', axis: { labelAngle: 0 } },
      y: { field: 'v', type: 'quantitative', title: 'x · Pr(X = x) (créditos)', scale: { domain: [-1.1, 0.5] } },
    },
    layer: [
      { mark: { type: 'bar', width: 24, color: COLORS[0] } },
      // Rótulo acima das barras positivas e abaixo da negativa.
      { transform: [{ filter: 'datum.v >= 0' }], mark: { type: 'text', dy: -6 }, encoding: { text: { field: 'label' } } },
      { transform: [{ filter: 'datum.v < 0' }], mark: { type: 'text', dy: 12 }, encoding: { text: { field: 'label' } } },
    ],
  } as TopLevelSpec;
}

// ---------------------------------------------------------------- E1

function e1Values(e1: E1Result) {
  return e1.rows.flatMap((r) => [
    { x: r.profit, serie: 'Probabilidade teórica', v: r.probability.value },
    { x: r.profit, serie: 'Frequência relativa observada', v: r.relativeFrequency },
  ]);
}

function groupedBars(values: object[], yTitle: string, digits: number, domain?: [number, number]): TopLevelSpec {
  const series = ['Probabilidade teórica', 'Frequência relativa observada'];
  return {
    width: W,
    height: H,
    data: { values },
    transform: [{ calculate: pct(digits), as: 'label' }],
    encoding: {
      x: { field: 'x', type: 'ordinal', title: 'Lucro X por rodada (créditos)', axis: { labelAngle: 0 } },
      xOffset: { field: 'serie', sort: series },
      y: { field: 'v', type: 'quantitative', title: yTitle, axis: { format: `.${Math.max(digits - 1, 0)}%` }, scale: domain ? { domain } : {} },
    },
    layer: [
      {
        mark: { type: 'bar', width: 18 },
        encoding: { color: { field: 'serie', type: 'nominal', sort: series, title: null, scale: { domain: series, range: COLORS.slice(0, 2) } } },
      },
      { mark: { type: 'text', dy: -6, fontSize: 10 }, encoding: { text: { field: 'label' } } },
    ],
  } as TopLevelSpec;
}

export function e1Chart(e1: E1Result): TopLevelSpec {
  return groupedBars(e1Values(e1), 'Probabilidade / frequência relativa', 1, [0, 1]);
}

/** Detalhe das cinco triplas premiadas, cujas barras ficam pequenas na escala de 0 a 100%. */
export function e1PrizesChart(e1: E1Result): TopLevelSpec {
  return groupedBars(
    e1Values(e1).filter((d) => d.x > -1),
    'Probabilidade / frequência relativa',
    2,
  );
}

// ---------------------------------------------------------------- E2

export function e2Chart(e2: E2Result): TopLevelSpec {
  const idx = logSpacedIndices(e2.params.rounds, e2.params.checkpoints);
  const series = e2.runs.map((r) => `Semente ${r.seed}`);
  const values = e2.runs.flatMap((r) => idx.map((i) => ({ n: i, serie: `Semente ${r.seed}`, m: r.trajectory[i - 1] })));
  return {
    width: W,
    height: H,
    layer: [
      {
        data: { values },
        mark: { type: 'line' },
        encoding: {
          x: { field: 'n', type: 'quantitative', title: 'Número de rodadas (escala logarítmica)', scale: { type: 'log', domain: [1, e2.params.rounds] }, axis: { values: [1, 10, 100, 1000, 10000], format: ',d' } },
          y: { field: 'm', type: 'quantitative', title: 'Lucro médio acumulado (créditos por rodada)' },
          color: { field: 'serie', type: 'nominal', title: null, sort: series, scale: { domain: series, range: COLORS.slice(0, series.length) } },
        },
      },
      ...referenceRule(e2.expectedProfit, `Esperança E[X] = ${fmtNum(e2.expectedProfit)}`, 'm'),
    ],
  } as TopLevelSpec;
}

// ---------------------------------------------------------------- E3

export function e3TrajectoriesChart(e3: E3Result): TopLevelSpec {
  const series = e3.trajectories.map((t) => `Participante ${t.id}`);
  const values = e3.trajectories.flatMap((t) => t.balances.map((b, i) => ({ t: i, serie: `Participante ${t.id}`, b })));
  const ends = e3.trajectories.map((t) => ({
    t: t.stoppedAt,
    b: t.balances[t.stoppedAt],
    serie: `Participante ${t.id}`,
  }));
  return {
    width: W,
    height: H,
    layer: [
      {
        data: { values },
        mark: { type: 'line' },
        encoding: {
          x: { field: 't', type: 'quantitative', title: 'Rodada', scale: { domain: [0, e3.params.maxRounds] } },
          y: { field: 'b', type: 'quantitative', title: 'Saldo (créditos)' },
          color: { field: 'serie', type: 'nominal', title: null, sort: series, scale: { domain: series, range: COLORS.slice(0, series.length) }, legend: { columns: 3 } },
        },
      },
      {
        // Ponto onde cada sessão parou (esgotamento ou limite de rodadas).
        data: { values: ends },
        mark: { type: 'point', filled: true, size: 64, stroke: SURFACE, strokeWidth: 2, opacity: 1 },
        encoding: {
          x: { field: 't', type: 'quantitative' },
          y: { field: 'b', type: 'quantitative' },
          color: { field: 'serie', type: 'nominal', sort: series, scale: { domain: series, range: COLORS.slice(0, series.length) } },
        },
      },
      ...referenceRule(e3.params.initialBalance, 'Saldo inicial', 'b'),
    ],
  } as TopLevelSpec;
}

export function e3FinalBalancesChart(e3: E3Result): TopLevelSpec {
  const values = e3.participants.map((p) => ({ b: p.finalBalance }));
  const { meanFinalBalance: mean, medianFinalBalance: median } = e3.summary;
  return {
    width: W,
    height: H,
    layer: [
      {
        data: { values },
        mark: { type: 'bar', color: COLORS[0], cornerRadiusEnd: 2 },
        encoding: {
          x: { field: 'b', type: 'quantitative', bin: { step: 10 }, title: 'Saldo final (créditos, classes de 10)' },
          y: { aggregate: 'count', type: 'quantitative', title: 'Participantes' },
        },
      },
      ...referenceRules('x', 'x', [
        { value: median, label: `Mediana = ${fmtNum(median)}` },
        { value: mean, label: `Média = ${fmtNum(mean)}` },
      ], INK.primary),
    ],
  } as TopLevelSpec;
}

// ---------------------------------------------------------------- E4

export function e4Chart(e4: E4Result): TopLevelSpec {
  const values = e4.groups.map((g) => ({
    grupo: `Após ${g.previous}`,
    v: g.proportion ?? 0,
    label: g.proportion === null ? 'não estimável' : `${g.nextWins}/${g.pairs} = ${(g.proportion * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`,
  }));
  return {
    width: 360,
    height: H,
    layer: [
      ...referenceRule(e4.reference, 'Referência do modelo: 4%', 'v'),
      {
        data: { values },
        encoding: {
          x: { field: 'grupo', type: 'nominal', title: 'Resultado da rodada anterior', axis: { labelAngle: 0 }, sort: null },
          y: { field: 'v', type: 'quantitative', title: 'Proporção de prêmio na rodada seguinte', axis: { format: '.0%' }, scale: { domain: [0, 0.06] } },
        },
        layer: [
          { mark: { type: 'bar', width: 24, color: COLORS[0] } },
          { mark: { type: 'text', dy: -6 }, encoding: { text: { field: 'label' } } },
        ],
      },
    ],
  } as TopLevelSpec;
}

// ---------------------------------------------------------------- E5

export function e5Chart(e5: E5Result): TopLevelSpec {
  const series = ['RTP teórico', 'RTP observado'];
  const values = e5.rows.flatMap((r) => [
    { tabela: r.label, serie: 'RTP teórico', v: r.rtpTheoretical.value },
    { tabela: r.label, serie: 'RTP observado', v: r.rtpObserved },
  ]);
  return {
    width: 360,
    height: H,
    layer: [
      ...referenceRule(1, 'Equilíbrio: 100%', 'v'),
      {
        data: { values },
        transform: [{ calculate: pct(2), as: 'label' }],
        encoding: {
          x: { field: 'tabela', type: 'nominal', title: 'Tabela de pagamentos', axis: { labelAngle: 0 }, sort: null },
          xOffset: { field: 'serie', sort: series },
          y: { field: 'v', type: 'quantitative', title: 'Retorno por crédito apostado (RTP)', axis: { format: '.0%' }, scale: { domain: [0, 1.1] } },
        },
        layer: [
          {
            mark: { type: 'bar', width: 24 },
            encoding: { color: { field: 'serie', type: 'nominal', title: null, sort: series, scale: { domain: series, range: COLORS.slice(0, 2) } } },
          },
          { mark: { type: 'text', dy: -6, fontSize: 10 }, encoding: { text: { field: 'label' } } },
        ],
      },
    ],
  } as TopLevelSpec;
}
