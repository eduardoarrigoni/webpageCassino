'use client';

import { GroupedBars } from '@/components/charts';
import { Card } from '@/components/ui';
import { frac, int, num, pct, short } from '@/lib/format';
import type { Envelope } from '@/lib/types';
import { PaytableTable } from '@/components/PaytableTable';
import { Shell, type FieldSpec } from './Shell';

const FIELDS: FieldSpec[] = [
  { key: 'seed', label: 'Semente', kind: 'int' },
  { key: 'rounds', label: 'Rodadas N', kind: 'int' },
  { key: 'tables', label: 'Tabelas', kind: 'tableList', help: 'base, plus10' },
];

export function E5() {
  return (
    <Shell
      n={5}
      question="Prêmios maiores tornam o jogo favorável?"
      concepts="esperança de uma função da variável; RTP; comparação sob as mesmas condições."
      fields={FIELDS}
      procedure={
        <>
          <p>
            Aplicar duas tabelas de pagamentos aos <strong>mesmos</strong> 10.000 resultados do Experimento 1, sem sortear
            outra sequência. Os símbolos, suas probabilidades e a aposta de 1 crédito não mudam; muda só o prêmio de cada
            tripla.
          </p>
          <PaytableTable />
        </>
      }
    >
      {(d) => <Result d={d} />}
    </Shell>
  );
}

function Result({ d }: { d: Envelope<5> }) {
  const rows = d.result.rows;
  const base = rows.find((r) => r.table === 'base');
  const plus = rows.find((r) => r.table === 'plus10');

  return (
    <>
      <Card title="Resultados">
        <div className="table-wrap">
          <table>
            <caption>
              Mesmas {int(d.params.rounds)} rodadas (semente {d.params.seed}), reavaliadas com cada tabela. Valores monetários
              em créditos por rodada.
            </caption>
            <thead>
              <tr>
                <th>Medida</th>
                {rows.map((r) => (
                  <th key={r.table} className="num">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Probabilidade de prêmio (teórica)" cells={rows.map((r) => `${pct(r.winProbability.value, 0)} (${frac(r.winProbability.fraction)})`)} />
              <Row label="Frequência de prêmio (observada)" cells={rows.map((r) => `${pct(r.winFrequency, 2)} (${int(r.wins)})`)} />
              <Row label="Prêmio médio por rodada, ΣP/N" cells={rows.map((r) => num(r.meanPrize, 4))} />
              <Row label="Prêmio médio quando há prêmio" cells={rows.map((r) => (r.meanPrizeWhenWon === null ? '–' : num(r.meanPrizeWhenWon, 2)))} />
              <Row label="E[P] (teórico)" cells={rows.map((r) => `${short(r.expectedPrize.value)} (${frac(r.expectedPrize.fraction)})`)} />
              <Row label="Lucro médio (observado)" cells={rows.map((r) => num(r.meanProfit, 4))} />
              <Row label="E[X] (teórico)" cells={rows.map((r) => `${short(r.expectedProfit.value)} (${frac(r.expectedProfit.fraction)})`)} />
              <Row label="RTP teórico" cells={rows.map((r) => pct(r.rtpTheoretical.value, 1))} hl />
              <Row label="RTP observado" cells={rows.map((r) => pct(r.rtpObserved, 2))} hl />
            </tbody>
          </table>
        </div>
        <GroupedBars
          data={rows.map((r) => ({ x: r.label, teo: r.rtpTheoretical.value, obs: r.rtpObserved }))}
          xKey="x"
          series={[
            { key: 'teo', label: 'RTP teórico' },
            { key: 'obs', label: 'RTP observado' },
          ]}
          xLabel="Tabela de pagamentos"
          yLabel="Retorno por crédito apostado"
          format={(v) => pct(v, 1)}
          yDomain={[0, 1.15]}
          refs={[{ y: 1, label: 'equilíbrio: 100%' }]}
          height={320}
        />
      </Card>

      <Card title="Interpretação">
        {base && plus ? (
          <>
            <p>
              <strong>A chance de prêmio não mudou.</strong> Nas duas tabelas, a probabilidade de prêmio é{' '}
              {pct(base.winProbability.value, 0)} e as mesmas {int(base.wins)} rodadas foram premiadas, porque os sorteios são
              os mesmos. Mudou apenas quanto cada prêmio paga.
            </p>
            <p>
              <strong>Pagar mais melhora o retorno esperado, mas não o torna favorável.</strong> Como E[P] é linear nos
              prêmios, multiplicar todos por 1,10 multiplica o RTP: 1,10 × {pct(base.rtpTheoretical.value, 0)} ={' '}
              {pct(plus.rtpTheoretical.value, 1)}, ainda abaixo de 100%. O lucro esperado passa de{' '}
              {short(base.expectedProfit.value)} para {short(plus.expectedProfit.value)} por rodada: menos negativo, mas
              negativo. Para um RTP de 100%, os prêmios teriam de ser multiplicados por 1/{short(base.rtpTheoretical.value)}{' '}
              ≈ {num(1 / base.rtpTheoretical.value, 3)} (ou seja, cerca de {pct(1 / base.rtpTheoretical.value - 1, 0)} a mais).
            </p>
            <p>
              <strong>O observado também acompanha o fator 1,10.</strong> Com os mesmos sorteios, o RTP observado passou de{' '}
              {pct(base.rtpObserved, 2)} para {pct(plus.rtpObserved, 2)} (= 1,10 × {pct(base.rtpObserved, 2)}). Ambos ficaram{' '}
              {plus.rtpObserved > plus.rtpTheoretical.value ? 'acima' : 'abaixo'} da teoria porque esta sequência teve{' '}
              {plus.rtpObserved > plus.rtpTheoretical.value ? 'mais' : 'menos'} prêmios altos que o esperado; ainda assim, o
              lucro médio observado com +10% foi {num(plus.meanProfit, 4)} por rodada.
            </p>
            <div className="callout">
              <p>
                <strong>Três afirmações diferentes.</strong> &quot;Pagar mais&quot; (prêmios maiores), &quot;pagar com maior
                frequência&quot; (mais rodadas premiadas, aqui ainda {pct(base.winProbability.value, 0)}) e &quot;produzir
                lucro esperado positivo&quot; (E[X] &gt; 0, ou RTP &gt; 100%) não são a mesma coisa. Neste exemplo, só a
                primeira acontece.
              </p>
            </div>
          </>
        ) : (
          <p>Selecione as tabelas base e plus10 para ver a comparação completa.</p>
        )}
      </Card>
    </>
  );
}

function Row({ label, cells, hl = false }: { label: string; cells: string[]; hl?: boolean }) {
  return (
    <tr className={hl ? 'hl' : undefined}>
      <td>{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="num">
          {c}
        </td>
      ))}
    </tr>
  );
}
