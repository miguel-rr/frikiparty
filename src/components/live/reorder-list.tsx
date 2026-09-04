'use client';

import { type ReactNode, useState } from 'react';

type ReorderListProps = {
  ids: string[];
  onChange: (next: string[]) => void;
  /** What each row shows besides its position and the arrows. */
  renderItem: (id: string, index: number) => ReactNode;
  disabled?: boolean;
};

/**
 * An ordered list the person rearranges: drag a row onto another, or use
 * the arrows (which also make it usable on a phone with one thumb).
 * Position numbers start at 1.
 */
const ReorderList = ({
  ids,
  onChange,
  renderItem,
  disabled,
}: ReorderListProps) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [item] = next.splice(from, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <ol className="flex flex-col gap-1.5">
      {ids.map((id, index) => (
        <li
          className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
            over === id && dragging !== id
              ? 'border-(--gold) bg-(--gold)/8'
              : 'border-(--hair) bg-(--panel-2)'
          } ${dragging === id ? 'opacity-50' : ''}`}
          draggable={!disabled}
          key={id}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          onDragOver={(event) => {
            if (disabled || !dragging) return;
            event.preventDefault();
            setOver(id);
          }}
          onDragStart={() => setDragging(id)}
          onDrop={(event) => {
            event.preventDefault();
            if (!dragging) return;
            move(ids.indexOf(dragging), index);
            setDragging(null);
            setOver(null);
          }}
        >
          <span className="w-7 shrink-0 text-right font-bold font-mono text-(--gold) text-sm">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">{renderItem(id, index)}</div>
          {disabled ? null : (
            <div className="flex shrink-0 gap-1">
              <button
                aria-label="Subir"
                className="grid size-7 place-items-center rounded-full border border-(--hair) bg-(--panel) text-xs transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi) disabled:opacity-30"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                type="button"
              >
                ↑
              </button>
              <button
                aria-label="Bajar"
                className="grid size-7 place-items-center rounded-full border border-(--hair) bg-(--panel) text-xs transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi) disabled:opacity-30"
                disabled={index === ids.length - 1}
                onClick={() => move(index, index + 1)}
                type="button"
              >
                ↓
              </button>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
};

export { ReorderList };
