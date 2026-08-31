'use client';

import { useEffect, useRef } from 'react';

/**
 * Page-wide backdrop in the same whisper-quiet language as the panel
 * landscapes (.d-scape): scattered stars, a far parchment
 * ridge and a near tree-lined ridge, each fixed behind the content and
 * drifting upward at its own pace as the page scrolls.
 *
 * Drift is bound to total scroll progress (amplitude per layer), so layers
 * never run out or reveal gaps regardless of page length. Honors
 * prefers-reduced-motion by simply not moving.
 */

/**
 * Per-layer motion: `ease` px of upward drift delivered smoothly over the
 * first ~two viewports of scrolling (where the eye actually compares
 * layers), plus a small `tail` that keeps drifting with overall progress.
 * Total drift is bounded by ease + tail, so bleeds below cover every case.
 */
const LAYER_MOTION = [
  { ease: 26, tail: 10, direction: -1 },
  { ease: 64, tail: 36, direction: -1 },
  { ease: 118, tail: 52, direction: -1 },
  { ease: 95, tail: 30, direction: 1 },
] as const;

/** Scroll distance (px) over which the eased drift mostly plays out. */
const EASE_DISTANCE = 700;

const STARS: { left: string; top: string; size: number; opacity: number }[] = [
  { left: '6%', top: '12%', size: 2, opacity: 0.5 },
  { left: '13%', top: '34%', size: 1.5, opacity: 0.35 },
  { left: '21%', top: '8%', size: 1.5, opacity: 0.45 },
  { left: '28%', top: '26%', size: 2, opacity: 0.3 },
  { left: '37%', top: '15%', size: 1.5, opacity: 0.5 },
  { left: '44%', top: '38%', size: 1.5, opacity: 0.3 },
  { left: '52%', top: '9%', size: 2, opacity: 0.4 },
  { left: '61%', top: '30%', size: 1.5, opacity: 0.35 },
  { left: '68%', top: '18%', size: 1.5, opacity: 0.5 },
  { left: '74%', top: '40%', size: 2, opacity: 0.3 },
  { left: '87%', top: '32%', size: 1.5, opacity: 0.4 },
  { left: '93%', top: '10%', size: 2, opacity: 0.45 },
  { left: '96%', top: '52%', size: 1.5, opacity: 0.25 },
  { left: '9%', top: '55%', size: 1.5, opacity: 0.25 },
  { left: '33%', top: '58%', size: 1.5, opacity: 0.2 },
  { left: '58%', top: '55%', size: 1.5, opacity: 0.25 },
];

/**
 * Stars over the horizon band that sink toward the ridges as the page
 * scrolls (opposite direction to the mountains) until they set behind them.
 */
const SETTING_STARS: {
  left: string;
  top: string;
  size: number;
  opacity: number;
}[] = [
  { left: '4%', top: '18%', size: 2, opacity: 0.5 },
  { left: '11%', top: '52%', size: 1.5, opacity: 0.4 },
  { left: '18%', top: '30%', size: 2.5, opacity: 0.55 },
  { left: '26%', top: '64%', size: 1.5, opacity: 0.35 },
  { left: '34%', top: '40%', size: 2, opacity: 0.5 },
  { left: '42%', top: '22%', size: 1.5, opacity: 0.4 },
  { left: '50%', top: '58%', size: 2, opacity: 0.45 },
  { left: '57%', top: '34%', size: 1.5, opacity: 0.35 },
  { left: '64%', top: '48%', size: 2.5, opacity: 0.55 },
  { left: '72%', top: '26%', size: 1.5, opacity: 0.4 },
  { left: '79%', top: '60%', size: 2, opacity: 0.5 },
  { left: '86%', top: '38%', size: 1.5, opacity: 0.35 },
  { left: '92%', top: '54%', size: 2, opacity: 0.45 },
  { left: '97%', top: '24%', size: 1.5, opacity: 0.4 },
];

const ParallaxBackground = () => {
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress = window.scrollY / maxScroll;
      const eased = 1 - Math.exp(-window.scrollY / EASE_DISTANCE);
      layerRefs.current.forEach((layer, index) => {
        const motion = LAYER_MOTION[index];
        if (layer && motion) {
          const drift =
            (motion.ease * eased + motion.tail * progress) * motion.direction;
          layer.style.transform = `translate3d(0, ${drift.toFixed(2)}px, 0)`;
        }
      });
    };
    const requestUpdate = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Layer 3 — setting stars: sink toward the horizon, behind the ridges */}
      <div
        className="absolute inset-x-0 top-[32%] bottom-0"
        ref={(node) => {
          layerRefs.current[3] = node;
        }}
      >
        {SETTING_STARS.map((star) => (
          <span
            className="absolute rounded-full bg-[#ece3cd]"
            key={`set-${star.left}-${star.top}`}
            style={{
              height: star.size,
              left: star.left,
              opacity: star.opacity * 0.38,
              top: star.top,
              width: star.size,
            }}
          />
        ))}
      </div>
      {/* Layer 0 — high stars, drifting slowly upward */}
      <div
        className="absolute inset-x-0 top-[-50px] bottom-0"
        ref={(node) => {
          layerRefs.current[0] = node;
        }}
      >
        {STARS.map((star) => (
          <span
            className="absolute rounded-full bg-[#ece3cd]"
            key={`${star.left}-${star.top}`}
            style={{
              height: star.size,
              left: star.left,
              opacity: star.opacity * 0.38,
              top: star.top,
              width: star.size,
            }}
          />
        ))}
      </div>

      {/* Layer 1 — far ridge, parchment whisper */}
      <div
        className="absolute inset-x-0 bottom-[-100px]"
        ref={(node) => {
          layerRefs.current[1] = node;
        }}
      >
        <svg
          aria-hidden="true"
          className="block h-[300px] w-full"
          preserveAspectRatio="none"
          viewBox="0 0 1440 300"
        >
          <path
            d="M0,132 L110,84 L230,120 L360,52 L495,116 L640,66 L790,122 L930,78 L1080,126 L1210,88 L1330,118 L1440,92 V300 H0 Z"
            fill="#ece3cd"
            opacity="0.03"
          />
        </svg>
      </div>

      {/* Layer 2 — near ridge with pines, a shade above the night */}
      <div
        className="absolute inset-x-0 bottom-[-170px]"
        ref={(node) => {
          layerRefs.current[2] = node;
        }}
      >
        <svg
          aria-hidden="true"
          className="block h-[360px] w-full"
          preserveAspectRatio="none"
          viewBox="0 0 1440 340"
        >
          <path
            d="M0,120 L150,74 L290,108 L300,108 L305,90 L311,108 L318,108 L323,94 L329,108 L470,60 L620,104 L630,104 L635,84 L642,104 L780,70 L940,110 L950,110 L955,92 L961,110 L968,110 L973,96 L979,110 L1120,66 L1280,102 L1290,102 L1295,84 L1302,102 L1440,76 V340 H0 Z"
            fill="#121912"
          />
        </svg>
      </div>
    </div>
  );
};

export { ParallaxBackground };
