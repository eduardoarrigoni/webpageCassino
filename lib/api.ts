import type { Envelope, ExperimentId, Meta, ParamsById, PayTableId, SessionState, SpinResponse, TheoryResponse } from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Não foi possível falar com a API. Ela está rodando (pnpm api)?');
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join('; ') : body?.message;
    throw new ApiError(res.status, msg ?? `Erro ${res.status}`);
  }
  return body as T;
}

const post = <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const api = {
  meta: () => call<Meta>('/meta'),
  theory: (table: PayTableId) => call<TheoryResponse>(`/theory?table=${table}`),

  createSession: (body: { seed?: number; initialBalance?: number; table?: PayTableId }) => post<SessionState>('/sessions', body),
  spin: (id: string, count: number, bet?: number) => post<SpinResponse>(`/sessions/${id}/spin`, { count, bet }),
  deleteSession: (id: string) => call<void>(`/sessions/${id}`, { method: 'DELETE' }),

  official: <N extends ExperimentId>(n: N) => call<Envelope<N>>(`/experiments/${n}/official`),
  run: <N extends ExperimentId>(n: N, params: Partial<ParamsById[N]>) => post<Envelope<N>>(`/experiments/${n}`, params),
};
