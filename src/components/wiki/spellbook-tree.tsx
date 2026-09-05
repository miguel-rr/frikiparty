import { panel } from '@/components/theme/primitives';
import { WikiImage } from '@/components/wiki/wiki-image';
import { POWER_COLUMN, POWER_KIND_LABELS, TIER_COST } from '@/lib/wiki/labels';
import type { FactionPageData } from '@/server/wiki/queries';

type Power = FactionPageData['powers'][number];

const COLUMNS = 7;
const TIERS = 4;
const VIEW_W = 700;
const VIEW_H = 400;

/** Centre of a power in the tree, as a fraction of the box. */
const centre = (p: Power) => ({
  x: ((POWER_COLUMN[p.position ?? 'C'] + 0.5) / COLUMNS) * 100,
  y: (((p.tier ?? 1) - 0.5) / TIERS) * 100,
});

/**
 * The spellbook as the game draws it: three, four, three and two powers,
 * each linked to the powers of the tier above it. Icons over an SVG of the
 * links; below the tree, every power's text by tier.
 */
const SpellbookTree = ({ powers }: { powers: Power[] }) => {
  const placed = powers.filter((p) => p.tier && p.position);
  const byName = new Map(placed.map((p) => [p.name, p]));
  const links = placed.flatMap((p) =>
    p.requires
      .map((name) => byName.get(name))
      .filter((q): q is Power => Boolean(q))
      .map((q) => ({ from: centre(q), to: centre(p), key: `${q.id}-${p.id}` })),
  );
  return (
    <div className="flex flex-col gap-6">
      {placed.length > 0 ? (
        <div className="relative mx-auto aspect-[7/4] w-full max-w-3xl">
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          >
            <title>Árbol del libro de poderes</title>
            {links.map((l) => (
              <line
                className="stroke-(--hair-gold)"
                key={l.key}
                strokeWidth={2}
                x1={(l.from.x / 100) * VIEW_W}
                x2={(l.to.x / 100) * VIEW_W}
                y1={(l.from.y / 100) * VIEW_H}
                y2={(l.to.y / 100) * VIEW_H}
              />
            ))}
          </svg>
          {placed.map((p) => {
            const c = centre(p);
            return (
              <a
                className="group absolute flex w-[13%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                href={`#p-${p.id}`}
                key={p.id}
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                title={p.name}
              >
                <span className="relative size-[min(11vw,64px)] rounded-full border-(--hair-gold) border-2 bg-(--night-2) shadow-[0_0_18px_#00000088] transition group-hover:border-(--gold) group-hover:shadow-[0_0_18px_rgba(201,165,87,0.35)]">
                  {p.imageUrl ? (
                    <WikiImage
                      alt=""
                      className="size-full rounded-full object-cover"
                      src={p.imageUrl}
                    />
                  ) : null}
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-(--hair-gold) bg-(--night) px-1.5 font-mono text-(--gold) text-3xs">
                    {p.cost ?? TIER_COST[p.tier ?? 1]}
                  </span>
                </span>
                <span className="mt-1 hidden text-center text-(--parchment)/85 text-2xs leading-tight sm:block">
                  {p.name}
                </span>
              </a>
            );
          })}
        </div>
      ) : null}

      <ol className="grid gap-3 sm:grid-cols-2">
        {powers.map((p) => (
          <li
            className={`${panel} flex scroll-mt-24 gap-3 p-3`}
            id={`p-${p.id}`}
            key={p.id}
          >
            {p.imageUrl ? (
              <WikiImage
                alt=""
                className="size-12 shrink-0 rounded-full border border-(--hair-gold) object-cover"
                src={p.imageUrl}
              />
            ) : null}
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-(--parchment)">
                  {p.name}
                </span>
                <span className="font-mono text-(--gold) text-2xs uppercase">
                  {p.cost ?? (p.tier ? TIER_COST[p.tier] : '')} PP
                  {p.kind ? ` · ${POWER_KIND_LABELS[p.kind]}` : ''}
                </span>
              </span>
              {p.description ? (
                <span className="text-(--parchment)/80 text-xs">
                  {p.description}
                </span>
              ) : null}
              {p.requires.length > 0 ? (
                <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
                  tras {p.requires.join(' o ')}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export { SpellbookTree };
