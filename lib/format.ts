/** Formatação numérica em pt-BR (vírgula decimal, sinal de menos tipográfico). */

const minus = (s: string) => s.replace(/^-/, '−');

export function num(v: number, digits = 2, opts: Intl.NumberFormatOptions = {}): string {
  return minus(v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits, ...opts }));
}

/** Número com até `max` casas, sem zeros à direita. */
export function short(v: number, max = 4): string {
  return minus(v.toLocaleString('pt-BR', { maximumFractionDigits: max }));
}

export function int(v: number): string {
  return minus(v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
}

export function pct(p: number, digits = 2): string {
  return `${num(p * 100, digits)}%`;
}

export function signed(v: number, digits = 2): string {
  return (v > 0 ? '+' : '') + num(v, digits);
}

/** Fração "a/b" com sinal tipográfico. */
export function frac(f: string): string {
  return minus(f);
}

/** "pontos percentuais" de diferença entre duas proporções. */
export function pp(a: number, b: number, digits = 2): string {
  return `${signed((a - b) * 100, digits)} p.p.`;
}

/** Com sinal e até `max` casas, sem zeros à direita (ex.: +14, −1, +4,5). */
export function signedShort(v: number, max = 4): string {
  return (v > 0 ? '+' : '') + short(v, max);
}
