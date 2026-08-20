'use client';

type StepperInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

const StepperInput = ({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
}: StepperInputProps) => {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-panel-2 px-4 py-3 ring-1 ring-hair">
      <span className="font-semibold text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          className="grid size-8 place-items-center rounded-full bg-panel font-bold ring-1 ring-hair transition-colors hover:bg-hair disabled:opacity-40"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          type="button"
        >
          −
        </button>
        <span className="w-8 text-center font-bold font-mono">{value}</span>
        <button
          className="grid size-8 place-items-center rounded-full bg-panel font-bold ring-1 ring-hair transition-colors hover:bg-hair disabled:opacity-40"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
};

export { StepperInput };
