'use client';

import { useEffect, useState } from 'react';

import { type Remaining, remainingTo } from '@/lib/countdown';

/**
 * Ticks once per second, client-only: null until mounted so the static
 * markup never mismatches a moving clock.
 */
const useCountdown = (targetIso: string | null): Remaining | null => {
  const [left, setLeft] = useState<Remaining | null>(null);
  useEffect(() => {
    if (!targetIso) {
      return;
    }
    const target = new Date(targetIso);
    setLeft(remainingTo(target));
    const timer = setInterval(() => setLeft(remainingTo(target)), 1000);
    return () => clearInterval(timer);
  }, [targetIso]);
  return left;
};

export { useCountdown };
