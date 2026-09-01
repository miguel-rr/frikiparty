'use client';

type PlayerChipProps = {
  name: string;
  subtitle?: string;
};

const PlayerChip = ({ name, subtitle }: PlayerChipProps) => {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-(--panel-2) px-2.5 py-1.5 ring-(--hair) ring-1">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--gold) font-bold font-mono text-[#211803] text-xs">
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-sm">{name}</p>
        {subtitle ? (
          <p className="truncate font-mono text-(--faded) text-[0.6rem]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export { PlayerChip };
