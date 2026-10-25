import Link from 'next/link';
import { notFound } from 'next/navigation';
import { E1 } from '@/components/experiments/E1';
import { E2 } from '@/components/experiments/E2';
import { E3 } from '@/components/experiments/E3';
import { E4 } from '@/components/experiments/E4';
import { E5 } from '@/components/experiments/E5';

const VIEWS = { 1: E1, 2: E2, 3: E3, 4: E4, 5: E5 } as const;

export function generateStaticParams() {
  return [1, 2, 3, 4, 5].map((n) => ({ n: String(n) }));
}

export default async function ExperimentPage({ params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  if (!(n in VIEWS)) notFound();
  const View = VIEWS[n as keyof typeof VIEWS];
  return (
    <>
      <nav className="tabs" aria-label="Experimentos">
        {[1, 2, 3, 4, 5].map((i) => (
          <Link key={i} href={`/experimentos/${i}`} aria-current={i === n ? 'page' : undefined}>
            Experimento {i}
          </Link>
        ))}
      </nav>
      <View />
    </>
  );
}
