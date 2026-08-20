'use client';

type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
};

const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => (
      <button
        className={`rounded-full px-4 py-2 font-semibold text-sm ring-1 transition-colors ${
          value === option.value
            ? 'bg-amber text-ground ring-amber'
            : 'bg-panel-2 text-ink ring-hair hover:bg-hair'
        }`}
        key={option.value}
        onClick={() => onChange(option.value)}
        type="button"
      >
        {option.label}
      </button>
    ))}
  </div>
);

export { SegmentedControl };
