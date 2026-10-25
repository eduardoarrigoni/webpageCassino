// Gera os efeitos sonoros do jogo (WAV, 16 bits, mono) em public/sounds.
// Uso: pnpm --filter @maquina/web sounds   (ou node scripts/gen-sounds.mjs em apps/web)
//
// - girando.wav: rolo de madeira em loop (0,6 s, emenda sem corte)
// - premio.wav:  "conquista" com whoosh, carrilhão de sinos e acorde final (~2 s)

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds');

const square = (t, f, duty = 0.5) => ((t * f) % 1 < duty ? 1 : -1);
const triangle = (t, f) => 4 * Math.abs(((t * f) % 1) - 0.5) - 1;

/** Ruído determinístico (mesmo arquivo a cada geração). */
let seed = 1234567;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function render(seconds, fn) {
  const n = Math.round(seconds * RATE);
  return Array.from({ length: n }, (_, i) => fn(i / RATE));
}

// ---------- girando: rolo de madeira ----------
// 6 tiques em 0,6 s (10 por segundo), suaves e arredondados como um woodblock: seno com leve
// queda de tom e decaimento rápido, mais um toque de ruído bem baixo no ataque.
// Por baixo, um ronco grave de engrenagem (senos de 50 e 100 Hz com pulsação lenta).
// Todas as frequências fecham ciclos inteiros em 0,6 s, então o loop emenda sem corte.
const TICKS = 6;
const LOOP = 0.6;
const WOOD = [620, 540, 590, 520, 600, 550];
const girando = render(LOOP, (t) => {
  const k = Math.floor((t / LOOP) * TICKS);
  const local = t - (k * LOOP) / TICKS; // tempo desde o tique atual
  const f = WOOD[k] * (1 - 0.18 * Math.min(1, local / 0.02)); // tom cai um pouco no início
  const attack = Math.min(1, local / 0.0015);
  const tok = Math.sin(2 * Math.PI * f * local) * attack * Math.exp(-local * 55);
  const overtone = Math.sin(2 * Math.PI * f * 2.7 * local) * attack * Math.exp(-local * 120) * 0.25;
  const grit = local < 0.003 ? noise() * 0.15 * (1 - local / 0.003) : 0;
  const pulse = 0.75 + 0.25 * Math.cos((2 * Math.PI * TICKS * t) / LOOP);
  const rumble = (Math.sin(2 * Math.PI * 50 * t) * 0.6 + Math.sin(2 * Math.PI * 100 * t) * 0.4) * 0.05 * pulse;
  return 0.28 * (tok + overtone + grit) + rumble;
});

// ---------- prêmio: "conquista" com sinos ----------
// Inspirado na sensação de conquista desbloqueada (sem reaproveitar áudio de terceiros):
// 1) whoosh suave de entrada (ruído filtrado que cresce e some), como uma notificação deslizando;
// 2) carrilhão de sinos subindo em Dó maior (G5 C6 E6 G6);
// 3) acorde final C6+E6+G6+C7 soando por ~1,3 s, com cintilação aguda.
// Timbre de sino: parciais levemente inarmônicas, as mais agudas somem mais rápido.
const PARTIALS = [
  [1, 1.0, 2.2],
  [2.0, 0.42, 3.5],
  [3.01, 0.22, 5.5],
  [4.2, 0.12, 8],
  [5.43, 0.07, 12],
];
const bell = (local, f, decay = 1) => {
  if (local < 0) return 0;
  const attack = Math.min(1, local / 0.004);
  let v = 0;
  for (const [ratio, amp, d] of PARTIALS) v += Math.sin(2 * Math.PI * f * ratio * local) * amp * Math.exp(-local * d * decay);
  return v * attack;
};

const ARP = [
  [0.14, 783.99],
  [0.26, 1046.5],
  [0.38, 1318.51],
  [0.5, 1567.98],
];
const CHORD_AT = 0.66;
const CHORD = [1046.5, 1318.51, 1567.98, 2093.0];
const DUR = 2.1;

// cintilações: pequenos "plins" agudos em instantes fixos (determinístico)
const SPARKS = [
  [0.78, 3136],
  [0.9, 3951],
  [1.02, 3520],
  [1.16, 4186],
  [1.3, 3729],
];

let lp = 0; // filtro passa-baixa simples para o whoosh
const premioRaw = render(DUR, (t) => {
  // 1) whoosh: ruído filtrado, cresce até 0,16 s e some até 0,4 s
  const wEnv = t < 0.16 ? t / 0.16 : Math.max(0, 1 - (t - 0.16) / 0.24);
  const cutoff = 0.04 + 0.25 * Math.min(1, t / 0.2); // abre o filtro enquanto cresce
  lp += cutoff * (noise() - lp);
  let v = lp * wEnv * 0.5;

  // 2) carrilhão
  for (const [at, f] of ARP) v += bell(t - at, f, 1.4) * 0.32;

  // 3) acorde final sustentado
  for (const f of CHORD) v += bell(t - CHORD_AT, f, 0.55) * 0.2;

  // cintilação
  for (const [at, f] of SPARKS) v += Math.sin(2 * Math.PI * f * (t - at)) * (t >= at ? Math.exp(-(t - at) * 30) : 0) * 0.06;

  return v * Math.min(1, (DUR - t) / 0.15); // final suave
});
const peak = Math.max(...premioRaw.map(Math.abs));
const premio = premioRaw.map((v) => (v / peak) * 0.7); // normaliza o pico em 70%

writeFileSync(join(OUT, 'girando.wav'), wav(girando));
writeFileSync(join(OUT, 'premio.wav'), wav(premio));
console.log(`Gerados em ${OUT}: girando.wav (${LOOP} s, loop), premio.wav (${DUR} s)`);
