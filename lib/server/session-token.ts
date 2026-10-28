import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { PayTableId } from '@/core';
import { HttpError } from './http';

/**
 * Sessão da Rodada sem memória no servidor: todo o estado viaja num token assinado
 * (HMAC-SHA256). O cliente guarda e reenvia o token, mas não consegue alterá-lo:
 * qualquer mudança invalida a assinatura. O sorteio continua sendo feito no servidor.
 *
 * Limitação conhecida: reenviar um token antigo "desfaz" rodadas (aceitável com créditos fictícios).
 */
export interface SessionPayload {
  v: 1;
  seed: number;
  seedSource: 'usuário' | 'servidor';
  table: PayTableId;
  /** Aposta padrão da sessão (a menor permitida). */
  bet: number;
  initialBalance: number;
  balance: number;
  played: number;
  wins: number;
  totalPrize: number;
  totalBet: number;
  /** Estado do gerador (xoroshiro128plus), para continuar a sequência. */
  rng: [number, number, number, number];
}

let devSecret: string | null = null;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(500, 'SESSION_SECRET não configurada no servidor');
  }
  // Em desenvolvimento, uma chave por processo: sessões antigas deixam de valer ao reiniciar.
  devSecret ??= randomBytes(32).toString('hex');
  return devSecret;
}

const b64 = (buf: Buffer) => buf.toString('base64url');
const sign = (data: string) => createHmac('sha256', secret()).update(data).digest();

export function encodeSession(p: SessionPayload): string {
  const data = b64(Buffer.from(JSON.stringify(p)));
  return `${data}.${b64(sign(data))}`;
}

export function decodeSession(token: string): SessionPayload {
  const [data, sig] = token.split('.');
  const invalid = new HttpError(401, 'Sessão inválida ou expirada. Inicie uma nova sessão.');
  if (!data || !sig) throw invalid;
  const given = Buffer.from(sig, 'base64url');
  const expected = sign(data);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw invalid;
  const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
  if (p.v !== 1) throw invalid;
  return p;
}
