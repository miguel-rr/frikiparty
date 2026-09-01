import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  PlayerBlazon,
  panel,
  panelGold,
  RingGlyph,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { formatDateRange } from '@/lib/dates';
import { siteFlags } from '@/lib/site-flags';
import {
  SCENES,
  type Scene,
  sceneStyle,
} from '@/lib/tournament/edition-scenes';
import { api } from '@/trpc/server';

export const metadata: Metadata = { title: 'Ediciones — Frikiparty' };

const STATUS_TEXT = {
  live: 'En juego',
  upcoming: 'Próxima edición',
} as const;

type EditionItem =
  Awaited<ReturnType<typeof api.edition.list>> extends (infer T)[] ? T : never;

type Champion = EditionItem['teamChampions'][number];

const championsLabel =
  'flex items-center gap-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]';

const nameShadow =
  '[text-shadow:0_1px_8px_rgba(0,0,0,0.95),0_0_2px_rgba(0,0,0,0.9)]';

const markLayout = 'flex w-[70px] flex-col items-center gap-2';

/**
 * Heraldic champion mark: tall blazon with the name beneath, no boxes.
 * Champions we never recorded (name/slug null) still get their place in the
 * team — an anonymous shield, unlinked.
 */
const ChampionMark = ({
  champion,
  gold = false,
}: {
  champion: Champion;
  gold?: boolean;
}) => {
  if (!(champion.name && champion.slug)) {
    return (
      <div className={markLayout} title="Ganador no registrado">
        <PlayerBlazon champion={gold} name={null} size="lg" />
        <span
          className={`font-bold text-(--faded) text-sm italic ${nameShadow}`}
        >
          Desconocido
        </span>
      </div>
    );
  }
  return (
    <Link className={`group ${markLayout}`} href={`/players/${champion.slug}`}>
      <PlayerBlazon champion={gold} name={champion.name} size="lg" />
      <span
        className={`font-bold text-sm ${gold ? 'text-(--gold-hi)' : ''} ${nameShadow} transition-colors group-hover:text-(--gold)`}
      >
        {champion.name}
      </span>
    </Link>
  );
};

const EditionCard = ({
  edition,
  scene,
}: {
  edition: EditionItem;
  scene: Scene;
}) => {
  const running = edition.status !== 'past';
  return (
    <div
      className={`${running ? panelGold : panel} flex flex-col gap-4 p-5 sm:p-6`}
      style={sceneStyle(scene)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="d-display d-gold-text font-black text-2xl tracking-wide transition-opacity hover:opacity-80"
          href={`/editions/${edition.slug}`}
        >
          {edition.label}
        </Link>
        {running ? (
          <span className={tag}>
            {STATUS_TEXT[edition.status as 'live' | 'upcoming']}
          </span>
        ) : null}
        {edition.venueName && edition.venueSlug ? (
          <Link
            className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em] transition-colors hover:text-(--gold)"
            href={`/venues/${edition.venueSlug}`}
          >
            {edition.venueName}
          </Link>
        ) : null}
      </div>
      {running ? (
        <p className="text-(--faded)">
          {edition.startsAt && edition.endsAt
            ? `${formatDateRange(edition.startsAt, edition.endsAt)}. `
            : null}
          La próxima cita del concilio. Los campeones aún están por forjar.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
          {edition.teamChampions.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <span className={championsLabel}>
                <RingGlyph size={13} /> Campeones
              </span>
              {/* 2-per-row below sm (odd last one centered) — never a ragged 3+1. */}
              <ul className="grid grid-cols-2 justify-items-center gap-x-7 gap-y-4 sm:flex sm:flex-wrap sm:justify-center [&>li:last-child:nth-child(odd)]:col-span-2">
                {edition.teamChampions.map((champion, index) => (
                  <li key={champion.slug ?? `unknown-${index}`}>
                    <ChampionMark champion={champion} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-(--faded) text-sm italic">
              Los anales de esta edición se perdieron en la Cuenta Larga.
            </p>
          )}
          {edition.individualChampion ? (
            <div className="flex flex-col items-center gap-3">
              <span className={championsLabel}>
                <RingGlyph size={11} tone="solitaire" /> Campeón individual
              </span>
              <ChampionMark champion={edition.individualChampion} gold />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const EditionsPage = async () => {
  if (!siteFlags.editionsPage) {
    notFound();
  }
  const editions = await api.edition.list();

  return (
    <SiteShell>
      <main>
        <Section id="editions">
          <SectionHeader
            eyebrowText="Crónica · Desde 2005"
            lead="Cada año, una casa rural, un torneo y un puñado de anillos. Esta es la cuenta de todas las ediciones del concilio."
            title="Las Ediciones"
          />
          {editions.length > 0 ? (
            <ol className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 border-(--hair-gold) border-l pl-6 sm:pl-10">
              {editions.map((edition, index) => (
                <li className="relative" key={edition.id}>
                  <span
                    aria-hidden
                    className="absolute top-6 -left-[34px] grid size-4 place-items-center bg-(--night) sm:-left-[50px]"
                  >
                    <RingGlyph
                      size={16}
                      tone={edition.individualChampion ? 'solitaire' : 'gold'}
                    />
                  </span>
                  <EditionCard
                    edition={edition}
                    scene={SCENES[index % SCENES.length] as Scene}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-center text-(--faded)">
              Todavía no hay ediciones registradas.
            </p>
          )}
        </Section>
      </main>
    </SiteShell>
  );
};

export default EditionsPage;
