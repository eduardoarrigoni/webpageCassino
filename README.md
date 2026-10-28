# Máquina didática: Trabalho I de Probabilidade e Estatística

Simulador acadêmico com créditos fictícios, feito em Next.js. Um único projeto contém a interface e o backend:

- `app/`: páginas (Início, Rodada "Bioma da Sorte", Modelo e matemática, Experimentos 1–5);
- `app/api/`: o backend (Route Handlers). As regras, o sorteio e os experimentos rodam aqui, no servidor;
- `core/`: regras da máquina, sorteio com semente (pure-rand 8.4.2, xoroshiro128plus), teoria em frações exatas e os cinco experimentos;
- `scripts/results/`: gerador dos resultados oficiais;
- `results/`: resultados oficiais (CSV, gráficos SVG e `manifest.json`).

## Requisitos

- **Node.js 20** (20.9 ou mais recente). Para conferir: `node -v`.
- **pnpm 9**: `corepack enable`. Se der erro de permissão, use `sudo corepack enable` ou `npm install -g pnpm@9.15.9`.

## Como rodar

```bash
pnpm install
pnpm dev
```

Depois, abra **http://localhost:3000**. A API responde no mesmo endereço, em `/api` (por exemplo, `http://localhost:3000/api/meta`).

## Outros comandos

| Comando | O que faz |
|---|---|
| `pnpm results` | Gera os resultados oficiais dos cinco experimentos em `results/` |
| `pnpm test` | Roda os testes automatizados (regras, sementes, totais e API) |
| `pnpm build` e `pnpm start` | Compila e inicia em modo de produção |
| `pnpm sounds` | Gera de novo os efeitos sonoros do jogo |

## Resultados

`results/` tem as tabelas em CSV, os gráficos em SVG e o `manifest.json`, com as sementes, os parâmetros, o gerador e as versões usadas. Rodar `pnpm results` de novo gera exatamente os mesmos arquivos; só muda a data no manifesto.

## Sessões da Rodada

O servidor não guarda sessões em memória. O estado de cada sessão (gerador, saldo e totais) viaja num token assinado com HMAC-SHA256: o navegador guarda e reenvia o token, mas não consegue alterá-lo, e o sorteio continua no servidor. Limitação conhecida: reenviar um token antigo "desfaz" rodadas, o que é aceitável com créditos fictícios.

## Publicação (Vercel)

- Configure a variável de ambiente **`SESSION_SECRET`** com uma sequência aleatória longa (por exemplo, a saída de `openssl rand -hex 32`). Sem ela, a Rodada não funciona em produção.
- Os demais ajustes ficam no padrão do Next.js.
