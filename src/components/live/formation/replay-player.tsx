'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AuctionStage } from '@/components/live/formation/auction-stage';
import { DraftStage } from '@/components/live/formation/draft-stage';
import { btn, panel, panelGold } from '@/components/theme/primitives';
import { type AuctionEvent, foldAuction } from '@/lib/tournament/auction-live';
import { foldDraft } from '@/lib/tournament/draft-live';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

const SPEEDS = [1, 4, 16] as const;

/**
 * Revive la subasta o el draft: the log folded up to a moving instant,
 * painted with the same stage as the live room. Real pacing at ×1 (the
 * countdowns included), faster at ×4 and ×16, or jump event by event.
 */
const ReplayPlayer = ({
  live,
  kind,
}: {
  live: LiveState;
  kind: 'draft' | 'auction';
}) => {
  const events = api.formation.events.useQuery({ tournamentId: live.id, kind });
  const list = useMemo(() => events.data ?? [], [events.data]);
  const start = list[0]?.at ?? 0;
  const end = list.at(-1)?.at ?? 0;
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4);
  const frame = useRef<number | null>(null);
  const lastTick = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    lastTick.current = performance.now();
    const step = (now: number) => {
      const delta = (now - lastTick.current) * speed;
      lastTick.current = now;
      setClock((value) => {
        const next = value + delta;
        if (next >= end - start) {
          setPlaying(false);
          return end - start;
        }
        return next;
      });
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [playing, speed, end, start]);

  const at = start + clock;
  const visible = useMemo(
    () => list.filter((e) => e.at <= at) as AuctionEvent[],
    [list, at],
  );
  // Undo marks are honoured only once the undo itself has happened.
  const timed = useMemo(
    () =>
      visible.map((e) => ({
        ...e,
        undoneBySeq:
          e.undoneBySeq !== null && visible.some((u) => u.seq === e.undoneBySeq)
            ? e.undoneBySeq
            : null,
      })),
    [visible],
  );
  const state = useMemo(
    () => (kind === 'auction' ? foldAuction(timed) : foldDraft(timed)),
    [kind, timed],
  );
  const marks = useMemo(
    () =>
      list
        .filter((e) =>
          [
            'lot_sold',
            'lot_auto_assigned',
            'raffle_assigned',
            'player_picked',
          ].includes(e.type),
        )
        .map((e) => (end > start ? ((e.at - start) / (end - start)) * 100 : 0)),
    [list, start, end],
  );
  const jumpNext = () => {
    const nextEvent = list.find((e) => e.at > at);
    if (nextEvent) setClock(nextEvent.at - start);
  };

  if (events.isPending)
    return <p className="text-(--faded) text-sm">Cargando el registro…</p>;
  if (list.length === 0) {
    return (
      <p className="text-(--faded) text-sm">No hay nada que revivir todavía.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={`${panelGold} flex flex-col gap-3 p-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={btn.primary}
            onClick={() => setPlaying((v) => !v)}
            type="button"
          >
            {playing
              ? 'Pausa'
              : clock >= end - start
                ? 'Desde el principio'
                : 'Reproducir'}
          </button>
          {SPEEDS.map((s) => (
            <button
              className={`${speed === s ? btn.primary : btn.secondary} px-3 py-1.5 text-xs`}
              key={s}
              onClick={() => setSpeed(s)}
              type="button"
            >
              ×{s}
            </button>
          ))}
          <button
            className={`${btn.secondary} px-3 py-1.5 text-xs`}
            onClick={jumpNext}
            type="button"
          >
            Siguiente evento
          </button>
          <span className="ml-auto font-mono text-(--faded) text-xs">
            {formatClock(clock)} / {formatClock(end - start)}
          </span>
        </div>
        <div className="relative">
          <input
            className="w-full accent-(--gold)"
            max={end - start}
            min={0}
            onChange={(e) => {
              setPlaying(false);
              setClock(Number(e.target.value));
            }}
            type="range"
            value={clock}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1">
            {marks.map((pct, index) => (
              <span
                className="absolute top-0 h-1 w-0.5 bg-(--gold-hi)"
                // biome-ignore lint/suspicious/noArrayIndexKey: marks are positional.
                key={index}
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>
        </div>
      </section>

      {kind === 'auction' ? (
        <AuctionStage
          auction={state as ReturnType<typeof foldAuction>}
          captainId={null}
          live={live}
          tv
        />
      ) : (
        <DraftStage
          captainId={null}
          draft={state as ReturnType<typeof foldDraft>}
          live={live}
          tv
        />
      )}

      {clock >= end - start ? (
        <Summary events={list as AuctionEvent[]} kind={kind} live={live} />
      ) : null}
    </div>
  );
};

const formatClock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** The closing numbers: who paid what, the longest bidding war, the most contested. */
const Summary = ({
  kind,
  live,
  events,
}: {
  kind: 'draft' | 'auction';
  live: LiveState;
  events: AuctionEvent[];
}) => {
  const byId = new Map(live.participants.map((p) => [p.id, p.name]));
  if (kind !== 'auction') return null;
  const state = foldAuction(events);
  const bidsPerLot = new Map<string, number>();
  let currentLot: string | null = null;
  for (const e of events) {
    if (e.undoneBySeq !== null) continue;
    if (e.type === 'lot_opened') currentLot = String(e.payload.playerId);
    if (e.type === 'bid_placed' && currentLot)
      bidsPerLot.set(currentLot, (bidsPerLot.get(currentLot) ?? 0) + 1);
  }
  const contested = [...bidsPerLot.entries()].sort((a, b) => b[1] - a[1])[0];
  const priciest = [...state.sales].sort((a, b) => b.amount - a.amount)[0];
  const spent = state.captainIds
    .map((cid) => ({ cid, spent: state.budget - (state.budgets[cid] ?? 0) }))
    .sort((a, b) => b.spent - a.spent)[0];
  return (
    <section className={`${panel} grid gap-4 p-5 sm:grid-cols-3`}>
      <Stat
        label="Jugador más disputado"
        value={
          contested
            ? `${byId.get(contested[0]) ?? '…'} · ${contested[1]} pujas`
            : '—'
        }
      />
      <Stat
        label="Compra más cara"
        value={
          priciest
            ? `${byId.get(priciest.playerId) ?? '…'} · ${priciest.amount}`
            : '—'
        }
      />
      <Stat
        label="Quien más se dejó"
        value={spent ? `${byId.get(spent.cid) ?? '…'} · ${spent.spent}` : '—'}
      />
    </section>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
      {label}
    </span>
    <span className="text-(--parchment)">{value}</span>
  </div>
);

export { ReplayPlayer };
