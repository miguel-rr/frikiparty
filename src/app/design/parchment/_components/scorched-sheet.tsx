import { Sheet } from './sheet';

/**
 * C · Cerco quemado. Fire eats paper in bands, and each band is a
 * different material: a crisp near-black char at the very edge, a thin
 * brittle brown line behind it, then a wide amber halo where the heat
 * stained the sheet without burning it. The filter derives every band
 * from the sheet's own alpha (blurred, mixed with noise, thresholded), so
 * the widths vary along the edge the way real scorching does, and two
 * burn-through holes get the same treatment for free because they are cut
 * from the sheet's mask before the filter runs.
 */
const ScorchedFilter = () => (
  <svg aria-hidden="true" className="absolute size-0" focusable="false">
    <filter
      colorInterpolationFilters="sRGB"
      height="120%"
      id="psh-burn"
      width="120%"
      x="-10%"
      y="-10%"
    >
      <feTurbulence
        baseFrequency="0.006 0.008"
        numOctaves="3"
        result="bite"
        seed="21"
        type="fractalNoise"
      />
      <feDisplacementMap in="SourceGraphic" in2="bite" result="d1" scale="44" />
      <feTurbulence
        baseFrequency="0.045"
        numOctaves="2"
        result="nibble"
        seed="2"
        type="fractalNoise"
      />
      <feDisplacementMap in="d1" in2="nibble" result="d2" scale="10" />
      <feTurbulence
        baseFrequency="0.3"
        numOctaves="1"
        result="crisp"
        seed="6"
        type="fractalNoise"
      />
      <feDisplacementMap in="d2" in2="crisp" result="d3" scale="3" />
      <feComponentTransfer in="d3" result="sheet">
        <feFuncA intercept="-6" slope="18" type="linear" />
      </feComponentTransfer>
      {/* Heat field: distance from the edge, roughened by noise */}
      <feGaussianBlur in="sheet" result="heat" stdDeviation="11" />
      <feTurbulence
        baseFrequency="0.05"
        numOctaves="3"
        result="ash"
        seed="44"
        type="fractalNoise"
      />
      <feComposite
        in="heat"
        in2="ash"
        k2="1"
        k3="0.5"
        k4="-0.25"
        operator="arithmetic"
        result="field"
      />
      <feComponentTransfer in="field" result="t1">
        <feFuncA intercept="-24.8" slope="40" type="linear" />
      </feComponentTransfer>
      <feComponentTransfer in="field" result="t2">
        <feFuncA intercept="-29.2" slope="40" type="linear" />
      </feComponentTransfer>
      <feComponentTransfer in="field" result="t3">
        <feFuncA intercept="-33.6" slope="40" type="linear" />
      </feComponentTransfer>
      {/* Char */}
      <feComposite in="sheet" in2="t1" operator="out" result="charA" />
      <feFlood floodColor="#0e0906" floodOpacity="1" result="charC" />
      <feComposite in="charC" in2="charA" operator="in" result="char" />
      {/* Brittle brown line */}
      <feComposite in="t1" in2="t2" operator="out" result="brownA0" />
      <feComposite in="brownA0" in2="sheet" operator="in" result="brownA" />
      <feFlood floodColor="#3a1f0e" floodOpacity="0.9" result="brownC" />
      <feComposite in="brownC" in2="brownA" operator="in" result="brown" />
      {/* Amber heat stain */}
      <feComposite in="t2" in2="t3" operator="out" result="amberA0" />
      <feComposite in="amberA0" in2="sheet" operator="in" result="amberA1" />
      <feGaussianBlur in="amberA1" result="amberA" stdDeviation="2.5" />
      <feFlood floodColor="#9c5220" floodOpacity="0.55" result="amberC" />
      <feComposite in="amberC" in2="amberA" operator="in" result="amber0" />
      <feComposite in="amber0" in2="sheet" operator="in" result="amber" />
      {/* Crumbling ash beyond the edge */}
      <feMorphology in="sheet" operator="dilate" radius="1.6" result="fat" />
      <feTurbulence
        baseFrequency="0.8"
        numOctaves="1"
        result="flake"
        seed="13"
        type="fractalNoise"
      />
      <feDisplacementMap in="fat" in2="flake" result="fatF" scale="6" />
      <feComposite in="fatF" in2="sheet" operator="out" result="crumbA" />
      <feFlood floodColor="#1a110b" floodOpacity="0.6" result="crumbC" />
      <feComposite in="crumbC" in2="crumbA" operator="in" result="crumb" />
      {/* Ember gloss on the char's inner ridge */}
      <feMorphology in="charA" operator="erode" radius="1" result="charIn" />
      <feComposite in="charA" in2="charIn" operator="out" result="ridgeA" />
      <feOffset dx="0" dy="-0.8" in="ridgeA" result="ridgeUp" />
      <feComposite in="ridgeUp" in2="charA" operator="in" result="ridgeA2" />
      <feFlood floodColor="#6b3a1a" floodOpacity="0.5" result="ridgeC" />
      <feComposite in="ridgeC" in2="ridgeA2" operator="in" result="ridge" />
      <feMerge>
        <feMergeNode in="crumb" />
        <feMergeNode in="sheet" />
        <feMergeNode in="amber" />
        <feMergeNode in="brown" />
        <feMergeNode in="char" />
        <feMergeNode in="ridge" />
      </feMerge>
    </filter>
  </svg>
);

/** Two burn-through holes in the margins, cut from the sheet's mask. */
const HOLES =
  'radial-gradient(circle at 91% 12%, transparent 0 15px, #000 16px), radial-gradient(circle at 4% 93%, transparent 0 9px, #000 10px), radial-gradient(circle at 97.5% 64%, transparent 0 4px, #000 5px)';

const ScorchedSheet = () => (
  <>
    <ScorchedFilter />
    <Sheet filterId="psh-burn" inset="inset-7" mask={HOLES}>
      {/* Heat blooms: the sheet browned where the flame lingered */}
      <span
        className="absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(28% 24% at 100% 10%, rgba(150,84,30,0.5) 0%, rgba(150,84,30,0.18) 45%, transparent 72%), radial-gradient(22% 20% at 0% 90%, rgba(150,84,30,0.45) 0%, transparent 70%), radial-gradient(18% 14% at 48% 102%, rgba(120,66,24,0.4) 0%, transparent 70%), radial-gradient(14% 22% at 0% 30%, rgba(120,66,24,0.28) 0%, transparent 70%), radial-gradient(20% 16% at 100% 74%, rgba(150,84,30,0.4) 0%, transparent 70%)',
        }}
      />
      {/* Soot smudges */}
      <span
        className="absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(10% 8% at 88% 20%, rgba(40,28,18,0.35) 0%, transparent 70%), radial-gradient(7% 6% at 12% 78%, rgba(40,28,18,0.3) 0%, transparent 70%), radial-gradient(9% 5% at 60% 98%, rgba(40,28,18,0.25) 0%, transparent 70%)',
        }}
      />
    </Sheet>
  </>
);

export { ScorchedSheet };
