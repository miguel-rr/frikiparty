'use client';

type PlayerChipProps = {
  name: string;
  subtitle?: string;
};

const PlayerChip = ({ name, subtitle }: PlayerChipProps) => {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-panel-2 px-2.5 py-1.5 ring-1 ring-hair">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber font-bold font-mono text-ground text-xs">
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-sm">{name}</p>
        {subtitle ? (
          <p className="truncate font-mono text-[0.6rem] text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export { PlayerChip };
