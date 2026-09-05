import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteShell } from '@/components/layout/site-shell';
import {
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { Prose } from '@/components/wiki/prose';
import { db } from '@/server/db';
import { listGames } from '@/server/wiki/queries';

export const metadata: Metadata = { title: 'Los juegos — Frikiparty' };

/** The games we play, each with its versions and factions. Static; refreshed from the admin. */
const GamesPage = async () => {
  const games = await listGames(db);
  return (
    <SiteShell>
      <main>
        <Section id="games">
          <SectionHeader
            eyebrowText="La biblioteca"
            lead="Cada juego que ha pasado por Frikiparty, con sus versiones y cómo eran sus facciones en cada una."
            title="Los juegos"
          />
          <ul className="grid gap-5 sm:grid-cols-2">
            {games.map((g) => (
              <li key={g.id}>
                <Link
                  className={`${panelGold} flex h-full flex-col gap-3 p-6 transition-colors hover:border-(--gold)`}
                  href={`/games/${g.slug}`}
                >
                  <span className={tag}>
                    {g.isOfficial ? 'Torneo oficial' : 'Otros juegos'}
                  </span>
                  <span className="d-display font-bold text-(--parchment) text-2xl uppercase">
                    {g.name}
                  </span>
                  <Prose
                    className="text-sm"
                    text={g.description?.split(/\n\s*\n/)[0] ?? null}
                  />
                  <span className="mt-auto font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                    {g.versions} versión{g.versions === 1 ? '' : 'es'} ·{' '}
                    {g.factions} facción{g.factions === 1 ? '' : 'es'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </SiteShell>
  );
};

export default GamesPage;
