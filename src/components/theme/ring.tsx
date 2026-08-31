import type { ReactNode } from 'react';

/**
 * The One Ring, the site's signature: rotating curved inscription around a
 * center slot. `gold` is the living, announced-edition tone; `ash` is the
 * resting state (silvered, dimmed) for when no edition is on the horizon.
 */

const INSCRIPTION =
  'UNA EDICIÓN PARA GOBERNARLAS A TODAS · UNA EDICIÓN PARA ENCONTRARLOS · UNA EDICIÓN PARA ATRAERLOS A TODOS Y EN LAS TINIEBLAS ATARLOS · ';

const TONES = {
  ash: {
    id: 'ring-tone-ash',
    ringOpacity: 0.55,
    stops: ['#d8dee4', '#a8b4c0', '#5c6874'],
    text: 'var(--silver)',
    textOpacity: 0.6,
  },
  gold: {
    id: 'ring-tone-gold',
    ringOpacity: 1,
    stops: ['#f0d48a', '#c9a557', '#8f6b2e'],
    text: 'var(--gold)',
    textOpacity: 1,
  },
} as const;

const TheRing = ({
  children,
  className = '',
  title,
  tone = 'gold',
}: {
  children: ReactNode;
  className?: string;
  title: string;
  tone?: keyof typeof TONES;
}) => {
  const palette = TONES[tone];
  return (
    <div className={`d-ring-wrap relative ${className}`}>
      <svg className="block w-full" role="img" viewBox="0 0 320 320">
        <title>{title}</title>
        <defs>
          <linearGradient id={palette.id} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={palette.stops[0]} />
            <stop offset="0.5" stopColor={palette.stops[1]} />
            <stop offset="1" stopColor={palette.stops[2]} />
          </linearGradient>
          <path
            d="M160,26 a134,134 0 1,1 -0.02,0"
            fill="none"
            id={`${palette.id}-text-path`}
          />
        </defs>
        <circle
          cx="160"
          cy="160"
          fill="none"
          opacity={palette.ringOpacity}
          r="152"
          stroke={`url(#${palette.id})`}
          strokeWidth="7"
        />
        <circle
          cx="160"
          cy="160"
          fill="none"
          opacity="0.5"
          r="116"
          stroke="var(--hair-gold)"
          strokeWidth="1"
        />
        <g className="d-ring-rotor">
          <text
            fill={palette.text}
            fontFamily="var(--font-cinzel), Georgia, serif"
            fontSize="12.5"
            fontWeight="700"
            letterSpacing="2"
            opacity={palette.textOpacity}
          >
            <textPath
              href={`#${palette.id}-text-path`}
              lengthAdjust="spacingAndGlyphs"
              textLength="838"
            >
              {INSCRIPTION}
            </textPath>
          </text>
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 lg:gap-3">
        {children}
      </div>
    </div>
  );
};

export { TheRing };
