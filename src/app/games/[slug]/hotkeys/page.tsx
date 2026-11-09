import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { HotkeyBoard } from '@/components/wiki/hotkey-board';
import { gamesWithGuides, guidesOf } from '@/lib/wiki/guides';
import { db } from '@/server/db';
import { getGame } from '@/server/wiki/queries';

type Params = Promise<{ slug: string }>;

/** Built up front, one page per game with guides; redeploy to refresh. */
export const generateStaticParams = () =>
  gamesWithGuides().map((slug) => ({ slug }));

export const generateMetadata = async ({
  params,
}: {
  params: Params;
}): Promise<Metadata> => {
  const { slug } = await params;
  const g = await getGame(db, slug);
  return {
    title: g
      ? `Teclas rápidas · ${g.name} — Frikiparty`
      : 'Teclas rápidas — Frikiparty',
  };
};

/**
 * Every shortcut on one sheet. Wider than the other wiki pages so that on
 * a desktop screen all the groups fit side by side; on a phone, a row of
 * group links on top and one group under another.
 */
const HotkeysPage = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const guides = guidesOf(slug);
  const g = await getGame(db, slug);
  if (!guides || !g) notFound();
  return (
    <SiteShell>
      <main>
        <section className="mx-auto flex w-full max-w-[100rem] flex-col gap-5 px-4 py-8 sm:px-6">
          <header className="flex flex-col items-center gap-3 text-center xl:flex-row xl:items-end xl:justify-between xl:text-left">
            <div className="flex flex-col gap-1">
              <Link
                className="font-bold font-mono text-(--gold) text-xs uppercase tracking-5xl transition-colors hover:text-(--gold-hi)"
                href={`/games/${slug}/guide#keys`}
              >
                {g.name} · Empieza aquí
              </Link>
              <h2 className="d-display font-bold text-3xl uppercase sm:text-4xl">
                Teclas rápidas
              </h2>
            </div>
            <p className="flex items-center gap-2 text-(--faded) text-sm">
              <span className="size-1.5 shrink-0 rounded-full bg-(--gold) shadow-[0_0_6px_rgba(201,165,87,0.7)]" />
              Las imprescindibles: si solo aprendes unas pocas, que sean estas.
            </p>
          </header>
          {/* Phones: jump to a group instead of scrolling the whole sheet. */}
          <nav className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
            {guides.hotkeys.map((group) => (
              <a
                className="shrink-0 rounded-full border border-(--hair-gold) px-3 py-1 font-mono text-(--gold) text-2xs uppercase tracking-2xl"
                href={`#${group.id}`}
                key={group.id}
              >
                {group.title}
              </a>
            ))}
          </nav>
          <HotkeyBoard groups={guides.hotkeys} />
          <p className="text-center text-(--faded) text-xs">
            Sacadas de los ficheros del juego (10.0). Las teclas de los botones
            de cada facción, como las habilidades de los héroes, salen en sus{' '}
            <Link
              className="underline hover:text-(--gold-hi)"
              href={`/games/${slug}`}
            >
              fichas de facción
            </Link>
            .
          </p>
        </section>
      </main>
    </SiteShell>
  );
};

export default HotkeysPage;
