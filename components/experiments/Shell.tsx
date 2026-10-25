'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Checks, ErrorBox, OfficialBadge, type CheckItem } from '@/components/ui';
import { api } from '@/lib/api';
import type { Envelope, ExperimentId, ParamsById } from '@/lib/types';

/** Campo do formulário de parâmetros. */
export interface FieldSpec {
  key: string;
  label: string;
  kind: 'int' | 'number' | 'intList' | 'table' | 'tableList';
  help?: string;
}

const TABLE_OPTIONS = [
  { id: 'base', label: 'Base' },
  { id: 'plus10', label: 'Prêmios +10%' },
];

function toForm(params: object, fields: FieldSpec[]): Record<string, string> {
  const p = params as Record<string, unknown>;
  return Object.fromEntries(
    fields.map((f) => [f.key, Array.isArray(p[f.key]) ? (p[f.key] as unknown[]).join(', ') : String(p[f.key] ?? '')]),
  );
}

function fromForm(form: Record<string, string>, fields: FieldSpec[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = (form[f.key] ?? '').trim();
    if (raw === '') continue;
    if (f.kind === 'int' || f.kind === 'number') out[f.key] = Number(raw.replace(',', '.'));
    else if (f.kind === 'intList') out[f.key] = raw.split(/[\s,;]+/).filter(Boolean).map(Number);
    else if (f.kind === 'tableList') out[f.key] = raw.split(/[\s,;]+/).filter(Boolean);
    else out[f.key] = raw;
  }
  return out;
}

export function useExperiment<N extends ExperimentId>(n: N) {
  const [data, setData] = useState<Envelope<N> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (params?: Partial<ParamsById[N]>) => {
      setLoading(true);
      setError(null);
      try {
        setData(params ? await api.run(n, params) : await api.official(n));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [n],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, load };
}

export function Shell<N extends ExperimentId>({
  n,
  question,
  concepts,
  procedure,
  fields,
  children,
}: {
  n: N;
  question: string;
  concepts: string;
  procedure: ReactNode;
  fields: FieldSpec[];
  children: (data: Envelope<N>) => ReactNode;
}) {
  const { data, loading, error, load } = useExperiment(n);
  const [form, setForm] = useState<Record<string, string>>({});

  // O formulário sempre reflete os parâmetros do resultado exibido.
  useEffect(() => {
    if (data) setForm(toForm(data.params, fields));
  }, [data, fields]);

  function submit(ev: FormEvent) {
    ev.preventDefault();
    void load(fromForm(form, fields) as Partial<ParamsById[N]>);
  }

  const checks = (data?.result as { checks?: CheckItem[] } | undefined)?.checks ?? [];

  return (
    <>
      <h1>
        Experimento {n}. {question}
      </h1>
      <p className="muted">Conceitos em ação: {concepts}</p>

      <section className="card">
        <h2>Procedimento</h2>
        {procedure}
        <form className="params" onSubmit={submit} style={{ marginTop: 16 }} aria-label="Parâmetros do experimento">
          {fields.map((f) => (
            <label key={f.key} className="field">
              <span className="field-label">{f.label}</span>
              {f.kind === 'table' ? (
                <select value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  {TABLE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form[f.key] ?? ''}
                  inputMode={f.kind === 'number' ? 'decimal' : 'numeric'}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  aria-describedby={f.help ? `${f.key}-help` : undefined}
                />
              )}
              {/* A linha de ajuda existe em todos os campos, para os inputs ficarem alinhados. */}
              <span id={`${f.key}-help`} className="field-help">
                {f.help ?? ''}
              </span>
            </label>
          ))}
          <div className="actions form-actions">
            <button type="submit" className="primary" disabled={loading}>
              Executar
            </button>
            <button type="button" onClick={() => void load()} disabled={loading}>
              Restaurar oficiais
            </button>
          </div>
        </form>
        <div style={{ marginTop: 14 }} aria-live="polite">
          {loading ? <span className="muted small">Executando…</span> : data && <OfficialBadge official={data.official} />}
        </div>
      </section>

      <ErrorBox error={error} />

      {data && (
        <div className="stack" style={{ opacity: loading ? 0.5 : 1 }}>
          {children(data)}
          <section className="card">
            <h2>Conferências</h2>
            <Checks checks={checks} />
          </section>
        </div>
      )}
    </>
  );
}
