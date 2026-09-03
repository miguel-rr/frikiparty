import { Sheet } from './sheet';

/**
 * C · Cerco de humedad. Paper that got wet once and dried: the edge is
 * brittle and crumbles in small chips (each chip face shows the pale
 * core), and a few millimetres inside runs the tide line — the wavy brown
 * mark that dissolved lignin leaves at the drying front — with the strip
 * between line and edge slightly yellowed. It is the most recognisable
 * signature of a document that has lived through the centuries, and it
 * needs no fire.
 */
const TideFilter = () => (
  <svg aria-hidden="true" className="absolute size-0" focusable="false">
    <filter
      colorInterpolationFilters="sRGB"
      height="116%"
      id="psh-tide"
      width="116%"
      x="-8%"
      y="-8%"
    >
      <feTurbulence
        baseFrequency="0.008 0.011"
        numOctaves="3"
        result="wave"
        seed="52"
        type="fractalNoise"
      />
      <feDisplacementMap in="SourceGraphic" in2="wave" result="d1" scale="24" />
      <feTurbulence
        baseFrequency="0.1"
        numOctaves="2"
        result="chip"
        seed="14"
        type="fractalNoise"
      />
      <feDisplacementMap in="d1" in2="chip" result="d2" scale="8" />
      <feTurbulence
        baseFrequency="0.6"
        numOctaves="1"
        result="crumb"
        seed="9"
        type="fractalNoise"
      />
      <feDisplacementMap in="d2" in2="crumb" result="d3" scale="3.2" />
      <feComponentTransfer in="d3" result="sheet">
        <feFuncA intercept="-6" slope="18" type="linear" />
      </feComponentTransfer>
      {/* Chip faces: the crumbled edge shows the pale core of the paper */}
      <feMorphology in="sheet" operator="erode" radius="1.8" result="e1" />
      <feComposite in="sheet" in2="e1" operator="out" result="lipA" />
      <feFlood floodColor="#f7eed8" floodOpacity="0.85" result="lipC" />
      <feComposite in="lipC" in2="lipA" operator="in" result="lip" />
      {/* Fine shadow just inside the chips, where the surface layer broke */}
      <feMorphology in="e1" operator="erode" radius="1" result="e2" />
      <feComposite in="e1" in2="e2" operator="out" result="stepA" />
      <feGaussianBlur in="stepA" result="stepB" stdDeviation="0.6" />
      <feFlood floodColor="#5c4020" floodOpacity="0.4" result="stepC" />
      <feComposite in="stepC" in2="stepB" operator="in" result="step" />
      {/* Drying front: distance from the edge, wandered by noise */}
      <feGaussianBlur in="sheet" result="wet" stdDeviation="14" />
      <feTurbulence
        baseFrequency="0.03"
        numOctaves="3"
        result="drift"
        seed="77"
        type="fractalNoise"
      />
      <feComposite
        in="wet"
        in2="drift"
        k2="1"
        k3="0.5"
        k4="-0.25"
        operator="arithmetic"
        result="front"
      />
      <feComponentTransfer in="front" result="t1">
        <feFuncA intercept="-27.6" slope="40" type="linear" />
      </feComponentTransfer>
      <feComponentTransfer in="front" result="t2">
        <feFuncA intercept="-29.6" slope="40" type="linear" />
      </feComponentTransfer>
      {/* The tide line itself */}
      <feComposite in="t1" in2="t2" operator="out" result="tideA0" />
      <feGaussianBlur in="tideA0" result="tideA" stdDeviation="0.9" />
      <feFlood floodColor="#6b4620" floodOpacity="0.5" result="tideC" />
      <feComposite in="tideC" in2="tideA" operator="in" result="tide0" />
      <feComposite in="tide0" in2="sheet" operator="in" result="tide" />
      {/* The strip that was soaked: yellowed and a touch darker */}
      <feComposite in="sheet" in2="t1" operator="out" result="soakA0" />
      <feGaussianBlur in="soakA0" result="soakA" stdDeviation="2" />
      <feFlood floodColor="#8c6430" floodOpacity="0.2" result="soakC" />
      <feComposite in="soakC" in2="soakA" operator="in" result="soak0" />
      <feComposite in="soak0" in2="sheet" operator="in" result="soak" />
      <feMerge>
        <feMergeNode in="sheet" />
        <feMergeNode in="soak" />
        <feMergeNode in="tide" />
        <feMergeNode in="step" />
        <feMergeNode in="lip" />
      </feMerge>
    </filter>
  </svg>
);

const TideSheet = () => (
  <>
    <TideFilter />
    <Sheet filterId="psh-tide" inset="inset-6">
      {/* Foxing: rust-brown freckles near the edges */}
      <span
        className="absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(1.6% 2.2% at 6% 22%, rgba(120,70,30,0.5) 0%, transparent 100%), radial-gradient(1.2% 1.6% at 9% 27%, rgba(120,70,30,0.45) 0%, transparent 100%), radial-gradient(1.8% 2.4% at 94% 40%, rgba(120,70,30,0.45) 0%, transparent 100%), radial-gradient(1.1% 1.5% at 91% 45%, rgba(120,70,30,0.4) 0%, transparent 100%), radial-gradient(1.4% 1.9% at 40% 95%, rgba(120,70,30,0.45) 0%, transparent 100%), radial-gradient(2% 2.6% at 72% 6%, rgba(120,70,30,0.4) 0%, transparent 100%), radial-gradient(1% 1.4% at 75% 9%, rgba(120,70,30,0.4) 0%, transparent 100%), radial-gradient(1.3% 1.8% at 22% 4%, rgba(120,70,30,0.42) 0%, transparent 100%)',
        }}
      />
      {/* The big water stain that caused it all, drying from the corner */}
      <span
        className="absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(42% 36% at 4% 96%, rgba(130,90,40,0.22) 0%, rgba(130,90,40,0.12) 60%, rgba(110,72,30,0.3) 74%, transparent 78%)',
        }}
      />
    </Sheet>
  </>
);

export { TideSheet };
