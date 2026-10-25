'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { short } from '@/lib/format';
import type { Meta, PayTableId } from '@/lib/types';

/** Tabelas de pagamentos lidas da API (fonte única das regras). */
export function PaytableTable({ ids = ['base', 'plus10'] }: { ids?: PayTableId[] }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    api.meta().then(setMeta, () => undefined);
  }, []);
  if (!meta) return null;
  const symbols = meta.rules.reel;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tabela</th>
            {symbols.map((s) => (
              <th key={s} className="num">
                {s}–{s}–{s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => (
            <tr key={id}>
              <td>{meta.rules.paytableLabels[id]}</td>
              {symbols.map((s) => (
                <td key={s} className="num">
                  {short(meta.rules.paytables[id][s])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
