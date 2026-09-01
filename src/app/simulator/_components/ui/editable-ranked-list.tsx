'use client';

import type { SimulatorPlayer } from '@/lib/simulator/types';

type EditableRankedListProps = {
  playerIds: string[];
  players: SimulatorPlayer[];
  onChange: (next: string[]) => void;
};

const EditableRankedList = ({
  playerIds,
  players,
  onChange,
}: EditableRankedListProps) => {
  const getPlayerName = (id: string) =>
    players.find((player) => player.id === id)?.name ?? id;

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= playerIds.length) return;
    const next = [...playerIds];
    [next[index], next[target]] = [
      next[target] as string,
      next[index] as string,
    ];
    onChange(next);
  };

  return (
    <ol className="flex flex-col gap-1.5">
      {playerIds.map((playerId, index) => {
        return (
          <li
            className="flex items-center gap-3 rounded-lg bg-(--panel-2) px-3 py-2 ring-(--hair) ring-1"
            key={playerId}
          >
            <span className="w-6 shrink-0 font-mono text-(--faded) text-xs">
              {index + 1}
            </span>
            <span className="flex-1 font-semibold text-sm">
              {getPlayerName(playerId)}
            </span>
            <div className="flex gap-1">
              <button
                className="grid size-6 place-items-center rounded-full bg-(--panel) font-bold text-xs ring-(--hair) ring-1 transition-colors hover:bg-(--hair) disabled:opacity-30"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                type="button"
              >
                ↑
              </button>
              <button
                className="grid size-6 place-items-center rounded-full bg-(--panel) font-bold text-xs ring-(--hair) ring-1 transition-colors hover:bg-(--hair) disabled:opacity-30"
                disabled={index === playerIds.length - 1}
                onClick={() => move(index, 1)}
                type="button"
              >
                ↓
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export { EditableRankedList };
