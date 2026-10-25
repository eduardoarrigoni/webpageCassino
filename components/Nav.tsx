'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/rodada', label: 'Rodada', newTab: true },
  { href: '/modelo', label: 'Modelo e matemática' },
  { href: '/experimentos/1', label: 'Experimentos' },
];

export function Nav() {
  const path = usePathname();
  const active = (href: string) =>
    href === '/' ? path === '/' : path.startsWith(href.startsWith('/experimentos') ? '/experimentos' : href);
  return (
    <nav className="nav" aria-label="Seções">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l.href) ? 'page' : undefined}
          {...(l.newTab ? { target: '_blank', rel: 'noopener', title: 'Abre em nova aba' } : {})}
        >
          {l.label}
          {l.newTab && <span aria-hidden="true"> ↗</span>}
        </Link>
      ))}
    </nav>
  );
}
