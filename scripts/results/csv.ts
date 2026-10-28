/** CSV simples: separador vírgula, ponto decimal, UTF-8, cabeçalho na primeira linha. */

export type Cell = string | number | boolean | null;

function cell(v: Cell): string {
  if (v === null) return '';
  const s = typeof v === 'boolean' ? (v ? 'sim' : 'nao') : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
