// Espera a API responder antes de iniciar a interface (evita ECONNREFUSED no início do `pnpm dev`).
// Se a API não subir no prazo, segue mesmo assim com um aviso.

const url = `${process.env.API_URL ?? 'http://localhost:3001'}/api/meta`;
const timeoutMs = Number(process.env.WAIT_API_TIMEOUT_MS ?? 60_000);
const started = Date.now();

process.stdout.write(`Aguardando a API em ${url} ...\n`);

while (Date.now() - started < timeoutMs) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      process.stdout.write(`API pronta em ${((Date.now() - started) / 1000).toFixed(1)} s.\n`);
      process.exit(0);
    }
  } catch {
    // API ainda subindo
  }
  await new Promise((r) => setTimeout(r, 300));
}

process.stdout.write(`Aviso: a API não respondeu em ${timeoutMs / 1000} s. Iniciando a interface mesmo assim (rode \`pnpm api\`).\n`);
