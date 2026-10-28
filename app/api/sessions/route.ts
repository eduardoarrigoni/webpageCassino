import { handle, parseBody } from '@/lib/server/http';
import { CreateSessionSchema } from '@/lib/server/schemas';
import { createSession } from '@/lib/server/sessions';

/** Cria uma sessão da Rodada. Sem semente, o servidor sorteia uma e a informa. */
export function POST(req: Request) {
  return handle(async () => Response.json(createSession(await parseBody(req, CreateSessionSchema)), { status: 201 }));
}
