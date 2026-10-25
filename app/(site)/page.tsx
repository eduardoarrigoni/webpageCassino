import Link from 'next/link';
import { GeneratorInfo } from '@/components/GeneratorInfo';

const EXPERIMENTS = [
  { n: 1, q: 'As frequências acompanham as probabilidades?' },
  { n: 2, q: 'O que muda quando aumentamos a amostra?' },
  { n: 3, q: 'O que acontece com um saldo limitado?' },
  { n: 4, q: 'Depois de perder, aumenta a chance de ganhar?' },
  { n: 5, q: 'Prêmios maiores tornam o jogo favorável?' },
];

export default function Home() {
  return (
    <>
      <h1>Uma máquina didática com regras públicas</h1>
      <p className="lead">
        Três rolos com os símbolos A, B, C, D e E. Aposta fixa de 1 crédito fictício, com pagamento somente quando os três
        símbolos da linha central são iguais. Aqui você pode calcular as probabilidades, executar simulações e comparar
        impressões com dados.
      </p>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <section className="card">
          <h2>
            <Link href="/rodada" target="_blank" rel="noopener">
              Rodada ↗
            </Link>
          </h2>
          <p>
            Jogo &quot;Bioma da Sorte&quot; em tela cheia (abre em nova aba): três rolos, cinco animais e uma linha. As
            regras e o sorteio rodam na API.
          </p>
        </section>
        <section className="card">
          <h2>
            <Link href="/modelo">Modelo e matemática</Link>
          </h2>
          <p>
            Espaço amostral de 125 resultados, distribuição de P e X, esperança, RTP e vantagem do operador, todos calculados a
            partir das regras.
          </p>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Cinco experimentos, cinco perguntas</h2>
        <ol>
          {EXPERIMENTS.map((e) => (
            <li key={e.n}>
              <Link href={`/experimentos/${e.n}`}>{e.q}</Link>
            </li>
          ))}
        </ol>
        <p className="muted small">
          Cada experimento abre com os parâmetros do enunciado (execução oficial). É possível alterá-los e rodar de novo: o
          resultado passa a ser marcado como &quot;parâmetros livres&quot;.
        </p>
      </section>

      <section className="card">
        <h2>Reprodução</h2>
        <p>
          A semente inicia o gerador pseudoaleatório uma única vez por execução, nunca antes de cada rodada. Com a mesma
          semente, o mesmo gerador e o mesmo ambiente, os resultados se repetem. Os arquivos oficiais (CSV e gráficos) são
          gerados com <code>pnpm results</code> na pasta <code>results/</code>.
        </p>
        <GeneratorInfo />
      </section>

      <div className="callout warn">
        <p>
          <strong>O que precisa ficar claro.</strong> O RTP de 84% é um parâmetro didático e não representa um produto
          comercial. Ganhos ocasionais são possíveis; a desvantagem demonstrada aqui é em <em>expectativa</em>.
        </p>
      </div>
    </>
  );
}
