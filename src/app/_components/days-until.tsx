'use client';

import { openingInstant, remainingTo, two, unitLabel } from '@/lib/countdown';
import { useCountdown } from '@/lib/use-countdown';

/**
 * The hero's countdown, counted exactly as the Doors of Durin count: until
 * 14:00 Madrid time on day one, by the visitor's clock. Four segments
 * (days, hours, minutes, seconds), each with its
 * own label so a reading like "69 : 00 : 38 : 22" never looks like a
 * stopwatch at zero. The server paints the whole days first so nothing
 * pops in; the ticking segments stay masked until mounted (the static
 * markup is stale by then), and the whole block withdraws once the door
 * is open.
 */
const DaysUntil = ({ startsAt }: { startsAt: string }) => {
  const target = openingInstant(startsAt);
  const live = useCountdown(target);
  const left = live ?? remainingTo(new Date(target));
  const open =
    left.days === 0 &&
    left.hours === 0 &&
    left.minutes === 0 &&
    left.seconds === 0;
  if (open) {
    return null;
  }
  const mask = (value: number) => (live ? two(value) : '——');
  const segments = [
    { unit: 'days', value: String(left.days) },
    { unit: 'hours', value: mask(left.hours) },
    { unit: 'minutes', value: mask(left.minutes) },
    { unit: 'seconds', value: mask(left.seconds) },
  ] as const;
  return (
    <div className="flex flex-col items-center gap-1 lg:gap-1.5">
      <div className="flex items-start">
        {segments.map((segment, index) => (
          <div className="flex items-start" key={segment.unit}>
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="d-display d-gold-text px-1 font-black text-2xl leading-none opacity-50 lg:px-1.5 lg:text-3xl"
              >
                :
              </span>
            ) : null}
            <div className="flex flex-col items-center gap-0.5">
              {/* One fixed-width cell per glyph: the display face has no
                  tabular figures, so without this the row would shift as
                  the digits change. */}
              <span className="d-display d-gold-text flex font-black text-2xl leading-none lg:text-3xl">
                {Array.from(segment.value).map((glyph, position) => (
                  <span
                    className="inline-block w-[0.78em] text-center"
                    // biome-ignore lint/suspicious/noArrayIndexKey: glyph cells are positional by nature
                    key={position}
                  >
                    {glyph}
                  </span>
                ))}
              </span>
              <span className="font-bold font-mono text-(--faded) text-[0.55rem] uppercase tracking-xl lg:text-3xs">
                {unitLabel(
                  segment.unit,
                  live || segment.unit === 'days' ? left[segment.unit] : null,
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { DaysUntil };
