import { Sheet } from './sheet';

/**
 * B · Chamuscado leve. The same fire, but it only licked the sheet: no
 * char, no holes. The edge keeps a gentle bite, a thin dark-brown rim
 * where the fibres toasted, and a wide amber halo that fades into the
 * vellum. Quieter than the full scorch; the parchment reads as rescued
 * from the hearth rather than pulled out of it.
 */
const SingedFilter = () => (
  <svg aria-hidden="true" className="absolute size-0" focusable="false">
    <filter
      colorInterpolationFilters="sRGB"
      height="116%"
      id="psh-singe"
      width="116%"
      x="-8%"
      y="-8%"
    >
      <feTurbulence
        baseFrequency="0.007 0.01"
        numOctaves="3"
        result="bite"
        seed="33"
        type="fractalNoise"
      />
      <feDisplacementMap in="SourceGraphic" in2="bite" result="d1" scale="26" />
      <feTurbulence
        baseFrequency="0.06"
        numOctaves="2"
        result="nibble"
        seed="12"
        type="fractalNoise"
      />
      <feDisplacementMap in="d1" in2="nibble" result="d2" scale="7" />
      <feTurbulence
        baseFrequency="0.35"
        numOctaves="1"
        result="crisp"
        seed="6"
        type="fractalNoise"
      />
      <feDisplacementMap in="d2" in2="crisp" result="d3" scale="2.5" />
      <feComponentTransfer in="d3" result="sheet">
        <feFuncA intercept="-6" slope="18" type="linear" />
      </feComponentTransfer>
      {/* Heat field roughened by noise, so the halo breathes along the edge */}
      <feGaussianBlur in="sheet" result="heat" stdDeviation="12" />
      <feTurbulence
        baseFrequency="0.045"
        numOctaves="3"
        result="ash"
        seed="41"
        type="fractalNoise"
      />
      <feComposite
        in="heat"
        in2="ash"
        k2="1"
        k3="0.45"
        k4="-0.22"
        operator="arithmetic"
        result="field"
      />
      <feComponentTransfer in="field" result="t1">
        <feFuncA intercept="-27.2" slope="40" type="linear" />
      </feComponentTransfer>
      <feComponentTransfer in="field" result="t2">
        <feFuncA intercept="-33.2" slope="40" type="linear" />
      </feComponentTransfer>
      {/* Toasted rim: the edge fibres, 1–2px, dark brown */}
      <feMorphology in="sheet" operator="erode" radius="1.4" result="e1" />
      <feComposite in="sheet" in2="e1" operator="out" result="rimA" />
      <feFlood floodColor="#2c1608" floodOpacity="0.85" result="rimC" />
      <feComposite in="rimC" in2="rimA" operator="in" result="rim" />
      {/* Brown band */}
      <feComposite in="sheet" in2="t1" operator="out" result="brownA0" />
      <feGaussianBlur in="brownA0" result="brownA" stdDeviation="1.2" />
      <feFlood floodColor="#5a2f12" floodOpacity="0.55" result="brownC" />
      <feComposite in="brownC" in2="brownA" operator="in" result="brown0" />
      <feComposite in="brown0" in2="sheet" operator="in" result="brown" />
      {/* Amber halo */}
      <feComposite in="t1" in2="t2" operator="out" result="amberA0" />
      <feGaussianBlur in="amberA0" result="amberA" stdDeviation="4" />
      <feFlood floodColor="#a4611f" floodOpacity="0.42" result="amberC" />
      <feComposite in="amberC" in2="amberA" operator="in" result="amber0" />
      <feComposite in="amber0" in2="sheet" operator="in" result="amber" />
      <feMerge>
        <feMergeNode in="sheet" />
        <feMergeNode in="amber" />
        <feMergeNode in="brown" />
        <feMergeNode in="rim" />
      </feMerge>
    </filter>
  </svg>
);

const SingedSheet = () => (
  <>
    <SingedFilter />
    <Sheet filterId="psh-singe" inset="inset-6">
      {/* Where the flame lingered longest: two corners browned deeper */}
      <span
        className="absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(26% 22% at 100% 100%, rgba(140,78,26,0.4) 0%, rgba(140,78,26,0.14) 48%, transparent 72%), radial-gradient(20% 18% at 0% 0%, rgba(140,78,26,0.34) 0%, transparent 70%), radial-gradient(14% 10% at 46% 0%, rgba(120,66,24,0.22) 0%, transparent 70%)',
        }}
      />
    </Sheet>
  </>
);

export { SingedSheet };
