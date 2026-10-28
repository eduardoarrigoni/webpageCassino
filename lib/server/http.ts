import { InsufficientBalanceError } from '@/core';
import type { z } from 'zod';

/** Erro HTTP com a mensagem que vai para o cliente (formato { statusCode, message }). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string | string[],
  ) {
    super(Array.isArray(message) ? message.join('; ') : message);
  }
}

function errorResponse(status: number, message: string | string[]): Response {
  return Response.json({ statusCode: status, message }, { status });
}

/**
 * Executa o handler e converte os erros das regras em respostas HTTP:
 * saldo insuficiente → 409, valor fora das regras (RangeError) → 400.
 */
export async function handle(fn: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    if (err instanceof InsufficientBalanceError) return errorResponse(409, err.message);
    if (err instanceof RangeError) return errorResponse(400, err.message);
    console.error(err);
    return errorResponse(500, 'Erro interno');
  }
}

/** Lê e valida o corpo JSON. Campos desconhecidos são rejeitados (400). */
export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await req.text();
  let raw: unknown = {};
  if (text.trim() !== '') {
    try {
      raw = JSON.parse(text);
    } catch {
      throw new HttpError(400, 'Corpo da requisição não é um JSON válido');
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)),
    );
  }
  return parsed.data;
}
