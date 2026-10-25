import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav';

/** Moldura das páginas do site (a tela Rodada abre em tela cheia, sem esta moldura). */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="disclaimer" role="note">
        Simulador acadêmico - somente créditos fictícios
      </div>
      <header className="site-header">
        <div className="inner">
          <a className="brand" href="/">
            Máquina didática
            <small>Probabilidade e Estatística I · Trabalho I</small>
          </a>
          <Nav />
        </div>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        Nenhuma aposta real, depósito ou saque. Regras públicas, sementes registradas e resultados reproduzíveis.
      </footer>
    </>
  );
}
