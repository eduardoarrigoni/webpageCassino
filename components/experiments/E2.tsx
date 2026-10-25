'use client';

import { Lines } from '@/components/charts';
import { Card } from '@/components/ui';
import { int, num, short, signedShort } from '@/lib/format';
import type { Envelope } from '@/lib/types';
import { Shell, type FieldSpec } from './Shell';

const FIELDS: FieldSpec[] = [
  { key: 'seeds', label: 'Sementes', kind: 'intList', help: 'separadas por vírgula' },
  { key: 'rounds', label: 'Rodadas por sequência', kind: 'int' },
  { key: 'checkpoints', label: 'Pontos de controle', kind: 'intList', help: 'médias após n rodadas' },
  { key: 'reproductionSeed', label: 'Semente reexecutada', kind: 'int' },
  { key: 'reproductionCount', label: 'Resultados conferidos', kind: 'int' },
  { key: 'table', label: 'Tabela de pagamentos', kind: 'table' },
];

export function E2() {
  return (
    <Shell
      n={2}
      question="O que muda quando aumentamos a amostra?"
      concepts="simulação de Monte Carlo; média acumulada; Lei dos Grandes Números; reprodução."
      fields={FIELDS}
      procedure={
        <p>
          Executar três sequências de 10.000 rodadas, com sementes 10, 2026 e 123456 (a de 2026 é a mesma do Experimento
          1). Para cada uma, registrar a média acumulada do lucro após 100, 1.000 e 10.000 rodadas. Depois, reexecutar a
          semente 2026 no mesmo ambiente e conferir os dez primeiros resultados.
        </p>
      }
    >
      {(d) => <Result d={d} />}
    </Shell>
  );
}

function Result({ d }: { d: Envelope<2> }) {
  const r = d.result;
  const ex = r.expectedProfit;
  const cps = r.runs[0]?.checkpointMeans.map((c) => c.after) ?? [];
  const rows = (r.runs[0]?.trajectory ?? []).map((p, i) => {
    const row: Record<string, number> = { n: p.n };
    for (const run of r.runs) row[`s${run.seed}`] = run.trajectory[i]!.mean;
    return row;
  });
  const ticks = [1, 10, 100, 1000, 10000, 100000].filter((t) => t <= d.params.rounds);

  // Elementos para a interpretação, calculados a partir dos dados exibidos.
  const dev = (m: number) => Math.abs(m - ex);
  const nonMonotonic = r.runs.find((run) =>
    run.checkpointMeans.some((c, i) => i > 0 && dev(c.mean) > dev(run.checkpointMeans[i - 1]!.mean)),
  );
  const favorableStart = r.runs.find((run) => (run.checkpointMeans[0]?.mean ?? 0) > 0);
  const lastDevs = r.runs.map((run) => dev(run.checkpointMeans.at(-1)!.mean));
  const firstDevs = r.runs.map((run) => dev(run.checkpointMeans[0]!.mean));

  return (
    <>
      <Card title="Médias acumuladas">
        <div className="table-wrap">
          <table>
            <caption>Lucro médio acumulado (créditos por rodada). Referência: E[X] = {short(ex)}.</caption>
            <thead>
              <tr>
                <th>Semente</th>
                {cps.map((c) => (
                  <th key={c} className="num">
                    após {int(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.runs.map((run) => (
                <tr key={run.seed}>
                  <td className="mono">{run.seed}</td>
                  {run.checkpointMeans.map((c) => (
                    <td key={c.after} className="num">
                      {num(c.mean, 4)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="total">
                <td>E[X]</td>
                {cps.map((c) => (
                  <td key={c} className="num">
                    {num(ex, 4)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Trajetórias">
        <Lines
          data={rows}
          xKey="n"
          series={r.runs.map((run) => ({ key: `s${run.seed}`, label: `Semente ${run.seed}` }))}
          xLabel="Número de rodadas (escala log)"
          yLabel="Lucro médio acumulado"
          format={(v) => short(v, 3)}
          xFormat={(v) => int(v)}
          logX
          xDomain={[1, d.params.rounds]}
          xTicks={ticks}
          refs={[{ y: ex, label: `E[X] = ${short(ex)}` }]}
        />
        <p className="legend-note">
          O eixo horizontal está em escala logarítmica para mostrar o início e o fim das sequências. A API envia cerca de 400
          pontos por sequência; results/e2_trajetorias.csv tem todas as rodadas.
        </p>
      </Card>

      <Card title={`Reprodução da semente ${r.reproduction.seed}`}>
        <p>
          {r.reproduction.reproduced ? (
            <strong style={{ color: 'var(--good)' }}>
              ✓ Os {r.reproduction.rows.length} primeiros resultados foram reproduzidos.
            </strong>
          ) : (
            <strong style={{ color: 'var(--bad)' }}>✗ A reexecução não reproduziu todos os resultados.</strong>
          )}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="num">Rodada</th>
                <th>Paradas (1ª)</th>
                <th>Centro (1ª)</th>
                <th className="num">X (1ª)</th>
                <th>Paradas (2ª)</th>
                <th>Centro (2ª)</th>
                <th className="num">X (2ª)</th>
                <th>Iguais?</th>
              </tr>
            </thead>
            <tbody>
              {r.reproduction.rows.map((row) => (
                <tr key={row.index}>
                  <td className="num">{row.index}</td>
                  <td className="mono">{row.first.stops}</td>
                  <td className="mono">{row.first.center}</td>
                  <td className="num">{signedShort(row.first.profit)}</td>
                  <td className="mono">{row.second.stops}</td>
                  <td className="mono">{row.second.center}</td>
                  <td className="num">{signedShort(row.second.profit)}</td>
                  <td>{row.equal ? '✓ sim' : '✗ não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Interpretação">
        <p>
          <strong>Lei dos Grandes Números.</strong> Sob as hipóteses do modelo (rodadas independentes e com a mesma
          distribuição), a média de muitas rodadas tende a ficar perto de E[X] = {short(ex)}. Na tabela, a distância até{' '}
          {short(ex)} foi de até {num(Math.max(...firstDevs), 3)} após {int(cps[0] ?? 0)} rodadas e de até{' '}
          {num(Math.max(...lastDevs), 3)} após {int(cps.at(-1) ?? 0)}.
        </p>
        <p>
          <strong>A aproximação não é monotônica.</strong>{' '}
          {nonMonotonic
            ? `Na semente ${nonMonotonic.seed}, a média chegou a se afastar de E[X] entre dois pontos de controle (${nonMonotonic.checkpointMeans
                .map((c) => num(c.mean, 3))
                .join(' → ')}).`
            : 'Nestas sequências a distância diminuiu a cada ponto de controle, mas isso não é garantido.'}{' '}
          A lei também não promete um erro máximo em {int(d.params.rounds)} rodadas: ela descreve uma tendência para amostras
          grandes, não um prazo.
        </p>
        <p>
          <strong>Um começo favorável não muda o futuro.</strong>{' '}
          {favorableStart
            ? `A semente ${favorableStart.seed} começou com média positiva (${num(favorableStart.checkpointMeans[0]!.mean, 3)} após ${int(favorableStart.checkpointMeans[0]!.after)} rodadas), e mesmo assim a média voltou para perto de ${short(ex)}.`
            : 'Nenhuma sequência começou com média positiva nesta execução.'}{' '}
          As rodadas seguintes têm a mesma distribuição de antes: a média se aproxima de E[X] porque o início é diluído por
          muitas rodadas novas, e não porque a sequência &quot;compensa&quot; ganhos ou perdas.
        </p>
        <div className="callout warn">
          <p>
            Aumentar a amostra ajuda a <em>estudar</em> a média. Isso não transforma uma aposta com esperança negativa em
            fonte de renda, nem obriga a sequência a compensar perdas.
          </p>
        </div>
        <p>
          <strong>Reprodução.</strong> Com a mesma semente, o mesmo gerador ({'pure-rand / xoroshiro128plus'}) e o mesmo
          ambiente, a sequência se repete. Um gerador diferente produziria outra sequência com a mesma semente.
        </p>
      </Card>
    </>
  );
}
