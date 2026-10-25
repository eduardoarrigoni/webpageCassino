'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Gráficos da interface (Recharts). Mesma paleta validada dos SVGs exportados:
 * cores categóricas em ordem fixa, grade discreta, legenda sempre presente com 2+ séries,
 * rótulos de valor seletivos e dica (tooltip) ao passar o mouse.
 */

export const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const INK2 = '#52514e';
const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const REF = '#6f6e69';

export interface Series {
  key: string;
  label: string;
}

export interface RefLine {
  y?: number;
  x?: number | string;
  label: string;
}

const axisProps = {
  stroke: AXIS,
  tick: { fill: INK2, fontSize: 12 },
  tickLine: { stroke: AXIS },
};

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 13 },
  labelStyle: { color: '#0b0b0b', fontWeight: 600 },
};

function refLines(refs: readonly RefLine[] | undefined) {
  return (refs ?? []).map((r) => (
    <ReferenceLine
      key={r.label}
      {...(r.y !== undefined ? { y: r.y } : { x: r.x })}
      stroke={REF}
      strokeDasharray="5 4"
      strokeWidth={1.5}
      label={{ value: r.label, position: r.y !== undefined ? 'insideTopRight' : 'insideTopLeft', fill: INK2, fontSize: 12 }}
      ifOverflow="extendDomain"
    />
  ));
}

/** Barras agrupadas: uma categoria no eixo x, uma barra por série. */
export function GroupedBars({
  data,
  xKey,
  series,
  xLabel,
  yLabel,
  format,
  yDomain,
  refs,
  showValues = true,
  height = 340,
}: {
  data: Record<string, number | string>[];
  xKey: string;
  series: Series[];
  xLabel: string;
  yLabel: string;
  format: (v: number) => string;
  yDomain?: [number | 'auto', number | 'auto'];
  refs?: RefLine[];
  showValues?: boolean;
  height?: number;
}) {
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 24, right: 16, bottom: 28, left: 16 }} barGap={4}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey={xKey} {...axisProps} label={{ value: xLabel, position: 'insideBottom', offset: -16, fill: INK2, fontSize: 12 }} />
          <YAxis
            {...axisProps}
            tickFormatter={format}
            domain={yDomain ?? [0, 'auto']}
            width={72}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: -4, fill: INK2, fontSize: 12, style: { textAnchor: 'middle' } }}
          />
          <Tooltip {...tooltipStyle} formatter={(v) => format(Number(v))} cursor={{ fill: 'rgba(11,11,11,0.05)' }} />
          {series.length > 1 && <Legend verticalAlign="top" height={30} iconType="square" itemSorter={null} />}
          {refLines(refs)}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
              {showValues && <LabelList dataKey={s.key} position="top" formatter={(v) => format(Number(v))} fill={INK2} fontSize={11} />}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Linhas sobre um eixo x numérico (opcionalmente em escala log). */
export function Lines({
  data,
  xKey,
  series,
  xLabel,
  yLabel,
  format,
  xFormat = (v: number) => v.toLocaleString('pt-BR'),
  logX = false,
  xDomain,
  xTicks,
  refs,
  height = 360,
}: {
  data: Record<string, number | null>[];
  xKey: string;
  series: Series[];
  xLabel: string;
  yLabel: string;
  format: (v: number) => string;
  xFormat?: (v: number) => string;
  logX?: boolean;
  xDomain?: [number, number];
  xTicks?: number[];
  refs?: RefLine[];
  height?: number;
}) {
  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 24, bottom: 28, left: 16 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            dataKey={xKey}
            type="number"
            scale={logX ? 'log' : 'linear'}
            domain={xDomain ?? ['dataMin', 'dataMax']}
            ticks={xTicks}
            allowDataOverflow
            tickFormatter={xFormat}
            {...axisProps}
            label={{ value: xLabel, position: 'insideBottom', offset: -16, fill: INK2, fontSize: 12 }}
          />
          <YAxis
            {...axisProps}
            tickFormatter={format}
            width={72}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: -4, fill: INK2, fontSize: 12, style: { textAnchor: 'middle' } }}
          />
          <Tooltip {...tooltipStyle} formatter={(v) => format(Number(v))} labelFormatter={(v) => `${xLabel}: ${xFormat(Number(v))}`} />
          {series.length > 1 && <Legend verticalAlign="top" height={30} itemSorter={null} />}
          {refLines(refs)}
          {series.map((s, i) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={COLORS[i]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
