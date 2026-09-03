import { Sheet } from './sheet';

/**
 * D · Borde de barba. The natural edge of a handmade sheet: no tear, no
 * fire. The vellum thins toward the rim, so the last few pixels turn
 * translucent and the dark ground shows through; the edge itself is a
 * pale fringe of loose fibre, lit from the upper left like the thickness
 * of a real sheet. The silhouette is a long, slow undulation — the
 * gentlest of the four, and the one that trusts the texture the most.
 */
const DeckleFilter = () => (
  <svg aria-hidden="true" className="absolute size-0" focusable="false">
    <filter
      colorInterpolationFilters="sRGB"
      height="112%"
      id="psh-deckle"
      width="112%"
      x="-6%"
      y="-6%"
    >
      <feTurbulence
        baseFrequency="0.004 0.007"
        numOctaves="2"
        result="swell"
        seed="61"
        type="fractalNoise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="swell"
        result="d1"
        scale="18"
      />
      <feTurbulence
        baseFrequency="0.09"
        numOctaves="2"
        result="ripple"
        seed="19"
        type="fractalNoise"
      />
      <feDisplacementMap in="d1" in2="ripple" result="d2" scale="3" />
      <feTurbulence
        baseFrequency="0.5"
        numOctaves="1"
        result="fibre"
        seed="7"
        type="fractalNoise"
      />
      <feDisplacementMap in="d2" in2="fibre" result="d3" scale="1.8" />
      <feComponentTransfer in="d3" result="solid">
        <feFuncA intercept="-6" slope="18" type="linear" />
      </feComponentTransfer>
      {/* Thinning: alpha fades over the last ~6px so the ground shows through */}
      <feGaussianBlur in="solid" result="thin" stdDeviation="2.6" />
      <feComposite in="solid" in2="thin" operator="in" result="sheet" />
      {/* Loose fibre fringe, pale, riding the rim */}
      <feMorphology in="solid" operator="erode" radius="2.2" result="e1" />
      <feComposite in="solid" in2="e1" operator="out" result="fringeA0" />
      <feTurbulence
        baseFrequency="0.4"
        numOctaves="1"
        result="loose"
        seed="23"
        type="fractalNoise"
      />
      <feDisplacementMap in="fringeA0" in2="loose" result="fringeA" scale="3" />
      <feFlood floodColor="#f6ecd4" floodOpacity="0.7" result="fringeC" />
      <feComposite in="fringeC" in2="fringeA" operator="in" result="fringe" />
      {/* Thickness lit from the upper left: bright lip facing the light */}
      <feMorphology in="solid" operator="erode" radius="1" result="core" />
      <feOffset dx="1.1" dy="1.2" in="core" result="coreSE" />
      <feComposite in="solid" in2="coreSE" operator="out" result="lipA" />
      <feFlood floodColor="#fff8e6" floodOpacity="0.9" result="lipC" />
      <feComposite in="lipC" in2="lipA" operator="in" result="lipLight" />
      {/* …and a shaded lip on the sides facing away */}
      <feOffset dx="-1.2" dy="-1.3" in="core" result="coreNW" />
      <feComposite in="solid" in2="coreNW" operator="out" result="lipD0" />
      <feGaussianBlur in="lipD0" result="lipD1" stdDeviation="0.5" />
      <feFlood floodColor="#4a3316" floodOpacity="0.5" result="lipDC" />
      <feComposite in="lipDC" in2="lipD1" operator="in" result="lipD2" />
      <feComposite in="lipD2" in2="solid" operator="in" result="lipDark" />
      <feMerge>
        <feMergeNode in="sheet" />
        <feMergeNode in="fringe" />
        <feMergeNode in="lipDark" />
        <feMergeNode in="lipLight" />
      </feMerge>
    </filter>
  </svg>
);

const DeckleSheet = () => (
  <>
    <DeckleFilter />
    <Sheet filterId="psh-deckle" inset="inset-5">
      {/* Ambient occlusion: the sheet darkens gently toward every edge */}
      <span className="absolute inset-0 shadow-[inset_0_0_30px_8px_rgba(96,64,24,0.2)]" />
    </Sheet>
  </>
);

export { DeckleSheet };
