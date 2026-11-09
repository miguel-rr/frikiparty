import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GameFiles } from '@/components/games/game-files';
import { SiteShell } from '@/components/layout/site-shell';
import {
  btn,
  panel,
  panelGold,
  Section,
  SectionHeader,
} from '@/components/theme/primitives';
import { FactionBanners } from '@/components/wiki/faction-banners';
import { Prose } from '@/components/wiki/prose';
import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';
import { listGameFiles } from '@/server/games/files';
import { resolveArchiveAccess } from '@/server/media/access';
import { getGame } from '@/server/wiki/queries';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> => {
  const { slug } = await params;
  const g = await getGame(db, slug);
  return { title: g ? `${g.name} — Frikiparty` : 'Juego — Frikiparty' };
};

/** A game: its versions (newest first, with the editions that played them), its factions, maps and, for members, its files. */
const GamePage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const g = await getGame(db, slug);
  if (!g) notFound();
  const latest = g.versions[0];
  const session = await getSession();
  const access = await resolveArchiveAccess(db, session?.user);
  // The files are for members only, like the archive; the page itself stays public.
  const files =
    session && access.allowed ? await listGameFiles(db, g.id) : null;
  return (
    <SiteShell>
      <main>
        <Section id="game">
          <SectionHeader
            eyebrowHref="/games"
            eyebrowText="Los juegos"
            title={g.name}
          />
          <Prose className="mx-auto max-w-[68ch]" text={g.description} />
          {g.websiteUrl ? (
            <div className="flex justify-center">
              <a
                className={btn.outline}
                href={g.websiteUrl}
                rel="noreferrer"
                target="_blank"
              >
                Página del mod
              </a>
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
              Facciones
            </h3>
            <FactionBanners
              factions={g.factions}
              slug={slug}
              version={latest?.version}
            />
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
              Versiones
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.versions.map((v) => (
                <li key={v.id}>
                  <Link
                    className={`${v.id === latest?.id ? panelGold : panel} flex h-full flex-col gap-2 p-4 transition-colors hover:border-(--gold)`}
                    href={`/games/${slug}/${v.version}`}
                  >
                    <span className="d-display font-bold text-(--gold-hi) text-2xl">
                      {v.version}
                    </span>
                    <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                      {v.releasedAt
                        ? new Date(v.releasedAt).toLocaleDateString('es-ES', {
                            dateStyle: 'long',
                          })
                        : 'Fecha por confirmar'}
                    </span>
                    <span className="text-(--faded) text-sm">
                      {v.factionCount} facciones
                      {v.editions.length > 0
                        ? ` · jugada en ${v.editions.join(', ')}`
                        : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {g.editionsWithoutVersion.length > 0 ? (
              <p className="text-(--faded) text-xs">
                Ediciones sin versión registrada:{' '}
                {g.editionsWithoutVersion.join(', ')}.
              </p>
            ) : null}
          </div>

          {session && files ? (
            <GameFiles
              canModerate={access.canModerate}
              defaultVersionId={latest?.id ?? null}
              files={files}
              gameId={g.id}
              maps={g.maps.map((m) => ({ id: m.id, name: m.name }))}
              slug={slug}
              versions={g.versions.map((v) => ({ id: v.id, name: v.version }))}
              viewerId={session.user.id}
            />
          ) : null}
        </Section>
      </main>
    </SiteShell>
  );
};

export default GamePage;
