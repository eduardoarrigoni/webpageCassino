'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Meta } from '@/lib/types';

export function GeneratorInfo() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.meta().then(setMeta, (e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="muted small">{error}</p>;
  if (!meta) return <p className="muted small">Carregando informações do gerador…</p>;
  const g = meta.generator;
  return (
    <div className="table-wrap">
      <table>
        <tbody>
          <tr>
            <th scope="row">Gerador</th>
            <td>
              {g.library} {g.version}, algoritmo {g.algorithm}
            </td>
          </tr>
          <tr>
            <th scope="row">Sorteio de K</th>
            <td>{g.distribution}</td>
          </tr>
          <tr>
            <th scope="row">Sementes aceitas</th>
            <td>inteiros de 0 a {g.maxSeed.toLocaleString('pt-BR')}</td>
          </tr>
          <tr>
            <th scope="row">Ambiente da API</th>
            <td>Node.js {meta.runtime.node}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
