# Plano de execução: Simulador de máquina didática

Escopo combinado:
- **Entregáveis:** Simulador (Next + Nest) e Resultados (CSV, gráficos e manifesto).
- **Critérios de avaliação:** Modelo implementado (15), Conceitos e cálculos (20) e Cinco experimentos (25).
- **Extra:** Validação automatizada (3).
- **Fora do escopo:** relatório PDF, README de entrega, discussão crítica e os demais extras.

## Decisões fixadas

| Tema | Decisão |
|---|---|
| Repositório | Monorepo pnpm: `packages/core`, `apps/api` (NestJS) e `apps/web` (Next.js) |
| Regras | Ficam todas em `packages/core`, em TS puro e sem I/O. A API e a CLI apenas chamam o core |
| PRNG | `pure-rand` com versão fixada no `package.json` e algoritmo `xoroshiro128plus`. O sorteio usa `uniformIntDistribution(0, 4)`. A versão do Node fica fixada em `.nvmrc` |
| Semente | O gerador é criado uma única vez por execução, pela camada que a inicia (CLI, API ou teste), e passado adiante. Nenhuma função recria o gerador |
| Resultados | `pnpm results` grava `results/*.csv`, `results/*.svg` e `results/manifest.json` |
| Conceitos | Página "Modelo e matemática" na interface, mais `results/teoria.csv`. As frações são exatas e calculadas a partir da tabela de pagamentos |
| Interface dos experimentos | Abre com os parâmetros oficiais, permite alterar os parâmetros e rodar de novo. Os resultados oficiais aparecem sempre identificados |
| Rodada | Tabuleiro 3×3 com a linha central destacada, os valores K1..K3, P, X, saldo e histórico. O aviso fixo diz "Simulador acadêmico - somente créditos fictícios" |
| Persistência | Sem banco de dados. A sessão da rodada interativa fica em memória na API |

## Fase 0: Estrutura
- Criar o workspace pnpm com TypeScript estrito, Vitest no core, ESLint/Prettier e `.nvmrc`.
- Organizar as pastas `packages/core`, `apps/api`, `apps/web` e `results/`.

## Fase 1: Core (critério "Modelo implementado")
1. `rules.ts`: o rolo R = (A,B,C,D,E), a aposta de 1 e as tabelas `BASE` (5/10/15/25/50) e `PLUS10` (5,5/11/16,5/27,5/55).
2. `rng.ts`: um wrapper fino sobre o pure-rand, com `createRng(seed)` e `nextStop(rng) → 0..4`. Expõe os metadados do gerador (nome, versão e algoritmo) para o manifesto.
3. `round.ts`: `spin(rng)` sorteia K1, K2 e K3 nessa ordem e monta cada coluna com R[K], R[(K+1) mod 5] e R[(K+2) mod 5]. Só a linha central é avaliada. `payout(center, table) → P` e `profit = P − 1`. Prêmio (P) e lucro (X) ficam como campos distintos.
4. `session.ts`: a sessão com saldo, B(t+1) = B(t) + X(t+1), que para em 500 rodadas ou quando o saldo fica abaixo de 1, sem reposição.
5. `stats.ts`: média, mediana, desvio-padrão amostral (N−1), frequências e média acumulada.
6. `theory.ts`: uma classe `Fraction` simples. Gera os 125 resultados, os 5 eventos premiados, a distribuição de P e X, E[P], E[X], RTP, vantagem da casa e as contribuições x·Pr(X=x).

## Fase 2: Experimentos no core (critério "Cinco experimentos")
Cada experimento é uma função pura `(params) → objeto de resultados`, que já contém as conferências.
- **E1:** 10.000 rodadas com semente 2026. Gera a tabela X / prob. teórica / contagem / freq. relativa, além de X̄, RTP observado, proporção de prêmios e s. Confere que a soma é 10.000.
- **E2:** sementes 10, 2026 e 123456, com 10.000 rodadas cada. Gera a tabela 3×3 das médias após 100, 1.000 e 10.000 rodadas, as trajetórias e a reexecução da semente 2026 para comparar os 10 primeiros resultados. A sequência de 2026 é a mesma do E1.
- **E3:** 100 participantes com semente 42, criada uma vez e continuada entre os participantes. Registra saldo final, número de rodadas e esgotamento. Calcula as proporções de ganho, empate e perda (somando 100%), o esgotamento como subconjunto das perdas, a média e a mediana. Inclui as trajetórias dos 5 primeiros participantes, com o saldo mantido constante após a parada.
- **E4:** os 9.999 pares do E1, separados pela rodada anterior (premiada ou não). Mostra total, prêmios seguintes e proporção, comparados com 4%. Um grupo vazio aparece como "não estimável".
- **E5:** as tabelas BASE e PLUS10 aplicadas às **mesmas** 10.000 rodadas do E1, sem novo sorteio. Mostra prob./freq. de prêmio, prêmio médio, lucro médio e RTP teórico e observado. Confere 92,4% e −0,076.

## Fase 3: Testes (extra "Validação automatizada")
Vitest no core, rodado com `pnpm test`, com estas verificações:
1. As 5 triplas pagam o valor da tabela e as outras 120 pagam 0.
2. X = P − 1 em todas as 125 triplas.
3. A mesma semente gera a mesma sequência, e sementes diferentes geram sequências diferentes.
4. Os totais conferem: 10.000 no E1, 100 no E3 e 9.999 no E4.
5. Teoria: E[P] = 21/25, E[X] = −4/25 e RTP do PLUS10 = 92,4%.
6. Caso-limite: um saldo de 1 que perde encerra a sessão, e um grupo vazio no E4 aparece como não estimável.
7. Janela: K=4 mostra E, A e B.

## Fase 4: CLI de resultados (entregável "Resultados")
`pnpm results` executa a teoria e os experimentos E1 a E5 e grava estes arquivos:
- `teoria.csv`, `e1_frequencias.csv`, `e1_resumo.csv`, `e1_rodadas.csv` (o registro bruto: K1..K3, linha central, P e X).
- `e2_medias.csv`, `e2_trajetorias.csv`, `e2_reproducao.csv`.
- `e3_participantes.csv`, `e3_resumo.csv`, `e3_trajetorias.csv`.
- `e4_condicional.csv` e `e5_comparacao.csv`.
- Os SVGs são renderizados no Node com Vega-Lite, sem navegador: a Figura 4 teórica, as barras teoria × observação do E1, as trajetórias com a referência −0,16 do E2, as trajetórias dos 5 primeiros do E3 e as proporções do E4.
- `manifest.json`: data, versão do Node, versão do pure-rand, algoritmo, sementes, parâmetros e o hash de cada arquivo.

## Fase 5: API NestJS
- `GET /theory?table=base|plus10` devolve a teoria.
- `POST /session` (com seed opcional) e `POST /session/:id/spin` controlam a rodada interativa, com o gerador mantido em memória.
- `POST /experiments/:n` executa o experimento com os parâmetros recebidos (validados com class-validator). `GET /experiments/:n/official` executa com os parâmetros oficiais.
- `GET /meta` informa o gerador, as versões e o aviso.

## Fase 6: Interface Next.js
Todas as páginas mostram o aviso "Simulador acadêmico - somente créditos fictícios".
1. **Rodada:** tabuleiro 3×3, valores K, P, X, saldo, histórico e semente visível.
2. **Modelo e matemática:** espaço amostral (os 125 resultados), Tabela 1 em frações e em %, as contas de E[P], E[X] e RTP, os gráficos da Figura 4 e a explicação de independência e de por que as células de uma mesma coluna não são independentes.
3. **Experimentos 1 a 5:** uma aba por experimento com procedimento, tabela, gráfico (Recharts), conferências e um texto curto de interpretação com os conceitos indicados. Os parâmetros podem ser editados, e a execução oficial fica marcada com um selo.

## Fase 7: Conferência final (lista da seção 9)
Pagamentos das 5 triplas, desconto da aposta, reprodução pela semente, soma 10.000 (E1), 100 pessoas (E3), 9.999 pares (E4), unidades e títulos nos gráficos, e CSVs iguais aos números exibidos na interface.

## Status
- [x] Fase 0: estrutura (pnpm via corepack; `corepack enable` se `pnpm` não for encontrado)
- [x] Fase 1: core
- [x] Fase 2: experimentos
- [x] Fase 3: testes (`pnpm test`)
- [x] Fase 4: CLI (`pnpm results`; SVG via Vega-Lite, saída idêntica entre execuções, exceto `generatedAt`)
- [x] Fase 5: API NestJS (`pnpm api`, porta 3001, prefixo `/api`)
- [x] Fase 6: interface Next.js (`pnpm dev` sobe API + web)
- [x] Migração: a API Nest foi substituída por Route Handlers do Next (`apps/web/app/api`); tudo roda em `apps/web` (ver PLANO_MIGRACAO.md)
- [ ] Fase 7: conferência final

## Ordem sugerida de trabalho
Fase 0 → 1 → 3 (testes junto com o core) → 2 → 4 → 5 → 6 → 7.
