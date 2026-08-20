'use client';

import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';

type EditableRankedListProps = {
  playerIds: string[];
  onChange: (next: string[]) => void;
};

const getPlayer = (id: string) =>
  MOCK_PLAYERS.find((player) => player.id === id);

const EditableRankedList = ({
  playerIds,
  onChange,
}: EditableRankedListProps) => {
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
        const player = getPlayer(playerId);
        return (
          <li
            className="flex items-center gap-3 rounded-lg bg-panel-2 px-3 py-2 ring-1 ring-hair"
            key={playerId}
          >
            <span className="w-6 shrink-0 font-mono text-muted text-xs">
              {index + 1}
            </span>
            <span className="flex-1 font-semibold text-sm">
              {player?.name ?? playerId}
            </span>
            <span className="font-mono text-[0.62rem] text-muted">
              {player?.rings ?? 0} anillos · {player?.individualRings ?? 0}{' '}
              indiv. · {player?.editionsPlayed ?? 0} ed.
            </span>
            <div className="flex gap-1">
              <button
                className="grid size-6 place-items-center rounded-full bg-panel font-bold text-xs ring-1 ring-hair transition-colors hover:bg-hair disabled:opacity-30"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                type="button"
              >
                ↑
              </button>
              <button
                className="grid size-6 place-items-center rounded-full bg-panel font-bold text-xs ring-1 ring-hair transition-colors hover:bg-hair disabled:opacity-30"
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
