'use client';

import { useEffect, useRef, useState } from 'react';

const OPACITY = 0.26;
/** Breathing room the full ring keeps from the viewport edges. */
const EDGE_PAD = '14px';
/** Half the ring: w-[min(400px,97vw)] → radius min(200px, 48.5vw). */
const RING_RADIUS = 'min(200px, 48.5vw)';
/** The whole journey rides a touch lower, start and finish alike. */
const DOWN_SHIFT = '22px';

/**
 * Mobile-only backdrop for the bearers: the photographic Ring tracks the
 * WHOLE page scroll, always fully on screen. Born resting just above the
 * bottom edge, it climbs in exact proportion to the scroll and touches its
 * highest point — just under the top edge — only when the page runs out.
 * Both endpoints account for the ring's own radius, so it is never cut.
 */
const RingVeil = () => {
  const frameRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      frameRef.current = null;
      const max =
        Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        ) - window.innerHeight;
      setProgress(
        max > 40 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0,
      );
    };
    const onScroll = () => {
      frameRef.current ??= requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 lg:hidden"
    >
      {/* biome-ignore lint/performance/noImgElement: decorative local asset, no next/image needed */}
      <img
        alt=""
        className="fixed left-1/2 w-[min(400px,97vw)] max-w-none -translate-x-1/2 -translate-y-1/2 mix-blend-screen [mask-image:radial-gradient(circle,black_48%,transparent_70%)]"
        src="/icon-512.png"
        style={{
          opacity: OPACITY,
          // Linear blend between the lowest and highest fully-visible
          // centers; only the scroll's end reaches the top position.
          top: `calc((100vh - ${EDGE_PAD} - ${RING_RADIUS}) * ${(1 - progress).toFixed(4)} + (${EDGE_PAD} + ${RING_RADIUS}) * ${progress.toFixed(4)} + ${DOWN_SHIFT})`,
        }}
      />
    </div>
  );
};

export { RingVeil };
