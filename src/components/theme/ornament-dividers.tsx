/**
 * Data-free ornamental thresholds, speaking the site's two metal tongues:
 * gold for the One Ring flanked by elvish tendrils (section threshold),
 * ithildin silver for the lone star that announces the solitaire.
 */

const GOLD = '#c9a557';
const GOLD_HI = '#f0d9a4';
const GOLD_DIM = '#8a6d33';
const SILVER = '#aeb9c2';
const SILVER_HI = '#dce6ee';

const starPoints = (cx: number, cy: number, r: number, inner = 0.42) =>
  Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI / 4) * i;
    const radius = i % 2 === 0 ? r : r * inner;
    return `${(cx + radius * Math.sin(angle)).toFixed(2)},${(cy - radius * Math.cos(angle)).toFixed(2)}`;
  }).join(' ');

const diamondPoints = (cx: number, cy: number, r: number) =>
  `${cx},${cy - r} ${cx + r * 0.55},${cy} ${cx},${cy + r} ${cx - r * 0.55},${cy}`;

/** Half of the gold threshold: fading hairline, gem, tendril and leaf. */
const GoldFlank = () => (
  <g>
    <path d="M24 24 H182" stroke="url(#dsn-orn-gfade)" strokeWidth="1" />
    <polygon fill={GOLD} opacity="0.85" points={diamondPoints(188, 24, 4.4)} />
    <path
      d="M194 24 C206 24 207 14.5 217 14.5 C227 14.5 226 31 236 31 C242 31 245.5 27 248 24.8"
      opacity="0.9"
      stroke={GOLD}
      strokeWidth="1.4"
    />
    {/* Holly leaf riding the first curl */}
    <path
      d="M217 14.5 C220 7.5 228 5 233 7 C230 13 223 15.5 217 14.5 Z"
      fill={GOLD}
      opacity="0.5"
      stroke={GOLD}
      strokeWidth="0.8"
    />
    <circle cx={236} cy={31} fill={GOLD_HI} opacity="0.8" r="1.5" />
  </g>
);

/**
 * Threshold between the coming edition and the reigning champions: the
 * One Ring at center, elvish tendrils flowing into it from both sides.
 */
const RingDivider = () => (
  <div aria-hidden="true" className="flex w-full justify-center">
    <svg
      className="w-[min(540px,88vw)]"
      fill="none"
      role="presentation"
      viewBox="0 0 520 48"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="dsn-orn-gfade"
          x1="24"
          x2="182"
          y1="24"
          y2="24"
        >
          <stop offset="0" stopColor={GOLD} stopOpacity="0" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="dsn-orn-metal" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="0.55" stopColor={GOLD} />
          <stop offset="1" stopColor={GOLD_DIM} />
        </linearGradient>
      </defs>
      <GoldFlank />
      <g transform="matrix(-1 0 0 1 520 0)">
        <GoldFlank />
      </g>
      <g style={{ filter: 'drop-shadow(0 0 9px rgba(201,165,87,0.35))' }}>
        <circle
          cx={260}
          cy={24}
          opacity="0.14"
          r={11}
          stroke={GOLD}
          strokeWidth="6"
        />
        <circle
          cx={260}
          cy={24}
          r={11}
          stroke="url(#dsn-orn-metal)"
          strokeWidth="2.4"
        />
        {/* Cold highlight where the band catches the light */}
        <path
          d="M251.5 20.5 A11 11 0 0 1 260 13"
          opacity="0.8"
          stroke={GOLD_HI}
          strokeLinecap="round"
          strokeWidth="1"
        />
      </g>
    </svg>
  </div>
);

/** A four-pointed glint escorting the star. */
const Sparkle = ({ cx, r }: { cx: number; r: number }) => (
  <polygon fill={SILVER} opacity="0.55" points={starPoints(cx, 18, r, 0.3)} />
);

/**
 * The lone star of the solitaire: one Fëanorian star burning alone in
 * ithildin, hairlines dying into the dark on both sides.
 */
const LoneStarDivider = () => (
  <div aria-hidden="true" className="flex w-full justify-center">
    <svg
      className="w-[min(340px,72vw)]"
      fill="none"
      role="presentation"
      viewBox="0 0 340 36"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="dsn-orn-sfade"
          x1="28"
          x2="150"
          y1="18"
          y2="18"
        >
          <stop offset="0" stopColor={SILVER} stopOpacity="0" />
          <stop offset="1" stopColor={SILVER} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path d="M28 18 H150" stroke="url(#dsn-orn-sfade)" strokeWidth="1" />
      <g transform="matrix(-1 0 0 1 340 0)">
        <path d="M28 18 H150" stroke="url(#dsn-orn-sfade)" strokeWidth="1" />
      </g>
      <Sparkle cx={112} r={3.6} />
      <Sparkle cx={228} r={3.6} />
      <g style={{ filter: 'drop-shadow(0 0 5px rgba(220,230,238,0.65))' }}>
        <polygon fill={SILVER_HI} points={starPoints(170, 18, 10.5)} />
        <circle cx={170} cy={18} fill="#f4f8fc" r="1.7" />
      </g>
    </svg>
  </div>
);

export { LoneStarDivider, RingDivider };
