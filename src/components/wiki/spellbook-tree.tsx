'use client';

import { useEffect, useRef, useState } from 'react';

import { panelGold } from '@/components/theme/primitives';
import { WikiImage } from '@/components/wiki/wiki-image';
import { POWER_KIND_LABELS, powerColumn, TIER_COST } from '@/lib/wiki/labels';
import type { FactionPageData } from '@/server/wiki/queries';

type Power = FactionPageData['powers'][number];

const COLUMNS = 7;
const TIERS = 4;
const VIEW_W = 700;
const VIEW_H = 400;

/** Centre of a power in the tree, as a fraction of the box. */
const centre = (p: Power) => ({
  x: ((powerColumn(p.tier, p.position ?? 'C') + 0.5) / COLUMNS) * 100,
  y: (((p.tier ?? 1) - 0.5) / TIERS) * 100,
});

const costOf = (p: Power) => p.cost ?? TIER_COST[p.tier ?? 1];

/** What a power does, shared by the desktop tooltip and the mobile sheet. */
const PowerDetail = ({ power: p }: { power: Power }) => (
  <div className="flex gap-3">
    {p.imageUrl ? (
      <WikiImage
        alt=""
        className="size-14 shrink-0 rounded-full border border-(--hair-gold) object-cover"
        src={p.imageUrl}
      />
    ) : null}
    <div className="flex min-w-0 flex-col gap-1 text-left">
      <span className="d-display font-bold text-(--gold-hi) text-base uppercase leading-tight">
        {p.name}
      </span>
      <span className="font-mono text-(--gold) text-2xs uppercase tracking-wider">
        {costOf(p)} PP
        {p.kind ? ` · ${POWER_KIND_LABELS[p.kind]}` : ''}
      </span>
      {p.description ? (
        <span className="text-(--parchment)/85 text-sm">{p.description}</span>
      ) : null}
      {p.requires.length > 0 ? (
        <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
          tras {p.requires.join(' o ')}
        </span>
      ) : null}
    </div>
  </div>
);

/**
 * The spellbook as the game draws it: three, four, three and two powers,
 * each linked to the powers of the tier above it. Tapping a power opens
 * its card: a floating tooltip next to the icon on wide screens, a sheet
 * from the bottom on phones.
 */
const SpellbookTree = ({ powers }: { powers: Power[] }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const placed = powers.filter((p) => p.tier && p.position);
  const active = placed.find((p) => p.id === activeId) ?? null;
  const byName = new Map(placed.map((p) => [p.name, p]));
  const links = placed.flatMap((p) =>
    p.requires
      .map((name) => byName.get(name))
      .filter((q): q is Power => Boolean(q))
      .map((q) => ({
        from: centre(q),
        to: centre(p),
        key: `${q.id}-${p.id}`,
        lit: activeId === p.id || activeId === q.id,
      })),
  );

  // Escape or a click anywhere outside the tree closes the card.
  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveId(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node))
        setActiveId(null);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [activeId]);

  if (placed.length === 0) return null;

  // Tooltip placement: below the icon (above for the last tier), pulled
  // towards the centre on the outer columns so it never leaves the box.
  const tooltipStyle = active
    ? (() => {
        const c = centre(active);
        const col = powerColumn(active.tier, active.position ?? 'C');
        const shift = col === 0 ? '-8%' : col === COLUMNS - 1 ? '-92%' : '-50%';
        return active.tier === TIERS
          ? {
              left: `${c.x}%`,
              bottom: `${100 - c.y + 11}%`,
              transform: `translateX(${shift})`,
            }
          : {
              left: `${c.x}%`,
              top: `${c.y + 11}%`,
              transform: `translateX(${shift})`,
            };
      })()
    : undefined;

  return (
    <div
      className="relative mx-auto aspect-[7/6] w-full max-w-3xl sm:aspect-[7/4]"
      ref={box}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      >
        <title>Árbol de poderes</title>
        {links.map((l) => (
          <line
            className={l.lit ? 'stroke-(--gold)' : 'stroke-(--hair-gold)'}
            key={l.key}
            strokeWidth={l.lit ? 3 : 2}
            x1={(l.from.x / 100) * VIEW_W}
            x2={(l.to.x / 100) * VIEW_W}
            y1={(l.from.y / 100) * VIEW_H}
            y2={(l.to.y / 100) * VIEW_H}
          />
        ))}
      </svg>
      {placed.map((p) => {
        const c = centre(p);
        const isActive = p.id === activeId;
        return (
          <button
            aria-expanded={isActive}
            className="group absolute flex w-[13%] -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-1"
            key={p.id}
            onClick={() => setActiveId(isActive ? null : p.id)}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            type="button"
          >
            <span
              className={`relative size-[min(13vw,64px)] rounded-full border-2 bg-(--night-2) transition ${
                isActive
                  ? 'border-(--gold-hi) shadow-[0_0_22px_rgba(201,165,87,0.55)]'
                  : 'border-(--hair-gold) shadow-[0_0_18px_#00000088] group-hover:border-(--gold) group-hover:shadow-[0_0_18px_rgba(201,165,87,0.35)]'
              }`}
            >
              {p.imageUrl ? (
                <WikiImage
                  alt=""
                  className="size-full rounded-full object-cover"
                  src={p.imageUrl}
                />
              ) : null}
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-(--hair-gold) bg-(--night) px-1.5 font-mono text-(--gold) text-3xs">
                {costOf(p)}
              </span>
            </span>
            <span
              className={`mt-1 hidden text-center text-2xs leading-tight sm:block ${isActive ? 'text-(--gold-hi)' : 'text-(--parchment)/85'}`}
            >
              {p.name}
            </span>
          </button>
        );
      })}

      {active ? (
        <>
          {/* Desktop: a card floating next to the icon. */}
          <div
            className={`${panelGold} absolute z-20 hidden w-72 bg-(--night) p-4 sm:block`}
            role="dialog"
            style={tooltipStyle}
          >
            <PowerDetail power={active} />
          </div>
          {/* Phones: a sheet from the bottom over a dimmed page. */}
          <button
            aria-label="Cerrar"
            className="fixed inset-0 z-40 bg-black/60 sm:hidden"
            onClick={() => setActiveId(null)}
            type="button"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-(--hair-gold) bg-(--night) p-5 pb-8 shadow-[0_-12px_34px_#00000099] sm:hidden"
            role="dialog"
          >
            <PowerDetail power={active} />
            <button
              className="mt-4 w-full rounded-full border border-(--hair) py-2 font-mono text-(--faded) text-2xs uppercase tracking-2xl"
              onClick={() => setActiveId(null)}
              type="button"
            >
              Cerrar
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export { SpellbookTree };
