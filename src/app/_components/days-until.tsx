'use client';

import { openingInstant, remainingTo } from '@/lib/countdown';
import { useCountdown } from '@/lib/use-countdown';

/**
 * "Faltan N días" in the hero, counted exactly as the Doors of Durin count:
 * whole days left until noon of day one, by the visitor's clock. The
 * server paints its own reading first so nothing pops in; once mounted the
 * visitor's clock takes over, and the line withdraws on the final day.
 */
const DaysUntil = ({
  className,
  startsAt,
}: {
  className: string;
  startsAt: string;
}) => {
  const target = openingInstant(startsAt);
  const days = useCountdown(target)?.days ?? remainingTo(new Date(target)).days;
  if (days <= 0) {
    return null;
  }
  return <span className={className}>Faltan {days} días</span>;
};

export { DaysUntil };
