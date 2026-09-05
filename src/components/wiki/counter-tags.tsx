import { COUNTER_LABELS } from '@/lib/wiki/labels';
import type { CounterTag } from '@/lib/wiki/types';

/** "Fuerte contra" / "débil contra" chips, green and ember. */
const CounterTags = ({
  strong,
  weak,
}: {
  strong: CounterTag[];
  weak: CounterTag[];
}) => {
  if (strong.length === 0 && weak.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-xs">
      {strong.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-(--moss) text-3xs uppercase tracking-wider">
            fuerte
          </span>
          {strong.map((t) => (
            <span
              className="rounded-full border border-(--moss)/40 px-2 py-0.5 text-(--parchment)/85"
              key={t}
            >
              {COUNTER_LABELS[t]}
            </span>
          ))}
        </span>
      ) : null}
      {weak.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-(--ember) text-3xs uppercase tracking-wider">
            débil
          </span>
          {weak.map((t) => (
            <span
              className="rounded-full border border-(--ember)/40 px-2 py-0.5 text-(--parchment)/85"
              key={t}
            >
              {COUNTER_LABELS[t]}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
};

export { CounterTags };
