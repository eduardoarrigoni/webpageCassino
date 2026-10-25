'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Sons do jogo, servidos de /public/sounds. Se um arquivo não existir, o jogo segue em silêncio.
 * - girando:    enquanto os rolos giram
 * - premio:     ao formar um trio
 * - sem-premio: ao terminar sem prêmio
 * - ambiente:   música em loop o tempo todo (por baixo dos efeitos)
 */
const FILES = {
  girando: '/sounds/girando.wav', // gerado por scripts/gen-sounds.mjs
  premio: '/sounds/premio.wav', // gerado por scripts/gen-sounds.mjs
  semPremio: '/sounds/sem-premio.ogg',
  ambiente: '/sounds/ambiente.mp3',
} as const;

type Effect = 'girando' | 'premio' | 'semPremio';

export function useSounds(enabled: boolean, spinning: boolean) {
  const audio = useRef<Record<keyof typeof FILES, HTMLAudioElement> | null>(null);
  const unlocked = useRef(false);

  useEffect(() => {
    const a = Object.fromEntries(
      Object.entries(FILES).map(([k, src]) => {
        const el = new Audio(src);
        el.preload = 'auto';
        return [k, el];
      }),
    ) as Record<keyof typeof FILES, HTMLAudioElement>;
    a.ambiente.loop = true;
    a.ambiente.volume = 0.35;
    a.girando.loop = true;
    a.girando.volume = 0.45;
    audio.current = a;
    return () => Object.values(a).forEach((el) => el.pause());
  }, []);

  const play = (el: HTMLAudioElement | undefined, restart = true) => {
    if (!el) return;
    if (restart) el.currentTime = 0;
    el.play().catch(() => undefined); // arquivo ausente ou autoplay bloqueado: segue sem som
  };

  // Música ambiente: toca o tempo todo, por baixo dos efeitos; só para com o som desligado.
  // O navegador só libera áudio depois de uma interação do usuário.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const sync = () => {
      if (enabled && unlocked.current) play(a.ambiente, false);
      else a.ambiente.pause();
    };
    sync();
    if (unlocked.current) return;
    const unlock = () => {
      unlocked.current = true;
      sync();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [enabled]);

  // Som de giro em loop enquanto gira.
  useEffect(() => {
    const el = audio.current?.girando;
    if (!el) return;
    if (enabled && spinning) play(el);
    else el.pause();
  }, [enabled, spinning]);

  const effect = useCallback(
    (name: Effect) => {
      if (enabled) play(audio.current?.[name]);
    },
    [enabled],
  );

  return { effect };
}
