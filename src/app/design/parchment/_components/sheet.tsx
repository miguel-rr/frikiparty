import type { ReactNode } from 'react';

import { WaxSeal } from '@/components/players/bio-parchment';

import { Ink, MOTTLE, NOISE } from './ink';

/**
 * The live parchment, untouched, minus its contour: same ground gradient,
 * vellum mottle, grain, age stains, old creases, ink and wax seal. Each
 * proposal supplies only the SVG filter that carves and lights the edge,
 * plus any edge-specific layer (heat blooms, tide marks) as children.
 *
 * The wax seal uses the `#dsn-bio-wax` filter that the live component
 * defines; the reference sheet at the top of the page provides it.
 */
const Sheet = ({
  children,
  filterId,
  inset = 'inset-5',
  mask,
}: {
  children?: ReactNode;
  filterId: string;
  inset?: string;
  mask?: string;
}) => (
  <div className="mx-auto w-full max-w-2xl">
    <div className="relative px-4 py-5">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          filter: `url(#${filterId}) drop-shadow(0 1px 1px rgba(0,0,0,0.5)) drop-shadow(0 16px 26px rgba(0,0,0,0.55)) drop-shadow(0 3px 6px rgba(0,0,0,0.4))`,
        }}
      >
        <div
          className={`absolute ${inset}`}
          style={{
            backgroundImage:
              'radial-gradient(120% 95% at 48% 4%, #f2e7cb 0%, #e9dab2 42%, #dcc795 78%, #c8ad7a 100%)',
            ...(mask
              ? {
                  maskImage: mask,
                  maskComposite: 'intersect',
                  WebkitMaskImage: mask,
                  WebkitMaskComposite: 'source-in',
                }
              : {}),
          }}
        >
          <span
            className="absolute inset-0 opacity-30 mix-blend-multiply"
            style={{ backgroundImage: MOTTLE, backgroundSize: '420px 420px' }}
          />
          <span
            className="absolute inset-0 opacity-35 mix-blend-multiply"
            style={{ backgroundImage: NOISE }}
          />
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(34% 26% at 14% 86%, rgba(124,92,44,0.2) 0%, transparent 68%), radial-gradient(26% 20% at 88% 10%, rgba(124,92,44,0.16) 0%, transparent 70%), radial-gradient(18% 13% at 76% 78%, rgba(96,66,28,0.14) 0%, transparent 70%), radial-gradient(12% 9% at 30% 12%, rgba(96,66,28,0.1) 0%, transparent 70%)',
            }}
          />
          <span className="absolute inset-x-0 top-[38%] h-px bg-[#7a5a2b] opacity-25" />
          <span className="absolute inset-x-0 top-[calc(38%+1px)] h-px bg-[#fff3d8] opacity-40" />
          <span className="absolute inset-y-0 left-[62%] w-px bg-[#7a5a2b] opacity-15" />
          {children}
        </div>
      </div>
      <Ink className="px-7 py-9 pb-16 sm:px-11 sm:py-10 sm:pb-16" />
      <WaxSeal />
    </div>
  </div>
);

export { Sheet };
