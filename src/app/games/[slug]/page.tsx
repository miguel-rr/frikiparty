import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  btn,
  panel,
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { FactionEmblem } from '@/components/wiki/faction-emblem';
import { Prose } from '@/components/wiki/prose';
import { db } from '@/server/db';
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

/** A game: its versions (newest first, with the editions that played them), its factions and maps. */
const GamePage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const g = await getGame(db, slug);
  if (!g) notFound();
  const latest = g.versions[0];
  const core = g.factions.filter((f) => f.kind === 'core');
  const alternates = g.factions.filter((f) => f.kind === 'alternate');
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

          <div className="flex flex-col gap-4">
            <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
              Facciones
            </h3>
            <FactionGrid
              factions={core}
              slug={slug}
              version={latest?.version}
            />
            {alternates.length > 0 ? (
              <>
                <span className={tag}>
                  Facciones alternativas · ligadas a mapas concretos
                </span>
                <FactionGrid
                  factions={alternates}
                  slug={slug}
                  version={latest?.version}
                />
              </>
            ) : null}
          </div>

          {g.maps.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
                Mapas
              </h3>
              <ul className="flex flex-wrap gap-2">
                {g.maps.map((m) => (
                  <li
                    className={`${panel} px-3 py-2 text-sm`}
                    key={m.id}
                    title={m.description ?? undefined}
                  >
                    <span className="text-(--parchment)">{m.name}</span>
                    {m.players ? (
                      <span className="ml-2 font-mono text-(--faded) text-2xs">
                        {m.players} jug.
                      </span>
                    ) : null}
                    {m.introducedVersion ? (
                      <span className="ml-2 font-mono text-(--gold) text-2xs">
                        desde {m.introducedVersion}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      </main>
    </SiteShell>
  );
};

const FactionGrid = ({
  factions,
  slug,
  version,
}: {
  factions: {
    id: string;
    name: string;
    code: string | null;
    introducedVersion: string;
    removedVersion: string | null;
  }[];
  slug: string;
  version: string | undefined;
}) => (
  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {factions.map((f) => {
      const body = (
        <>
          <FactionEmblem className="text-(--gold)" code={f.code} size={44} />
          <span className="d-display font-bold text-(--parchment) text-base uppercase">
            {f.name}
          </span>
          <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
            desde {f.introducedVersion}
            {f.removedVersion ? ` · hasta ${f.removedVersion}` : ''}
          </span>
        </>
      );
      const cls = `${panel} flex h-full flex-col items-center gap-2 p-4 text-center transition-colors hover:border-(--gold)`;
      return (
        <li key={f.id}>
          {version && f.code ? (
            <Link className={cls} href={`/games/${slug}/${version}/${f.code}`}>
              {body}
            </Link>
          ) : (
            <div className={cls}>{body}</div>
          )}
        </li>
      );
    })}
  </ul>
);

export default GamePage;
