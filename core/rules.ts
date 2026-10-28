/**
 * Regras públicas da máquina didática (seção 5 do enunciado).
 * Tudo o que define o jogo está neste arquivo; o resto do código só aplica estas regras.
 */

export const DISCLAIMER = 'Simulador acadêmico - somente créditos fictícios';

/** Os cinco símbolos. */
export const SYMBOLS = ['A', 'B', 'C', 'D', 'E'] as const;
export type Sym = (typeof SYMBOLS)[number];

/** Sequência circular R = (A, B, C, D, E), igual para os três rolos. Posições 0 a 4. */
export const REEL: readonly Sym[] = SYMBOLS;
export const REEL_LENGTH = REEL.length;

export const REEL_COUNT = 3;
export const ROW_COUNT = 3;

/** Aposta fixa por rodada, em créditos fictícios. */
export const BET = 1;

/**
 * Prêmio pago por crédito apostado quando a linha central tem três símbolos iguais:
 * P = tabela[símbolo] × aposta. Com a aposta de 1 crédito do enunciado, P = tabela[símbolo].
 */
export type PayTable = Readonly<Record<Sym, number>>;

export const PAYTABLES = {
  base: { A: 5, B: 10, C: 15, D: 25, E: 50 },
  plus10: { A: 5.5, B: 11, C: 16.5, D: 27.5, E: 55 },
  /** Jogo "Bioma Arcade" (tela Rodada): multiplicadores sobre a aposta escolhida. */
  arcade: { A: 4, B: 6, C: 10, D: 15, E: 20 },
} as const satisfies Record<string, PayTable>;

export type PayTableId = keyof typeof PAYTABLES;

export const PAYTABLE_LABELS: Record<PayTableId, string> = {
  base: 'Base',
  plus10: 'Prêmios +10%',
  arcade: 'Bioma Arcade (multiplicadores)',
};

/**
 * Configuração da tela Rodada ("Bioma Arcade"). Os experimentos seguem o enunciado
 * (aposta fixa de 1 crédito, tabela base); esta tela permite escolher a aposta.
 */
export const ARCADE = {
  table: 'arcade' as PayTableId,
  initialBalance: 1000,
  bets: [1, 2, 5, 10, 20, 50, 100] as const,
  defaultBet: 10,
};
