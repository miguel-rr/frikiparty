import Link from 'next/link';
import type { CSSProperties } from 'react';

import { FactionEmblem } from '@/components/wiki/faction-emblem';
import { WikiImage } from '@/components/wiki/wiki-image';
import { heraldryOf } from '@/lib/wiki/faction-heraldry';
import { factionSlug } from '@/lib/wiki/faction-slug';

type BannerFaction = {
  id: string;
  name: string;
  code: string | null;
  imageUrl: string | null;
  transformsFactionId: string | null;
  introducedVersion: string;
  removedVersion: string | null;
};

/**
 * The core factions as hanging banners in their colours, crest inside the
 * ring, with the alternates that replace each one on certain maps as links
 * at the foot of its banner. The banner itself links to the core faction
 * (a stretched link, so the alternate links can sit on top of it).
 */
const FactionBanners = ({
  factions,
  slug,
  version,
}: {
  factions: BannerFaction[];
  slug: string;
  version: string | undefined;
}) => {
  const core = factions.filter((f) => !f.transformsFactionId);
  const alternatesOf = (id: string) =>
    factions.filter((f) => f.transformsFactionId === id);
  const hrefOf = (f: BannerFaction) =>
    version && f.code
      ? `/games/${slug}/${version}/${factionSlug(f.code)}`
      : null;
  return (
    <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {core.map((f) => (
        <li key={f.id}>
          <Banner alternates={alternatesOf(f.id)} faction={f} hrefOf={hrefOf} />
        </li>
      ))}
    </ul>
  );
};

const Banner = ({
  faction,
  alternates,
  hrefOf,
}: {
  faction: BannerFaction;
  alternates: BannerFaction[];
  hrefOf: (f: BannerFaction) => string | null;
}) => {
  const { motto, accent, field } = heraldryOf(faction.code);
  const href = hrefOf(faction);
  const colours = { '--accent': accent, '--field': field } as CSSProperties;
  return (
    <div
      className="group relative flex h-full min-h-88 flex-col items-center gap-2 border border-(--hair-gold) border-t-(--accent) border-t-3 bg-linear-to-b from-(--field) to-(--night-2) px-5 pt-6 pb-14 text-center transition-[filter] [clip-path:polygon(0_0,100%_0,100%_100%,50%_calc(100%-28px),0_100%)] hover:brightness-125"
      style={colours}
    >
      <span className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-[#6b5528] via-(--gold) to-[#6b5528]" />
      {faction.imageUrl ? (
        <WikiImage
          alt=""
          className="mt-1 size-36 object-contain drop-shadow-[0_6px_18px_#000a] transition-transform duration-300 group-hover:scale-105"
          src={faction.imageUrl}
        />
      ) : (
        <FactionEmblem
          className="mt-1 text-(--accent)"
          code={faction.code}
          size={144}
        />
      )}
      <h4 className="d-display mt-2 font-bold text-(--parchment) text-xl uppercase">
        {href ? (
          <Link
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            href={href}
          >
            {faction.name}
          </Link>
        ) : (
          faction.name
        )}
      </h4>
      {motto ? <p className="text-(--faded) text-sm italic">{motto}</p> : null}
      <p className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
        desde {faction.introducedVersion}
        {faction.removedVersion ? ` · hasta ${faction.removedVersion}` : ''}
      </p>
      {alternates.length > 0 ? (
        <div className="relative z-10 mt-auto flex flex-wrap justify-center gap-1.5 pt-3">
          <p className="w-full text-(--faded) text-xs">Alternativas</p>
          {alternates.map((alt) => (
            <AlternateLink faction={alt} href={hrefOf(alt)} key={alt.id} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const AlternateLink = ({
  faction,
  href,
}: {
  faction: BannerFaction;
  href: string | null;
}) => {
  const cls =
    'rounded-full border border-(--accent) bg-black/40 px-2.5 py-0.5 text-(--accent) text-xs';
  return href ? (
    <Link
      className={`${cls} transition-colors hover:bg-(--accent) hover:text-(--night)`}
      href={href}
    >
      {faction.name}
    </Link>
  ) : (
    <span className={cls}>{faction.name}</span>
  );
};

export { FactionBanners };
