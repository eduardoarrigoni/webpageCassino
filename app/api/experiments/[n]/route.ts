import * as experiments from '@/lib/server/experiments';
import { HttpError, handle, parseBody } from '@/lib/server/http';
import { E1Schema, E2Schema, E3Schema, E4Schema, E5Schema } from '@/lib/server/schemas';

/** Executa o experimento com parâmetros livres; campos omitidos assumem o valor oficial. */
export function POST(req: Request, { params }: RouteContext<'/api/experiments/[n]'>) {
  return handle(async () => {
    const { n } = await params;
    switch (n) {
      case '1':
        return Response.json(experiments.e1(await parseBody(req, E1Schema)));
      case '2':
        return Response.json(experiments.e2(await parseBody(req, E2Schema)));
      case '3':
        return Response.json(experiments.e3(await parseBody(req, E3Schema)));
      case '4':
        return Response.json(experiments.e4(await parseBody(req, E4Schema)));
      case '5':
        return Response.json(experiments.e5(await parseBody(req, E5Schema)));
      default:
        throw new HttpError(404, 'Experimento deve ser 1, 2, 3, 4 ou 5');
    }
  });
}
