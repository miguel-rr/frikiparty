'use client';

import { useState } from 'react';

import {
  FactionChip,
  type FactionRef,
} from '@/components/live/match/faction-chip';
import { MapBoardView, type RingView } from '@/components/live/match/map-board';
import { btn } from '@/components/theme/primitives';
import type { MapBoard, RingSides } from '@/lib/live/map-board';

type Member = { playerId: string; name: string; isCaptain: boolean };

type Assignment = { playerId: string; factionId: string; ring: number | null };

/** The board the captain places the team on, with the rings each side holds. */
type Placement = {
  board: MapBoard;
  mapName: string;
  sides: RingSides;
  side: 'A' | 'B';
};

/**
 * The captain hands out the drawn factions (tap a faction, then the player
 * who takes it, or tap a player's faction to free it) and, on a map with
 * a board, places every player on one of the team's rings (tap "Colocar",
 * then the ring; tap a taken ring to move whoever stands there). Nothing
 * of it reaches the rival until both captains confirm; the server checks
 * the same rules.
 */
const LineupEditor = ({
  members,
  factions,
  initial,
  placement,
  confirmed,
  pending,
  error,
  onConfirm,
}: {
  members: Member[];
  factions: FactionRef[];
  initial: { playerId: string; factionId: string; ring: number | null }[];
  placement: Placement | null;
  /** This team already confirmed; the editor is read-only until the other side does. */
  confirmed: boolean;
  pending: boolean;
  error: string | null;
  onConfirm: (assignments: Assignment[]) => void;
}) => {
  const [assigned, setAssigned] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((a) => [a.playerId, a.factionId])),
  );
  const [rings, setRings] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initial.flatMap((a) => (a.ring === null ? [] : [[a.playerId, a.ring]])),
    ),
  );
  const [held, setHeld] = useState<string | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const taken = new Set(Object.values(assigned));
  const free = factions.filter((f) => !taken.has(f.id));
  const ownRings = placement ? placement.sides[placement.side] : [];
  const complete = members.every(
    (m) =>
      assigned[m.playerId] &&
      (!placement || ownRings.includes(rings[m.playerId] ?? -1)),
  );

  const give = (playerId: string) => {
    if (confirmed) return;
    const current = assigned[playerId];
    if (held) {
      setAssigned((prev) => {
        const next = { ...prev };
        // The faction leaves whoever had it and lands on this player.
        for (const [pid, fid] of Object.entries(next))
          if (fid === held) delete next[pid];
        next[playerId] = held;
        return next;
      });
      setHeld(null);
      return;
    }
    if (current) {
      setAssigned((prev) => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
      setHeld(current);
    }
  };

  const playerOn = (ring: number) =>
    Object.entries(rings).find(([, r]) => r === ring)?.[0] ?? null;

  const place = (ring: number) => {
    if (confirmed || !ownRings.includes(ring)) return;
    const standing = playerOn(ring);
    if (!placing) {
      // A taken ring picks its player up to move them.
      if (standing) setPlacing(standing);
      return;
    }
    setRings((prev) => {
      const next = { ...prev };
      const from = next[placing];
      // Whoever stood there swaps to the ring the moved player left.
      if (standing && standing !== placing) {
        if (from === undefined) delete next[standing];
        else next[standing] = from;
      }
      next[placing] = ring;
      return next;
    });
    setPlacing(null);
  };

  const nameOf = (playerId: string | null) =>
    members.find((m) => m.playerId === playerId)?.name ?? null;

  const ringViews: RingView[] = placement
    ? placement.board.rings.map((_, index) => {
        const side = placement.sides.A.includes(index)
          ? 'A'
          : placement.sides.B.includes(index)
            ? 'B'
            : null;
        const mine = side === placement.side;
        return {
          side,
          label: mine ? nameOf(playerOn(index)) : null,
          highlighted: mine && Boolean(placing) && !confirmed,
          muted: !mine,
        };
      })
    : [];

  return (
    <div className="flex flex-col gap-3">
      {!confirmed ? (
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
            {free.length > 0 ? 'Por repartir' : 'Todo repartido'}
          </span>
          {free.map((f) => (
            <FactionChip
              faction={f}
              key={f.id}
              onClick={() => setHeld(held === f.id ? null : f.id)}
              size="sm"
              tone={held === f.id ? 'selected' : 'unassigned'}
            />
          ))}
        </div>
      ) : null}
      <ul className="flex flex-col gap-1.5">
        {members.map((m) => {
          const faction = factions.find((f) => f.id === assigned[m.playerId]);
          const ring = rings[m.playerId];
          const slot =
            placement && ring !== undefined
              ? placement.board.rings[ring]?.slot
              : undefined;
          return (
            <li className="flex items-stretch gap-1.5" key={m.playerId}>
              <button
                className={`flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  held && !confirmed
                    ? 'border-(--gold) bg-(--gold)/8'
                    : 'border-(--hair) hover:border-(--hair-gold)'
                }`}
                disabled={confirmed}
                onClick={() => give(m.playerId)}
                type="button"
              >
                <span className="truncate font-bold text-(--parchment) text-sm">
                  {m.name}
                  {m.isCaptain ? (
                    <span className="ml-1.5 font-mono text-(--gold) text-3xs uppercase">
                      cap.
                    </span>
                  ) : null}
                </span>
                {faction ? (
                  <FactionChip faction={faction} size="sm" tone="plain" />
                ) : (
                  <span className="font-mono text-(--faded) text-3xs uppercase">
                    {held ? 'toca para asignar' : 'sin facción'}
                  </span>
                )}
              </button>
              {placement ? (
                <button
                  className={`w-24 shrink-0 cursor-pointer rounded-lg border px-2 py-2 font-mono text-3xs uppercase tracking-wider transition-colors ${
                    placing === m.playerId
                      ? 'border-(--gold) bg-(--gold)/15 text-(--gold-hi)'
                      : slot !== undefined
                        ? 'border-(--hair-gold) text-(--parchment)'
                        : 'border-(--hair) text-(--faded) hover:border-(--hair-gold)'
                  }`}
                  disabled={confirmed}
                  onClick={() =>
                    setPlacing(placing === m.playerId ? null : m.playerId)
                  }
                  type="button"
                >
                  {placing === m.playerId
                    ? 'elige anillo'
                    : slot !== undefined
                      ? `posición ${slot}`
                      : 'colocar'}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {placement ? (
        <div className="flex flex-col gap-1.5">
          <MapBoardView
            board={placement.board}
            name={placement.mapName}
            onRing={confirmed ? undefined : place}
            rings={ringViews}
          />
          <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider">
            {confirmed
              ? 'Posiciones confirmadas · el rival no las ve hasta que confirme'
              : placing
                ? `Elige el anillo de ${nameOf(placing)}`
                : 'Toca «colocar» y luego uno de vuestros anillos · el rival no verá nada hasta que confirméis los dos'}
          </span>
        </div>
      ) : null}
      {confirmed ? (
        <span className="font-mono text-(--moss) text-2xs uppercase tracking-xl">
          Reparto confirmado
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={btn.primary}
            disabled={!complete || pending}
            onClick={() =>
              onConfirm(
                members.map((m) => ({
                  playerId: m.playerId,
                  factionId: assigned[m.playerId] as string,
                  ring: placement ? (rings[m.playerId] ?? null) : null,
                })),
              )
            }
            type="button"
          >
            {pending ? 'Guardando…' : 'Confirmar reparto'}
          </button>
          {error ? (
            <span className="text-(--ember) text-xs">{error}</span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export { LineupEditor, type Placement };
