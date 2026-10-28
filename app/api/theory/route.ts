import type { NextRequest } from 'next/server';
import {
  PAYTABLES,
  REEL,
  STOP_PROBABILITY,
  centerSymbolDistribution,
  exact,
  prizeFor,
  profitFor,
  sampleSpace,
  theoryFor,
  tripleProbability,
  windowAt,
  type Stop,
} from '@/core';
import { HttpError, handle } from '@/lib/server/http';
import { TheoryQuerySchema } from '@/lib/server/schemas';

export function GET(req: NextRequest) {
  return handle(() => {
    const parsed = TheoryQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    const id = parsed.data.table ?? 'base';
    const table = PAYTABLES[id];
    return Response.json({
      ...theoryFor(id),
      stopProbability: exact(STOP_PROBABILITY),
      /** Janela exibida para cada parada K. */
      windows: REEL.map((_, k) => ({ stop: k, column: windowAt(k as Stop) })),
      centerDistribution: [...centerSymbolDistribution()].map(([symbol, p]) => ({ symbol, probability: exact(p) })),
      /** Os 125 resultados centrais, com P, X e probabilidade. */
      sampleSpace: sampleSpace().map((t) => {
        const prize = prizeFor(t, table);
        return { triple: t, prize, profit: profitFor(prize), probability: exact(tripleProbability(t)) };
      }),
    });
  });
}
