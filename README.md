# Webpage Cassino: interface

Parte do Trabalho I de Probabilidade e Estatística I. Simulador acadêmico com créditos fictícios.

Esta é a interface (Next.js): a página inicial, a Rodada (jogo "Bioma da Sorte"), Modelo e matemática, e os cinco experimentos. As regras e os sorteios rodam na API, que fica em outro repositório: https://github.com/eduardoarrigoni/apiCassino

## Requisitos

- **Node.js 20** (20.9 ou mais recente). Para conferir: `node -v`.
- **pnpm 9**: `corepack enable`. Se der erro de permissão, use `sudo corepack enable` ou `npm install -g pnpm@9.15.9`.
- A **API rodando**, na porta 3001 (veja o README do apiCassino).

## Como rodar

Com a API já rodando em outro terminal:

```bash
pnpm install
pnpm dev
```

Depois, abra **http://localhost:3000**. A interface espera a API responder antes de abrir.

A interface encaminha as chamadas `/api/*` para a API. Por padrão o endereço é `http://localhost:3001`; para usar outro, defina a variável `API_URL`:

```bash
API_URL=https://minha-api.onrender.com pnpm dev
```

## Publicação (Vercel)

- Defina a variável de ambiente `API_URL` com o endereço da API publicada **antes do build**, porque o encaminhamento é configurado na compilação.
- Comandos padrão do Next: build `pnpm build`, saída `.next`.

## Sons

Ficam em `public/sounds/`. Os de giro e de prêmio são gerados por `pnpm sounds` (`scripts/gen-sounds.mjs`).
