import { handle, parseBody } from '@/lib/server/http';
import { SpinSchema } from '@/lib/server/schemas';
import { spinSession } from '@/lib/server/sessions';

/** Joga rodadas na sessão do token e devolve os resultados com o token atualizado. */
export function POST(req: Request) {
  return handle(async () => {
    const { token, count, bet } = await parseBody(req, SpinSchema);
    return Response.json(spinSession(token, count ?? 1, bet));
  });
}
