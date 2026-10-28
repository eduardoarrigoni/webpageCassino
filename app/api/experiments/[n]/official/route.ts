import { EXPERIMENT_IDS, official, type ExperimentId } from '@/lib/server/experiments';

/** Os cinco resultados oficiais são determinísticos: gerados no build, como respostas estáticas. */
export function generateStaticParams() {
  return EXPERIMENT_IDS.map((n) => ({ n: String(n) }));
}

/** Fora de 1–5: 404. */
export const dynamicParams = false;

export async function GET(_req: Request, { params }: RouteContext<'/api/experiments/[n]/official'>) {
  const id = Number((await params).n) as ExperimentId;
  if (!EXPERIMENT_IDS.includes(id)) {
    return Response.json({ statusCode: 404, message: 'Experimento deve ser 1, 2, 3, 4 ou 5' }, { status: 404 });
  }
  return Response.json(official(id));
}
