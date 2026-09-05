'use client';

import { useState } from 'react';

import {
  FactionChip,
  type FactionRef,
} from '@/components/live/match/faction-chip';
import { btn } from '@/components/theme/primitives';

type Member = { playerId: string; name: string; isCaptain: boolean };

/**
 * The captain hands out the drawn factions: tap a faction, then the player
 * who takes it (or tap a player's faction to free it). Every player needs
 * one before "Confirmar"; the server checks the same.
 */
const LineupEditor = ({
  members,
  factions,
  initial,
  confirmed,
  pending,
  error,
  onConfirm,
}: {
  members: Member[];
  factions: FactionRef[];
  initial: { playerId: string; factionId: string }[];
  /** This team already confirmed; the editor is read-only until the other side does. */
  confirmed: boolean;
  pending: boolean;
  error: string | null;
  onConfirm: (assignments: { playerId: string; factionId: string }[]) => void;
}) => {
  const [assigned, setAssigned] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((a) => [a.playerId, a.factionId])),
  );
  const [held, setHeld] = useState<string | null>(null);
  const taken = new Set(Object.values(assigned));
  const free = factions.filter((f) => !taken.has(f.id));
  const complete = members.every((m) => assigned[m.playerId]);

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
          return (
            <li key={m.playerId}>
              <button
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  held && !confirmed
                    ? 'border-(--gold) bg-(--gold)/8'
                    : 'border-(--hair) hover:border-(--hair-gold)'
                }`}
                disabled={confirmed}
                onClick={() => give(m.playerId)}
                type="button"
              >
                <span className="font-bold text-(--parchment) text-sm">
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
            </li>
          );
        })}
      </ul>
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

export { LineupEditor };
