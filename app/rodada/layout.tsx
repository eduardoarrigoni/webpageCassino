import '@fontsource-variable/inter';
import '@fontsource/press-start-2p';
import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Bioma da Sorte',
  description: 'Jogo de três rolos com créditos fictícios.',
};

/** Fontes auto-hospedadas (@fontsource): não dependem de download do Google no build nem no dev. */
const fonts = {
  '--font-inter': "'Inter Variable'",
  '--font-pixel': "'Press Start 2P'",
} as CSSProperties;

export default function RodadaLayout({ children }: { children: ReactNode }) {
  return <div style={fonts}>{children}</div>;
}
