'use client';

import { GroupedBars, Lines } from '@/components/charts';
import { Card, Stat } from '@/components/ui';
import { int, num, pct, short } from '@/lib/format';
import type { Envelope } from '@/lib/types';
import { Shell, type FieldSpec } from './Shell';

const FIELDS: FieldSpec[] = [
  { key: 'seed', label: 'Semente', kind: 'int' },
  { key: 'participants', label: 'Participantes', kind: 'int' },
  { key: 'initialBalance', label: 'Saldo inicial', kind: 'number' },
  { key: 'maxRounds', label: 'Máximo de rodadas', kind: 'int' },
  { key: 'trajectoriesShown', label: 'Trajetórias exibidas', kind: 'int', help: 'sempre as primeiras' },
  { key: 'table', label: 'Tabela de pagamentos', kind: 'table' },
];

const BIN = 10;

export function E3() {
  return (
    <Shell
      n={3}
      question="O que acontece com um saldo limitado?"
      concepts="distribuição empírica; média e mediana; proporções; variabilidade entre sessões; horizonte de observação."
      fields={FIELDS}
      procedure={
        <p>
          Simular 100 participantes virtuais, cada um com saldo inicial de 100 créditos e aposta de 1. Cada sessão termina
          ao completar 500 rodadas ou quando o saldo fica abaixo de 1, com B<sub>t+1</sub> = B<sub>t</sub> + X
          <sub>t+1</sub>, sem empréstimo nem reposição. O gerador é iniciado uma única vez com a semente 42 e continua de um
          participante para o seguinte.
        </p>
      }
    >
      {(d) => <Result d={d} />}
    </Shell>
  );
}

function Result({ d }: { d: Envelope<3> }) {
  const r = d.result;
  const s = r.summary;
  const p = d.params;
  const n = r.participants.length;

  const trajRows = Array.from({ length: p.maxRounds + 1 }, (_, t) => {
    const row: Record<string, number> = { t };
    for (const tr of r.trajectories) row[`p${tr.id}`] = tr.balances[t]!;
    return row;
  });

  // Histograma dos saldos finais (classes de 10 créditos), só para exibição.
  const finals = r.participants.map((x) => x.finalBalance);
  const top = Math.max(...finals);
  const bins = Array.from({ length: Math.floor(top / BIN) + 1 }, (_, i) => ({
    x: `${i * BIN}–${(i + 1) * BIN}`,
    n: finals.filter((b) => b >= i * BIN && b < (i + 1) * BIN).length,
  }));
  const binOf = (v: number) => bins[Math.min(Math.floor(v / BIN), bins.length - 1)]!.x;

  const best = r.participants.reduce((a, b) => (b.finalBalance > a.finalBalance ? b : a));
  const naive = p.initialBalance + p.maxRounds * r.expectedProfit;

  return (
    <>
      <Card title="Resultados">
        <div className="stats">
          <Stat label="Ganho (saldo final > inicial)" value={pct(s.proportions.ganho, 0)} reference={`${s.counts.ganho} de ${n}`} />
          <Stat label="Empate (= inicial)" value={pct(s.proportions.empate, 0)} reference={`${s.counts.empate} de ${n}`} />
          <Stat label="Perda (< inicial)" value={pct(s.proportions.perda, 0)} reference={`${s.counts.perda} de ${n}`} />
          <Stat
            label="Esgotamento"
            value={pct(s.depletedProportion, 0)}
            reference={`${s.depletedCount} participantes · ${s.depletedAmongLosses === null ? '–' : pct(s.depletedAmongLosses, 0)} das perdas`}
          />
          <Stat label="Saldo final médio" value={num(s.meanFinalBalance, 2)} reference="créditos" />
          <Stat label="Saldo final mediano" value={short(s.medianFinalBalance)} reference="créditos" />
          <Stat label="Rodadas jogadas" value={`média ${short(s.meanRounds, 1)}`} reference={`mediana ${short(s.medianRounds)}`} />
        </div>
        <p className="small muted">
          Ganho + empate + perda = {s.counts.ganho + s.counts.empate + s.counts.perda} participantes (
          {pct(s.proportions.ganho + s.proportions.empate + s.proportions.perda, 0)}). O esgotamento é um subconjunto das
          perdas.
        </p>
      </Card>

      {r.trajectories.length > 0 && (
        <Card title={`Trajetórias dos ${r.trajectories.length} primeiros participantes`}>
          <Lines
            data={trajRows}
            xKey="t"
            series={r.trajectories.map((t) => ({ key: `p${t.id}`, label: `Participante ${t.id}` }))}
            xLabel="Rodada"
            yLabel="Saldo (créditos)"
            format={(v) => short(v)}
            xDomain={[0, p.maxRounds]}
            refs={[{ y: p.initialBalance, label: 'saldo inicial' }]}
          />
          <p className="legend-note">
            Os primeiros participantes são exibidos na ordem da simulação, sem seleção pela conclusão. Após a parada, o saldo
            é mantido constante.
            {r.trajectories.map((t) => ` P${t.id}: parou na rodada ${t.stoppedAt}.`).join('')}
          </p>
        </Card>
      )}

      <Card title="Distribuição dos saldos finais">
        <GroupedBars
          data={bins}
          xKey="x"
          series={[{ key: 'n', label: 'Participantes' }]}
          xLabel="Saldo final (créditos, classes de 10)"
          yLabel="Participantes"
          format={(v) => int(v)}
          showValues={false}
          refs={[
            { x: binOf(s.medianFinalBalance), label: `mediana ${short(s.medianFinalBalance)}` },
            { x: binOf(s.meanFinalBalance), label: `média ${num(s.meanFinalBalance, 2)}` },
          ]}
        />
        <details>
          <summary>Tabela de todos os participantes</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="num">Participante</th>
                  <th className="num">Saldo final</th>
                  <th className="num">Rodadas</th>
                  <th>Esgotou?</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {r.participants.map((x) => (
                  <tr key={x.id}>
                    <td className="num">{x.id}</td>
                    <td className="num">{short(x.finalBalance)}</td>
                    <td className="num">{x.rounds}</td>
                    <td>{x.depleted ? 'sim' : 'não'}</td>
                    <td>{x.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <Card title="Interpretação">
        <p>
          <strong>Ganhar num jogo desfavorável.</strong> {s.counts.ganho} de {n} participantes terminaram com mais do que
          começaram (o maior saldo final foi {short(best.finalBalance)}, do participante {best.id}). Isso é possível porque a
          desvantagem é em expectativa: com prêmios raros e altos, a dispersão entre sessões é grande, e alguns participantes
          recebem prêmios suficientes no horizonte observado.
        </p>
        <p>
          <strong>Média × mediana.</strong> A mediana dos saldos finais foi {short(s.medianFinalBalance)}, e a média,{' '}
          {num(s.meanFinalBalance, 2)}.{' '}
          {s.meanFinalBalance > s.medianFinalBalance
            ? 'A média é puxada para cima pelos poucos saldos altos; a mediana mostra o participante típico.'
            : 'Aqui a média não ficou acima da mediana, o que mostra a importância de olhar as duas medidas.'}{' '}
          Um relato isolado de sucesso mostra o participante {best.id}, mas omite os {s.counts.perda} que perderam, dos quais{' '}
          {s.depletedCount} esgotaram o saldo.
        </p>
        <p>
          <strong>Limites.</strong> A taxa de esgotamento ({pct(s.depletedProportion, 0)}) descreve este modelo, este saldo
          inicial ({short(p.initialBalance)}) e este horizonte ({p.maxRounds} rodadas). Ela não estima a situação de famílias
          brasileiras. Como as sessões tiveram durações diferentes (média de {short(s.meanRounds, 1)} rodadas), a conta{' '}
          {short(p.initialBalance)} − {p.maxRounds} × {short(-r.expectedProfit)} = {short(naive)} não serve como referência automática para a média
          final.
        </p>
      </Card>
    </>
  );
}
