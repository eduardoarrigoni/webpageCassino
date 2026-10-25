'use client';

import { useEffect, useState } from 'react';
import { GroupedBars } from '@/components/charts';
import { Card, ErrorBox, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { frac, num, pct, short, signedShort } from '@/lib/format';
import type { PayTableId, TheoryResponse } from '@/lib/types';

const ROW_NAMES = ['Topo: R[K]', 'Centro: R[(K+1) mod 5]', 'Base: R[(K+2) mod 5]'];

export default function ModeloPage() {
  const [table, setTable] = useState<PayTableId>('base');
  const [t, setT] = useState<TheoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api.theory(table).then(setT, (e: Error) => setError(e.message));
  }, [table]);

  return (
    <>
      <h1>Modelo e matemática</h1>
      <p className="lead">
        Todos os valores desta página são calculados pela API a partir das regras (rolo, tabela de pagamentos e aposta), por
        enumeração dos resultados e com frações exatas. Nada foi digitado à mão.
      </p>
      <div className="actions" style={{ marginBottom: 20 }}>
        <label className="field" style={{ maxWidth: 260 }}>
          Tabela de pagamentos
          <select value={table} onChange={(e) => setTable(e.target.value as PayTableId)}>
            <option value="base">Base (5, 10, 15, 25, 50)</option>
            <option value="plus10">Prêmios +10% (5,5; 11; 16,5; 27,5; 55)</option>
          </select>
        </label>
      </div>
      <ErrorBox error={error} />
      {t && <Theory t={t} />}
    </>
  );
}

function Theory({ t }: { t: TheoryResponse }) {
  const winners = t.outcomes.filter((o) => o.symbol !== null);
  const loser = t.outcomes.find((o) => o.symbol === null)!;
  const prizeSum = winners.map((o) => short(o.prize)).join(' + ');
  const total = winners.reduce((s, o) => s + o.prize, 0);

  return (
    <div className="stack">
      <Card title="1. Sorteio e janela de cada rolo">
        <p>
          Cada rolo tem a sequência circular R = (A, B, C, D, E), nas posições 0 a 4. A parada K é sorteada uniformemente:
          Pr(K = k) = {frac(t.stopProbability.fraction)} para cada k. A coluna exibida mostra três posições consecutivas.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Posição na coluna</th>
                {t.windows.map((w) => (
                  <th key={w.stop} className="num">
                    K = {w.stop}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROW_NAMES.map((name, r) => (
                <tr key={name} className={r === 1 ? 'hl' : undefined}>
                  <td>{name}</td>
                  {t.windows.map((w) => (
                    <td key={w.stop} className="num mono">
                      {w.column[r]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Cada K leva um símbolo diferente ao centro, por isso cada símbolo também é equiprovável na posição central:{' '}
          {t.centerDistribution.map((c) => `Pr(centro = ${c.symbol}) = ${frac(c.probability.fraction)}`).join('; ')}.
        </p>
        <div className="callout">
          <p>
            <strong>Independência.</strong> Os três rolos são sorteados separadamente, então as três células centrais são
            independentes e suas probabilidades podem ser multiplicadas. Já as células de uma mesma coluna{' '}
            <em>não</em> são independentes, porque são vizinhas no rolo. Por exemplo, se o centro é A, o topo é
            necessariamente E: Pr(topo = E | centro = A) = 1, enquanto Pr(topo = E) = 1/5.
          </p>
        </div>
      </Card>

      <Card title={`2. Espaço amostral: ${t.sampleSpaceSize} triplas centrais`}>
        <p>
          São 5 × 5 × 5 = {t.sampleSpaceSize} triplas equiprováveis, cada uma com probabilidade (1/5)³ = 1/125. Os eventos
          premiados são as {t.winningTriples} triplas iguais (em destaque); o evento &quot;sem prêmio&quot; reúne as outras{' '}
          {loser.triples}.
        </p>
        <SampleSpaceGrid t={t} />
      </Card>

      <Card title="3. Variáveis aleatórias: prêmio P e lucro X = P − 1">
        <p>
          P é o prêmio bruto e X = P − 1 é o lucro líquido de uma rodada. Ambos são variáveis aleatórias discretas: antes do
          sorteio, cada valor tem uma probabilidade. Depois da rodada, observamos um valor específico (por exemplo, X = −1).
        </p>
        <div className="table-wrap">
          <table>
            <caption>Tabela 1. Distribuição do prêmio e do lucro ({t.table === 'base' ? 'modelo-base' : 'prêmios +10%'}).</caption>
            <thead>
              <tr>
                <th>Linha central</th>
                <th className="num">Triplas</th>
                <th className="num">P</th>
                <th className="num">X</th>
                <th className="num">Probabilidade</th>
                <th className="num">%</th>
                <th className="num">x · Pr(X = x)</th>
              </tr>
            </thead>
            <tbody>
              {t.outcomes.map((o) => (
                <tr key={o.label}>
                  <td className="mono">{o.label}</td>
                  <td className="num">{o.triples}</td>
                  <td className="num">{short(o.prize)}</td>
                  <td className="num">{signedShort(o.profit)}</td>
                  <td className="num">{o.triples}/125</td>
                  <td className="num">{pct(o.probability.value, 1)}</td>
                  <td className="num">{num(o.profit * o.probability.value, 3)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td className="num">{t.sampleSpaceSize}</td>
                <td />
                <td />
                <td className="num">125/125</td>
                <td className="num">100%</td>
                <td className="num">{num(t.expectedProfit.value, 3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="4. Esperança, RTP e vantagem do operador">
        <div className="stats">
          <Stat label="Chance de prêmio" value={pct(t.winProbability.value, 0)} reference={`${t.winningTriples}/125 = ${frac(t.winProbability.fraction)}`} />
          <Stat label="E[P]" value={short(t.expectedPrize.value)} reference={`= ${frac(t.expectedPrize.fraction)} crédito`} />
          <Stat label="E[X]" value={short(t.expectedProfit.value)} reference={`= ${frac(t.expectedProfit.fraction)} crédito por rodada`} />
          <Stat label="RTP" value={pct(t.rtp.value, 1)} reference={`vantagem do operador: ${pct(t.houseEdge.value, 1)}`} />
          <Stat label="DP(X)" value={num(t.profitStdDev, 3)} reference={`Var(X) = ${short(t.profitVariance.value)}`} />
        </div>
        <p>Cada pagamento é ponderado pela sua probabilidade:</p>
        <p className="math">
          E[P] = ({prizeSum}) / 125 = {short(total)} / 125 = {short(t.expectedPrize.value)}
        </p>
        <p>Pela linearidade da esperança, descontar a aposta desloca a média em 1 crédito:</p>
        <p className="math">
          E[X] = E[P − 1] = E[P] − 1 = {short(t.expectedPrize.value)} − 1 = {short(t.expectedProfit.value)}
        </p>
        <p className="math">
          RTP = E[P] / aposta = {short(t.expectedPrize.value)} / 1 = {pct(t.rtp.value, 1)} · vantagem = 1 − RTP ={' '}
          {pct(t.houseEdge.value, 1)}
        </p>
        <p>
          Para n rodadas fixas, a soma dos lucros tem esperança {short(t.expectedProfit.value)} · n. Isso não descreve o
          resultado de toda sessão, nem vale automaticamente quando o número de rodadas depende do saldo (Experimento 3).
        </p>
        <div className="callout warn">
          <p>
            <strong>RTP não é a chance de ganhar.</strong> A chance de prêmio é {pct(t.winProbability.value, 0)}; o RTP de{' '}
            {pct(t.rtp.value, 1)} é o retorno médio por crédito apostado, contando também os créditos reapostados. Não é uma
            promessa de devolução em cada sessão.
          </p>
        </div>
      </Card>

      <Card title="5. Distribuição teórica do lucro (Figura 4)">
        <p className="muted small">Estes gráficos representam as regras, não dados experimentais.</p>
        <div className="grid-2">
          <div>
            <h3>Pr(X = x)</h3>
            <GroupedBars
              data={t.profitDistribution.map((d) => ({ x: short(d.profit), p: d.probability.value }))}
              xKey="x"
              series={[{ key: 'p', label: 'Probabilidade' }]}
              xLabel="Lucro X por rodada (créditos)"
              yLabel="Probabilidade"
              format={(v) => pct(v, 1)}
              yDomain={[0, 1]}
            />
          </div>
          <div>
            <h3>Contribuição x · Pr(X = x) para E[X]</h3>
            <GroupedBars
              data={t.profitDistribution.map((d) => ({ x: short(d.profit), c: d.contribution.value }))}
              xKey="x"
              series={[{ key: 'c', label: 'Contribuição' }]}
              xLabel="Lucro X por rodada (créditos)"
              yLabel="Contribuição (créditos)"
              format={(v) => num(v, 3)}
              yDomain={['auto', 'auto']}
              refs={[{ y: t.expectedProfit.value, label: `soma = E[X] = ${short(t.expectedProfit.value)}` }]}
            />
          </div>
        </div>
      </Card>

      <div className="callout">
        <p>
          <strong>O que precisa ficar claro.</strong> Os 84% são um parâmetro didático, sem pretensão de representar um
          produto comercial. Ganhos ocasionais são possíveis; a desvantagem demonstrada aqui é em expectativa. A aparência de
          rolos, isoladamente, não prova que qualquer tabela imaginável seja desfavorável.
        </p>
      </div>
    </div>
  );
}

function SampleSpaceGrid({ t }: { t: TheoryResponse }) {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 4 }}
      role="list"
      aria-label="As 125 triplas centrais"
    >
      {t.sampleSpace.map((s) => {
        const win = s.prize > 0;
        return (
          <div
            key={s.triple.join('')}
            role="listitem"
            className="mono small"
            title={`${s.triple.join('–')}: P = ${short(s.prize)}, X = ${signedShort(s.profit)}, prob. 1/125`}
            style={{
              textAlign: 'center',
              padding: '3px 0',
              borderRadius: 6,
              border: `1px solid ${win ? '#0ca30c' : 'var(--line)'}`,
              background: win ? 'var(--good-wash)' : '#fff',
              fontWeight: win ? 700 : 400,
              color: win ? 'var(--good)' : 'var(--ink-2)',
            }}
          >
            {s.triple.join('')}
            {win && ' ★'}
          </div>
        );
      })}
    </div>
  );
}
