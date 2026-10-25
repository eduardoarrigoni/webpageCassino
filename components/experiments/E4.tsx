'use client';

import { GroupedBars } from '@/components/charts';
import { Card } from '@/components/ui';
import { int, pct, pp } from '@/lib/format';
import type { Envelope } from '@/lib/types';
import { Shell, type FieldSpec } from './Shell';

const FIELDS: FieldSpec[] = [
  { key: 'seed', label: 'Semente', kind: 'int' },
  { key: 'rounds', label: 'Rodadas N', kind: 'int' },
  { key: 'table', label: 'Tabela de pagamentos', kind: 'table' },
];

export function E4() {
  return (
    <Shell
      n={4}
      question="Depois de perder, aumenta a chance de ganhar?"
      concepts="probabilidade condicional; independência entre rodadas; frequência com denominador adequado."
      fields={FIELDS}
      procedure={
        <p>
          Reutilizar as 10.000 rodadas do Experimento 1 (semente 2026) e examinar os 9.999 pares consecutivos (rodada i,
          rodada i+1). Separar os pares conforme a rodada i pagou ou não prêmio. Em cada grupo, contar quantas vezes a rodada
          i+1 foi premiada e dividir pelo total de pares do grupo. Com G<sub>i</sub> = {'{'}P<sub>i</sub> &gt; 0{'}'}, a
          referência do modelo é Pr(G<sub>i+1</sub> | G<sub>i</sub>) = Pr(G<sub>i+1</sub> | G<sub>i</sub>
          <sup>c</sup>) = Pr(G<sub>i+1</sub>) = 4%.
        </p>
      }
    >
      {(d) => <Result d={d} />}
    </Shell>
  );
}

function Result({ d }: { d: Envelope<4> }) {
  const r = d.result;
  const [afterWin, afterLoss] = r.groups;
  const est = (p: number | null) => (p === null ? 'não estimável' : pct(p, 2));

  return (
    <>
      <Card title="Resultados">
        <div className="table-wrap">
          <table>
            <caption>
              Pares consecutivos: {int(r.totalPairs)} (= N − 1). Referência do modelo: {pct(r.reference, 0)}.
            </caption>
            <thead>
              <tr>
                <th>Resultado anterior</th>
                <th className="num">Total de pares</th>
                <th className="num">Prêmios na rodada seguinte</th>
                <th className="num">Proporção</th>
                <th className="num">Diferença da referência</th>
              </tr>
            </thead>
            <tbody>
              {r.groups.map((g) => (
                <tr key={g.previous}>
                  <td>Após {g.previous}</td>
                  <td className="num">{int(g.pairs)}</td>
                  <td className="num">{int(g.nextWins)}</td>
                  <td className="num">{est(g.proportion)}</td>
                  <td className="num">{g.proportion === null ? '–' : pp(g.proportion, r.reference)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Todos os pares</td>
                <td className="num">{int(r.totalPairs)}</td>
                <td className="num">{int(afterWin.nextWins + afterLoss.nextWins)}</td>
                <td className="num">{est(r.overallNextWinProportion)}</td>
                <td className="num">
                  {r.overallNextWinProportion === null ? '–' : pp(r.overallNextWinProportion, r.reference)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <GroupedBars
          data={r.groups.map((g) => ({ x: `Após ${g.previous}`, p: g.proportion ?? 0 }))}
          xKey="x"
          series={[{ key: 'p', label: 'Proporção de prêmio na rodada seguinte' }]}
          xLabel="Resultado da rodada anterior"
          yLabel="Prêmio na rodada seguinte"
          format={(v) => pct(v, 2)}
          yDomain={[0, Math.max(0.06, ...r.groups.map((g) => (g.proportion ?? 0) * 1.2))]}
          refs={[{ y: r.reference, label: `referência do modelo: ${pct(r.reference, 0)}` }]}
          height={320}
        />
      </Card>

      <Card title="Interpretação">
        <p>
          <strong>A máquina não passa a &quot;dever&quot; um prêmio.</strong> As paradas de cada rodada são sorteadas de forma
          independente das anteriores, com as mesmas probabilidades. Por isso a chance de prêmio na rodada seguinte é{' '}
          {pct(r.reference, 0)} depois de um prêmio, depois de uma perda ou depois de qualquer sequência.
        </p>
        <p>
          <strong>Denominadores diferentes.</strong> O grupo &quot;após prêmio&quot; tem só {int(afterWin.pairs)} pares,
          contra {int(afterLoss.pairs)} no grupo &quot;após sem prêmio&quot;, porque prêmios são raros. Com poucos pares, a
          proporção oscila mais: um único prêmio a mais ou a menos muda a proporção do grupo menor em{' '}
          {afterWin.pairs > 0 ? pct(1 / afterWin.pairs, 2) : '–'}, e a do grupo maior em{' '}
          {afterLoss.pairs > 0 ? pct(1 / afterLoss.pairs, 3) : '–'}.
        </p>
        <p>
          <strong>Diferença amostral não é mudança de regra.</strong> As proporções observadas foram {est(afterWin.proportion)}{' '}
          (após prêmio) e {est(afterLoss.proportion)} (após sem prêmio). Essa diferença, sozinha, não indica que as regras
          mudam após um resultado: ela é esperada em amostras finitas, sobretudo no grupo pequeno.
        </p>
        <div className="callout">
          <p>
            <strong>Falácia do jogador.</strong> É o erro de esperar compensação imediata entre resultados independentes,
            como acreditar que, depois de várias perdas, o prêmio &quot;está para sair&quot;.{' '}
            {afterLoss.proportion !== null && afterWin.proportion !== null && afterLoss.proportion <= afterWin.proportion
              ? 'Nesta execução, a proporção após perda nem chegou a ser maior que a proporção após prêmio.'
              : 'Mesmo quando a proporção após perda sai um pouco maior numa amostra, isso não indica compensação: as rodadas continuam independentes.'}
          </p>
        </div>
      </Card>
    </>
  );
}
