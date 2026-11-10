'use client';

import {
  type MapBoard,
  type MapFacts,
  type MapOrigin,
  ORIGIN_LABEL,
  SIZE_BAND_LABEL,
} from '@/lib/live/map-board';

/** Ink of each team on the parchment: clear on the art and told apart at a glance. */
const TEAM_INK = { A: '#1f4fa3', B: '#a8261d' } as const;

/** The booklet's tab colours: who made the map. */
const ORIGIN_INK: Record<MapOrigin, string> = {
  official: '#0d6469',
  custom: '#a3211a',
  ai: '#5c3394',
};

/** "Mediano · 500 × 500", the size line of the map's page in the booklet. */
const sizeText = (facts: MapFacts) =>
  [
    facts.sizeBand ? SIZE_BAND_LABEL[facts.sizeBand] : null,
    facts.cells ? `${facts.cells.width} × ${facts.cells.height}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

/** The booklet's data line: who made the map, its size band and its size. */
const MapFactsLine = ({ facts }: { facts: MapFacts }) => {
  const size = sizeText(facts);
  if (!facts.origin && !size) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-2xs uppercase tracking-xl">
      {facts.origin ? (
        <span
          className="rounded px-1.5 py-0.5 font-bold text-white"
          style={{ background: ORIGIN_INK[facts.origin] }}
        >
          {ORIGIN_LABEL[facts.origin]}
        </span>
      ) : null}
      {size ? <span className="text-(--parchment)">{size}</span> : null}
    </div>
  );
};

type RingView = {
  /** Whose side the ring is on; null when neither team uses it. */
  side: 'A' | 'B' | null;
  /** Who stands on it, when known to this viewer. */
  label?: string | null;
  /** Lit while the captain is choosing where someone goes. */
  highlighted?: boolean;
  /** Faded: a ring the viewer cannot use right now. */
  muted?: boolean;
};

/**
 * The booklet's art with its start rings laid over as buttons, at the
 * ring's own spot and size whatever the width the sheet gets. Each ring
 * shows its lobby slot, the team that holds it, and the player on it.
 */
const MapBoardView = ({
  board,
  name,
  rings,
  onRing,
  showSlots = true,
}: {
  board: MapBoard;
  name: string;
  rings: RingView[];
  onRing?: (index: number) => void;
  showSlots?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{
        aspectRatio: `${board.width} / ${board.height}`,
        containerType: 'inline-size',
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: static art from /public, already sized for the web */}
      <img
        alt={`Mapa de ${name}`}
        className="absolute inset-0 h-full w-full select-none"
        draggable={false}
        src={board.imageUrl}
      />
      {board.rings.map((ring, index) => {
        const view = rings[index] ?? { side: null };
        const ink = view.side ? TEAM_INK[view.side] : null;
        const size = ((ring.r * 2) / board.width) * 100;
        const clickable = Boolean(onRing) && !view.muted;
        return (
          <button
            aria-label={`Posición ${ring.slot}${view.label ? `: ${view.label}` : ''}`}
            className={`absolute flex aspect-square -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center leading-tight transition-[opacity,box-shadow] duration-150 ${
              clickable ? 'cursor-pointer' : 'cursor-default'
            } ${view.muted ? 'opacity-45' : ''}`}
            disabled={!clickable}
            key={`${ring.x}-${ring.y}`}
            onClick={() => onRing?.(index)}
            style={{
              left: `${(ring.x / board.width) * 100}%`,
              top: `${(ring.y / board.height) * 100}%`,
              width: `${size * 0.96}%`,
              background: view.label && ink ? ink : 'rgba(255,255,255,0.0)',
              boxShadow: view.highlighted
                ? '0 0 0 0.45cqw #fff, 0 0 2.2cqw 0.6cqw rgba(255,215,120,0.95)'
                : ink
                  ? `inset 0 0 0 0.55cqw ${ink}`
                  : undefined,
              color: view.label ? '#fff' : (ink ?? '#5b3a1e'),
            }}
            type="button"
          >
            {showSlots ? (
              <span
                className="font-bold font-mono"
                style={{ fontSize: view.label ? '1.5cqw' : '2.2cqw' }}
              >
                {ring.slot}
              </span>
            ) : null}
            {view.label ? (
              <span
                className="max-w-[92%] overflow-hidden text-ellipsis whitespace-nowrap font-bold"
                style={{ fontSize: '1.9cqw' }}
              >
                {view.label}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
    <MapFactsLine facts={board.facts} />
  </div>
);

export { MapBoardView, MapFactsLine, type RingView, sizeText, TEAM_INK };
