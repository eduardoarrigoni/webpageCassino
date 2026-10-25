import type { ReactNode } from 'react';

export function Stat({ label, value, reference }: { label: string; value: ReactNode; reference?: ReactNode }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {reference !== undefined && <div className="ref">{reference}</div>}
    </div>
  );
}

export function OfficialBadge({ official }: { official: boolean }) {
  return official ? (
    <span className="badge official">✓ Execução oficial (parâmetros do enunciado)</span>
  ) : (
    <span className="badge custom">⚠ Parâmetros livres: não é o resultado oficial</span>
  );
}

export interface CheckItem {
  description: string;
  expected: number | string;
  observed: number | string;
  ok: boolean;
}

export function Checks({ checks }: { checks: readonly CheckItem[] }) {
  return (
    <ul className="checks">
      {checks.map((c) => (
        <li key={c.description} className={c.ok ? 'ok' : 'fail'}>
          <span className="mark">{c.ok ? '✓ OK' : '✗ FALHA'}</span>
          <span>
            {c.description}: esperado <strong>{String(c.expected)}</strong>, observado <strong>{String(c.observed)}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}

export function Card({ title, children, id }: { title?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="card" id={id}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
