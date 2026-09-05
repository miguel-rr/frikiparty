import type { Metadata } from 'next';

import { DaysUntil } from '@/app/_components/days-until';
import { HeroRidge } from '@/app/_components/home-hero';
import { NEXT_EVENT } from '@/app/design/fixtures';
import { SiteShell } from '@/components/layout/site-shell';
import { pageWidth, SectionHeader, tag } from '@/components/theme/primitives';
import { TheRing } from '@/components/theme/ring';
import { formatShortDateRange } from '@/lib/dates';
import { dealCardSpecs } from '@/lib/tournament/card-lore';
import {
  getNextEdition,
  listConfirmedPlayers,
} from '@/server/api/routers/edition';
import { db } from '@/server/db';

import { daysBetween, type EventFacts, mapEmbedFor } from './_components/facts';
import { ProposalSwitcher } from './_components/proposal-switcher';
import {
  ProposalBando,
  ProposalBanner,
  ProposalBeacons,
  ProposalCartouche,
} from './_components/proposals';

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Frikiparty — La convocatoria en la home',
};

// Real edition and confirmations, refreshed hourly like the home itself.
/** Area line for the venue: not stored yet, so the fixture's stands in. */
const VENUE_AREA = NEXT_EVENT.venueArea;

const loadFacts = async (): Promise<EventFacts> => {
  const edition = await getNextEdition(db);
  const confirmedPlayers = edition
    ? await listConfirmedPlayers(db, edition.id)
    : [];
  const cards = dealCardSpecs(confirmedPlayers);
  const confirmed = confirmedPlayers.map((player, index) => ({
    name: player.name,
    slug: player.slug,
    portrait: cards[index]?.portrait ?? '',
  }));
  const startsAt = edition?.startsAt ?? '2026-11-12';
  const endsAt = edition?.endsAt ?? '2026-11-15';
  return {
    year: edition?.year ?? 2026,
    editionSlug: edition?.slug ?? '2026',
    startsAt,
    endsAt,
    days: daysBetween(startsAt, endsAt),
    venueName: edition?.venueName ?? NEXT_EVENT.venue,
    venueArea: VENUE_AREA,
    venueSlug: edition?.venueSlug ?? null,
    venueIsPlace: edition?.venueIsPlace ?? false,
    venuePhotoUrl: edition?.venuePhotoUrl ?? NEXT_EVENT.venuePhoto,
    mapsUrl: edition?.venueMapsUrl ?? NEXT_EVENT.mapsUrl,
    mapEmbedSrc:
      mapEmbedFor(edition?.venueMapsEmbedQuery ?? null) ??
      NEXT_EVENT.mapsEmbedUrl,
    confirmed,
  };
};

/** The home hero as it stands today, down to the headline. */
const HeroHead = ({ facts }: { facts: EventFacts }) => (
  <>
    <TheRing
      className="w-[min(80vw,440px)] lg:w-105"
      title={`Edición ${facts.year}`}
    >
      <span className="font-bold font-mono text-(--gold) text-sm uppercase tracking-5xl lg:text-base">
        Edición
      </span>
      <span className="d-display d-gold-text -mt-2 font-black text-6xl leading-none lg:text-7xl">
        {facts.year}
      </span>
      <span className="font-bold font-mono text-(--faded) text-3xs uppercase tracking-3xl lg:text-2xs">
        {formatShortDateRange(facts.startsAt, facts.endsAt)}
      </span>
      <DaysUntil startsAt={facts.startsAt} />
    </TheRing>
    <div className="flex flex-col items-center gap-7 text-center lg:gap-5">
      <span className={tag}>Concilio anual · Edición {facts.year}</span>
      <h1 className="d-display font-black text-[clamp(2.1rem,4.6vw,3.6rem)] uppercase leading-[1.08]">
        La Comunidad
        <br />
        <span className="d-gold-text">vuelve a reunirse</span>
      </h1>
    </div>
  </>
);

const HomeProposalsPage = async () => {
  const facts = await loadFacts();
  const items = [
    {
      key: 'd',
      name: 'Las jornadas',
      caption:
        'Las jornadas como almenaras sobre un raíl dorado, con lo que toca cada día; una sola placa debajo para sede, confirmados y juego',
      node: <ProposalBeacons facts={facts} />,
    },
    {
      key: 'a',
      name: 'El bando',
      caption:
        'Cuatro celdas en una sola franja dorada; la sede lleva el mapa de fondo y es el enlace a Maps; los confirmados llevan al concilio',
      node: <ProposalBando facts={facts} />,
    },
    {
      key: 'b',
      name: 'La carta de marcha',
      caption:
        'El mapa es la pieza: los datos van en un cartucho de leyenda y la rosa de los vientos es el «Cómo llegar»',
      node: <ProposalCartouche facts={facts} />,
    },
    {
      key: 'c',
      name: 'El estandarte',
      caption:
        'Un pendón colgado bajo el titular: las fechas como divisa, la sede en medallón (el enlace a Maps), juego y confirmados en el faldón',
      node: <ProposalBanner facts={facts} />,
    },
  ];
  return (
    <SiteShell
      footerNote={
        <>
          Propuesta de diseño — ruta{' '}
          <span className="font-mono">/design/home</span>. Fechas, sede y
          confirmados son los reales; el plan de cada jornada es texto de
          muestra.
        </>
      }
    >
      <main>
        <div className={`${pageWidth} pt-10`}>
          <SectionHeader
            eyebrowText="Home · Bajo el titular"
            lead="La línea de fechas, sede y juego que hoy va en texto corrido, con el «Cómo llegar» colgando debajo. Cuatro maneras de convertirla en la ficha de la convocatoria, con el mapa metido dentro de la pieza y los confirmados que ya tenemos. Elige una y se monta bajo el titular real."
            title="La convocatoria"
          />
        </div>
        <ProposalSwitcher head={<HeroHead facts={facts} />} items={items} />
        <HeroRidge />
        <div className="h-24 bg-(--night-2)" />
      </main>
    </SiteShell>
  );
};

export default HomeProposalsPage;
