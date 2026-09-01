'use client';

import { btn } from '@/components/theme/primitives';

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
        className={`${
          value === option.value ? btn.primary : btn.secondary
        } px-4 py-1.5 text-sm`}
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
