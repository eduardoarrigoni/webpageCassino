'use client';

import { useState } from 'react';
import { GroupedBars } from '@/components/charts';
import { Card, Stat } from '@/components/ui';
import { frac, int, num, pct, pp, short, signedShort } from '@/lib/format';
import type { Envelope } from '@/lib/types';
import { Shell, type FieldSpec } from './Shell';

const FIELDS: FieldSpec[] = [
  { key: 'seed', label: 'Semente', kind: 'int' },
  { key: 'rounds', label: 'Rodadas N', kind: 'int' },
  { key: 'table', label: 'Tabela de pagamentos', kind: 'table' },
];

export function E1() {
  return (
    <Shell
      n={1}
      question="As frequências acompanham as probabilidades?"
      concepts="espaço amostral; variável discreta; frequência relativa; média e desvio-padrão."
      fields={FIELDS}
      procedure={
        <p>
          Executar 10.000 rodadas com semente 2026, sem saldo nem regra de parada. Contar os seis resultados da Tabela 1 e
          comparar a frequência relativa de cada um com a probabilidade teórica. Calcular o lucro médio X̄ = ΣXᵢ/N, o RTP
          observado ΣPᵢ/N, a proporção de rodadas premiadas e o desvio-padrão amostral s (divisor N − 1).
        </p>
      }
    >
      {(d) => <Result d={d} />}
    </Shell>
  );
}

function Result({ d }: { d: Envelope<1> }) {
  const { rows, summary: s, theory: t } = d.result;
  const [onlyPrizes, setOnlyPrizes] = useState(false);
  const se = s.profitStdDev / Math.sqrt(s.n);
  const chartRows = rows
    .filter((r) => !onlyPrizes || r.profit > -1)
    .map((r) => ({ x: signedShort(r.profit), teoria: r.probability.value, obs: r.relativeFrequency }));
  const ee = rows.find((r) => r.symbol === 'E');

  return (
    <>
      <Card title="Resultados">
        <div className="table-wrap">
          <table>
            <caption>
              Contagens de {int(s.n)} rodadas (semente {d.params.seed}). Diferença em pontos percentuais (p.p.) entre
              frequência observada e probabilidade.
            </caption>
            <thead>
              <tr>
                <th>Resultado</th>
                <th className="num">Lucro X</th>
                <th className="num">Prob. teórica</th>
                <th className="num">Prob. (%)</th>
                <th className="num">Contagem</th>
                <th className="num">Esperado (N·p)</th>
                <th className="num">Freq. relativa</th>
                <th className="num">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="mono">{r.label}</td>
                  <td className="num">{signedShort(r.profit)}</td>
                  <td className="num">{frac(r.probability.fraction)}</td>
                  <td className="num">{pct(r.probability.value, 2)}</td>
                  <td className="num">{int(r.count)}</td>
                  <td className="num">{short(s.n * r.probability.value, 1)}</td>
                  <td className="num">{pct(r.relativeFrequency, 2)}</td>
                  <td className="num">{pp(r.relativeFrequency, r.probability.value)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td />
                <td className="num">1</td>
                <td className="num">100%</td>
                <td className="num">{int(rows.reduce((a, r) => a + r.count, 0))}</td>
                <td className="num">{int(s.n)}</td>
                <td className="num">{pct(rows.reduce((a, r) => a + r.relativeFrequency, 0), 2)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="stats">
          <Stat label="Lucro médio X̄" value={num(s.meanProfit, 4)} reference={`E[X] = ${short(t.expectedProfit.value)} crédito/rodada`} />
          <Stat label="RTP observado" value={pct(s.observedRtp, 2)} reference={`teórico: ${pct(t.rtp.value, 1)}`} />
          <Stat label="Rodadas premiadas" value={pct(s.winProportion, 2)} reference={`teórico: ${pct(t.winProbability.value, 0)}`} />
          <Stat label="Desvio-padrão s" value={num(s.profitStdDev, 3)} reference={`teórico DP(X) = ${num(t.profitStdDev, 3)} créditos`} />
        </div>
        <p className="small muted">
          Totais: prêmios pagos {short(s.totalPrize)} créditos, apostados {int(s.n)} créditos, lucro total{' '}
          {signedShort(s.totalProfit)} créditos.
        </p>
      </Card>

      <Card title="Teoria × observação">
        <div className="actions" style={{ marginBottom: 8 }}>
          <label className="small">
            <input type="checkbox" checked={onlyPrizes} onChange={(e) => setOnlyPrizes(e.target.checked)} /> Ampliar: mostrar só
            as cinco triplas premiadas
          </label>
        </div>
        <GroupedBars
          data={chartRows}
          xKey="x"
          series={[
            { key: 'teoria', label: 'Probabilidade teórica' },
            { key: 'obs', label: 'Frequência relativa observada' },
          ]}
          xLabel="Lucro X por rodada (créditos)"
          yLabel="Probabilidade / frequência"
          format={(v) => pct(v, onlyPrizes ? 2 : 1)}
          yDomain={onlyPrizes ? [0, 'auto'] : [0, 1]}
        />
      </Card>

      <Card title="Registro: primeiras rodadas">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="num">Rodada</th>
                <th className="num">K1 K2 K3</th>
                <th>Rolo 1</th>
                <th>Rolo 2</th>
                <th>Rolo 3</th>
                <th>Linha central</th>
                <th className="num">P</th>
                <th className="num">X</th>
              </tr>
            </thead>
            <tbody>
              {d.result.sampleRounds.map((r) => (
                <tr key={r.index} className={r.prize > 0 ? 'hl' : undefined}>
                  <td className="num">{r.index}</td>
                  <td className="num mono">{r.stops.join(' ')}</td>
                  {r.columns.map((c, i) => (
                    <td key={i} className="mono">
                      {c.join(' ')}
                    </td>
                  ))}
                  <td className="mono">{r.center.join('–')}</td>
                  <td className="num">{short(r.prize)}</td>
                  <td className="num">{signedShort(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Colunas na ordem topo, centro, base. O registro completo está em results/e1_rodadas.csv.</p>
      </Card>

      <Card title="Interpretação">
        <p>
          <strong>Frequências e probabilidades.</strong> Cada frequência relativa estima a probabilidade do evento
          correspondente: {pct(rows[0]!.relativeFrequency, 2)} das rodadas ficaram sem prêmio, contra{' '}
          {pct(rows[0]!.probability.value, 0)} na teoria, e cada tripla premiada ficou perto de 0,8%. Os valores não precisam
          coincidir: em N = {int(s.n)} rodadas, a contagem de cada tripla premiada oscila em torno de N/125 ={' '}
          {short(s.n / 125, 1)} por puro acaso.
        </p>
        <p>
          <strong>Proporção de prêmios não é o RTP.</strong> {pct(s.winProportion, 2)} das rodadas pagaram algo (quantas
          vezes houve prêmio), enquanto o RTP observado, {pct(s.observedRtp, 2)}, mede quanto voltou por crédito apostado
          (quanto foi pago). Uma é frequência de evento; a outra é média de valores.
        </p>
        <p>
          <strong>Média e dispersão.</strong> O lucro médio foi {num(s.meanProfit, 4)} crédito por rodada, contra E[X] ={' '}
          {short(t.expectedProfit.value)}. O desvio-padrão s = {num(s.profitStdDev, 2)} créditos é grande em relação à média:
          quase todas as rodadas valem −1 e poucas valem muito ({ee ? `${int(ee.count)} vezes ${signedShort(ee.profit)}` : 'prêmios raros'}). Por
          isso a média de N rodadas oscila na ordem de s/√N ≈ {num(se, 3)} crédito, e uma diferença de{' '}
          {num(Math.abs(s.meanProfit - t.expectedProfit.value), 3)} em relação a {short(t.expectedProfit.value)}{' '}
          {Math.abs(s.meanProfit - t.expectedProfit.value) <= 2 * se
            ? 'é compatível com essa variação.'
            : 'é maior que a oscilação típica: vale conferir o código e as hipóteses, sem descartar os dados.'}{' '}
          A diferença é registrada como observada; ela não autoriza alterar os dados nem escolher outra semente.
        </p>
      </Card>
    </>
  );
}
