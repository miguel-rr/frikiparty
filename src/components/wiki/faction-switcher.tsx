import Link from 'next/link';

import { btn } from '@/components/theme/primitives';
import { FactionEmblem } from '@/components/wiki/faction-emblem';
import { WikiImage } from '@/components/wiki/wiki-image';
import { factionSlug } from '@/lib/wiki/faction-slug';

type SwitcherFaction = {
  code: string | null;
  name: string;
  kind: 'core' | 'alternate';
  imageUrl: string | null;
};

const FactionLink = ({
  faction,
  href,
  current,
}: {
  faction: SwitcherFaction;
  href: string;
  current: boolean;
}) => (
  <li>
    <Link
      aria-current={current ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-(--panel-2) hover:text-(--gold-hi) ${current ? 'bg-(--panel-2) text-(--gold-hi)' : 'text-(--parchment)'}`}
      href={href}
    >
      {faction.imageUrl ? (
        <WikiImage
          alt=""
          className="size-7 shrink-0 object-contain"
          src={faction.imageUrl}
        />
      ) : (
        <FactionEmblem
          className="shrink-0 text-(--gold)"
          code={faction.code}
          size={24}
        />
      )}
      <span className="min-w-0 truncate">{faction.name}</span>
    </Link>
  </li>
);

/**
 * Jump to another faction of the same version. A native `details`
 * disclosure: no client JavaScript, and navigating closes it.
 */
const FactionSwitcher = ({
  factions,
  currentCode,
  slug,
  version,
}: {
  factions: SwitcherFaction[];
  currentCode: string;
  slug: string;
  version: string;
}) => {
  const groups = [
    { label: 'Facciones', items: factions.filter((f) => f.kind === 'core') },
    {
      label: 'Alternativas',
      items: factions.filter((f) => f.kind === 'alternate'),
    },
  ].filter((group) => group.items.length > 0);
  return (
    <details className="group relative">
      <summary
        className={`${btn.outline} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
      >
        Otras facciones
        <span
          aria-hidden="true"
          className="transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="absolute top-full left-1/2 z-30 mt-2 flex max-h-[70vh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-xl border border-(--hair-gold) bg-(--night-2) p-4 text-left shadow-[0_18px_40px_#000000a6]">
        {groups.map((group) => (
          <div className="flex flex-col gap-2" key={group.label}>
            <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
              {group.label}
            </span>
            <ul className="grid gap-1 sm:grid-cols-2">
              {group.items.map((f) =>
                f.code ? (
                  <FactionLink
                    current={f.code === currentCode}
                    faction={f}
                    href={`/games/${slug}/${version}/${factionSlug(f.code)}`}
                    key={f.code}
                  />
                ) : null,
              )}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
};

export { FactionSwitcher };
