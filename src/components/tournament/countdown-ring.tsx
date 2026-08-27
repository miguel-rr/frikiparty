'use client';

import { useEffect, useState } from 'react';

type CountdownRingProps = {
  endsAt: number | null;
  durationMs: number;
  label?: string;
};

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CountdownRing = ({ endsAt, durationMs, label }: CountdownRingProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0;
  const fraction = durationMs > 0 ? remainingMs / durationMs : 0;

  return (
    <div className="flex items-center gap-2">
      <svg height="52" viewBox="0 0 52 52" width="52">
        <title>{label ?? 'Tiempo restante'}</title>
        <circle
          cx="26"
          cy="26"
          fill="none"
          r={RADIUS}
          stroke="var(--color-hair)"
          strokeWidth="4"
        />
        <circle
          cx="26"
          cy="26"
          fill="none"
          r={RADIUS}
          stroke="var(--color-amber)"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          strokeLinecap="round"
          strokeWidth="4"
          transform="rotate(-90 26 26)"
        />
      </svg>
      <div>
        {label ? (
          <p className="font-mono text-[0.58rem] text-muted uppercase tracking-widest">
            {label}
          </p>
        ) : null}
        <p className="font-bold font-mono text-lg">
          {(remainingMs / 1000).toFixed(1)}s
        </p>
      </div>
    </div>
  );
};

export { CountdownRing };
