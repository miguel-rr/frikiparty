import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  btn,
  panel,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { FactionEmblem } from '@/components/wiki/faction-emblem';
import { Prose } from '@/components/wiki/prose';
import { WikiImage } from '@/components/wiki/wiki-image';
import { db } from '@/server/db';
import { getGameVersionPage } from '@/server/wiki/queries';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string; version: string }>;
}): Promise<Metadata> => {
  const { slug, version } = await params;
  const v = await getGameVersionPage(db, slug, version);
  return {
    title: v
      ? `${v.gameName} ${v.version} — Frikiparty`
      : 'Versión — Frikiparty',
  };
};

/** One version of a game: what changed, which factions it offers (with their summaries), its maps. */
const GameVersionPage = async ({
  params,
}: {
  params: Promise<{ slug: string; version: string }>;
}) => {
  const { slug, version } = await params;
  const v = await getGameVersionPage(db, slug, version);
  if (!v) notFound();
  const core = v.factions.filter((f) => f.kind === 'core');
  const alternates = v.factions.filter((f) => f.kind === 'alternate');
  return (
    <SiteShell>
      <main>
        <Section id="version">
          <SectionHeader
            eyebrowHref={`/games/${slug}`}
            eyebrowText={v.gameName}
            lead={
              v.releasedAt
                ? `Publicada el ${new Date(v.releasedAt).toLocaleDateString('es-ES', { dateStyle: 'long' })}${v.editions.length > 0 ? ` · jugada en ${v.editions.join(', ')}` : ''}`
                : undefined
            }
            title={`Versión ${v.version}`}
          />
          <div className="flex flex-wrap justify-center gap-2">
            {v.allVersions.map((other) => (
              <Link
                className={`${btn.outline} ${other.version === v.version ? 'border-(--gold) text-(--gold-hi)' : ''}`}
                href={`/games/${slug}/${other.version}`}
                key={other.id}
              >
                {other.version}
              </Link>
            ))}
          </div>
          <Prose className="mx-auto max-w-[68ch]" text={v.notes} />
          {v.changelogUrl ? (
            <div className="flex justify-center">
              <a
                className={btn.outline}
                href={v.changelogUrl}
                rel="noreferrer"
                target="_blank"
              >
                Notas oficiales
              </a>
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
              Facciones en esta versión
            </h3>
            <FactionList factions={core} slug={slug} version={v.version} />
            {alternates.length > 0 ? (
              <>
                <span className={tag}>Alternativas</span>
                <FactionList
                  factions={alternates}
                  slug={slug}
                  version={v.version}
                />
              </>
            ) : null}
          </div>

          {v.maps.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
                Mapas
              </h3>
              <ul className="flex flex-wrap gap-2">
                {v.maps.map((m) => (
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

const FactionList = ({
  factions,
  slug,
  version,
}: {
  factions: {
    id: string;
    name: string;
    code: string | null;
    imageUrl: string | null;
    revision: {
      summary: string | null;
      inherited: boolean;
      version: string;
    } | null;
  }[];
  slug: string;
  version: string;
}) => (
  <ul className="grid gap-3 sm:grid-cols-2">
    {factions.map((f) => {
      const inner = (
        <>
          {f.imageUrl ? (
            <WikiImage
              alt=""
              className="size-12 shrink-0 object-contain"
              src={f.imageUrl}
            />
          ) : (
            <FactionEmblem
              className="shrink-0 text-(--gold)"
              code={f.code}
              size={40}
            />
          )}
          <span className="flex min-w-0 flex-col gap-1">
            <span className="d-display font-bold text-(--parchment) text-base uppercase">
              {f.name}
            </span>
            <span className="text-(--faded) text-sm">
              {f.revision?.summary ?? 'Sin ficha todavía.'}
            </span>
            {f.revision?.inherited ? (
              <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
                ficha heredada de {f.revision.version}
              </span>
            ) : null}
          </span>
        </>
      );
      const cls = `${panel} flex h-full items-start gap-3 p-4 transition-colors hover:border-(--gold)`;
      return (
        <li key={f.id}>
          {f.code ? (
            <Link className={cls} href={`/games/${slug}/${version}/${f.code}`}>
              {inner}
            </Link>
          ) : (
            <div className={cls}>{inner}</div>
          )}
        </li>
      );
    })}
  </ul>
);

export default GameVersionPage;
