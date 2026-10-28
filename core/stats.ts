/** Estatística descritiva usada nos experimentos. */

export function sum(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new RangeError('Média de amostra vazia');
  return sum(xs) / xs.length;
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) throw new RangeError('Mediana de amostra vazia');
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** Desvio-padrão amostral, com divisor N − 1. */
export function sampleStdDev(xs: readonly number[]): number {
  if (xs.length < 2) throw new RangeError('Desvio-padrão amostral exige ao menos 2 valores');
  const m = mean(xs);
  let ss = 0;
  for (const x of xs) ss += (x - m) ** 2;
  return Math.sqrt(ss / (xs.length - 1));
}

/** Média acumulada após cada observação: (x1 + ... + xk) / k. */
export function cumulativeMeans(xs: readonly number[]): number[] {
  const out: number[] = [];
  let s = 0;
  xs.forEach((x, i) => {
    s += x;
    out.push(s / (i + 1));
  });
  return out;
}

/** Contagem por valor, na ordem das chaves fornecidas (valores ausentes contam 0). */
export function countBy<K>(xs: readonly K[], keys: readonly K[]): Map<K, number> {
  const counts = new Map<K, number>(keys.map((k) => [k, 0]));
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  return counts;
}

/** Proporção com denominador explícito; null quando o denominador é zero (não estimável). */
export function proportion(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

/**
 * Índices 1..n espaçados em escala logarítmica (mais os 30 primeiros e os pontos extras),
 * para desenhar trajetórias longas com poucos pontos.
 */
export function logSpacedIndices(n: number, extra: readonly number[] = [], points = 400): number[] {
  const idx = new Set<number>(extra);
  for (let i = 0; i < points; i++) idx.add(Math.round(Math.exp((Math.log(n) * i) / (points - 1))));
  for (let i = 1; i <= Math.min(n, 30); i++) idx.add(i);
  return [...idx].filter((i) => i >= 1 && i <= n).sort((a, b) => a - b);
}
