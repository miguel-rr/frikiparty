'use client';

import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';
import type { Pots } from '@/lib/simulator/types';

type PotBoardProps = {
  pots: Pots;
  onMove: (playerId: string, fromPotIndex: number, toPotIndex: number) => void;
};

const getPlayerName = (id: string) =>
  MOCK_PLAYERS.find((player) => player.id === id)?.name ?? id;

const PotBoard = ({ pots, onMove }: PotBoardProps) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {pots.map((pot, potIndex) => (
      <div
        className="flex flex-col gap-2 rounded-xl bg-panel-2 p-3 ring-1 ring-hair"
        // biome-ignore lint/suspicious/noArrayIndexKey: pot tiers are positionally fixed, only their members move.
        key={`pot-${potIndex}`}
      >
        <p className="font-bold font-mono text-[0.6rem] text-muted uppercase tracking-widest">
          Bombo {potIndex + 1}
          {potIndex === 0 ? ' · Cabezas de serie' : ''}
        </p>
        <ul className="flex flex-col gap-1.5">
          {pot.map((playerId) => (
            <li
              className="flex items-center justify-between gap-2 rounded-lg bg-panel px-2.5 py-1.5 text-sm ring-1 ring-hair"
              key={playerId}
            >
              <span className="font-semibold">{getPlayerName(playerId)}</span>
              <div className="flex gap-1">
                <button
                  className="grid size-6 place-items-center rounded-full bg-panel-2 text-xs ring-1 ring-hair transition-colors hover:bg-hair disabled:opacity-30"
                  disabled={potIndex === 0}
                  onClick={() => onMove(playerId, potIndex, potIndex - 1)}
                  type="button"
                >
                  ←
                </button>
                <button
                  className="grid size-6 place-items-center rounded-full bg-panel-2 text-xs ring-1 ring-hair transition-colors hover:bg-hair disabled:opacity-30"
                  disabled={potIndex === pots.length - 1}
                  onClick={() => onMove(playerId, potIndex, potIndex + 1)}
                  type="button"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

export { PotBoard };
