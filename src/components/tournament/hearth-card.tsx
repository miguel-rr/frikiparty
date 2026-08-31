import {
  RACE_EMBLEMS,
  type Race,
  raceForPlayer,
} from '@/components/theme/emblems';

/** Player card spec. Top-left gem = total rings; the rest is lore. */
type CardSpec = {
  name: string;
  rings: number;
  attack: number;
  health: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  ability?: string;
  text: string;
  /** Painted portrait under /public — see portrait-card.tsx for credits. */
  portrait: string;
  /** Vertical crop of the portrait in the art window (default: top). */
  portraitAlign?: 'center' | 'top';
};

/**
 * Hearthstone-style player card, fully drawn in SVG. Layout: rings gem
 * top-left (the "mana" crystal), elliptical art window with a per-race
 * illustrated scene, curved name ribbon, rarity gem, parchment ability box,
 * and invented attack/stamina values in the bottom corners.
 *
 * Shared gradients/filters (gold rim, leather, parchment, gems, grain) live
 * in BlazonDefs; per-card defs only hold the race-specific sky and glow.
 */

type Terrain = 'forest' | 'hills' | 'mountains' | 'plain';

type Scene = {
  skyTop: string;
  skyBottom: string;
  glow: string;
  farFill: string;
  nearFill: string;
  terrain: Terrain;
};

const TERRAIN_PATHS: Record<Terrain, { far: string; near: string }> = {
  mountains: {
    far: 'M25,118 L58,82 L84,110 L112,74 L142,108 L168,82 L196,106 L225,88 V195 H25 Z',
    near: 'M25,142 L68,108 L104,134 L150,102 L190,132 L225,118 V195 H25 Z',
  },
  hills: {
    far: 'M25,120 Q78,100 128,120 T225,116 V195 H25 Z',
    near: 'M25,146 Q88,126 148,146 T225,142 V195 H25 Z',
  },
  forest: {
    far: 'M25,124 L38,104 L50,124 L62,102 L74,124 L88,108 L100,124 L114,102 L126,124 L140,108 L152,124 L166,100 L178,124 L192,110 L204,124 L225,106 V195 H25 Z',
    near: 'M25,150 L42,128 L58,150 L74,126 L90,150 L108,130 L124,150 L142,126 L158,150 L176,132 L192,150 L225,130 V195 H25 Z',
  },
  plain: {
    far: 'M25,124 Q125,114 225,122 V195 H25 Z',
    near: 'M25,148 Q125,138 225,146 V195 H25 Z',
  },
};

const SCENES: Record<Race, Scene> = {
  wizard: {
    skyTop: '#1a2140',
    skyBottom: '#3c4c7e',
    glow: '#cdd8ff',
    farFill: '#161c34',
    nearFill: '#0b0f20',
    terrain: 'mountains',
  },
  elf: {
    skyTop: '#142e28',
    skyBottom: '#2f5c44',
    glow: '#b6e6c6',
    farFill: '#122820',
    nearFill: '#091610',
    terrain: 'forest',
  },
  dwarf: {
    skyTop: '#251a18',
    skyBottom: '#5e3424',
    glow: '#ff9a5c',
    farFill: '#1d1310',
    nearFill: '#0f0a07',
    terrain: 'mountains',
  },
  ranger: {
    skyTop: '#1f2a24',
    skyBottom: '#48584a',
    glow: '#cdd8c8',
    farFill: '#1a241c',
    nearFill: '#0c120d',
    terrain: 'forest',
  },
  warrior: {
    skyTop: '#1c2430',
    skyBottom: '#4c5c76',
    glow: '#dde6f2',
    farFill: '#171e29',
    nearFill: '#0b0f16',
    terrain: 'mountains',
  },
  rohirrim: {
    skyTop: '#402a16',
    skyBottom: '#8c5626',
    glow: '#ffcf7a',
    farFill: '#33210f',
    nearFill: '#180f06',
    terrain: 'plain',
  },
  hobbit: {
    skyTop: '#2a3a1c',
    skyBottom: '#5e7a34',
    glow: '#ffe8a0',
    farFill: '#24301a',
    nearFill: '#10160a',
    terrain: 'hills',
  },
  king: {
    skyTop: '#2e2310',
    skyBottom: '#6e5024',
    glow: '#ffd98a',
    farFill: '#261d0e',
    nearFill: '#120d06',
    terrain: 'mountains',
  },
  ent: {
    skyTop: '#12241a',
    skyBottom: '#2c4a30',
    glow: '#a8d6a0',
    farFill: '#101f14',
    nearFill: '#080f09',
    terrain: 'forest',
  },
  archer: {
    skyTop: '#1e2c20',
    skyBottom: '#3e5c40',
    glow: '#d8e6b0',
    farFill: '#182418',
    nearFill: '#0b110b',
    terrain: 'hills',
  },
};

const RARITY_COLORS = {
  common: '#9aa5ad',
  rare: '#4a90d9',
  epic: '#b45fd8',
  legendary: '#ff8a2a',
} as const;

const NUMBER_STYLE = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
  fontWeight: 900,
  paintOrder: 'stroke',
} as const;

const StatNumber = ({
  size = 24,
  value,
  x,
  y,
}: {
  size?: number;
  value: number;
  x: number;
  y: number;
}) => (
  <text
    fill="#fff"
    fontSize={size}
    stroke="#160f05"
    strokeWidth="4"
    style={NUMBER_STYLE}
    textAnchor="middle"
    x={x}
    y={y}
  >
    {value}
  </text>
);

const HearthCard = ({
  card,
  className = '',
}: {
  card: CardSpec;
  className?: string;
}) => {
  const race = raceForPlayer(card.name);
  const scene = SCENES[race];
  const sceneId = `hc-${race}`;
  const legendary = card.rarity === 'legendary';
  return (
    <svg
      aria-label={`Carta de ${card.name}`}
      className={`aspect-[250/360] ${
        legendary
          ? 'drop-shadow-[0_0_18px_rgba(201,165,87,0.4)]'
          : 'drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]'
      } ${className}`}
      role="img"
      viewBox="0 0 250 360"
    >
      <title>{`${card.name} — ${card.rings} anillos`}</title>
      <defs>
        <linearGradient id={`${sceneId}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={scene.skyTop} />
          <stop offset="1" stopColor={scene.skyBottom} />
        </linearGradient>
        <radialGradient cx="0.5" cy="0.42" id={`${sceneId}-glow`} r="0.4">
          <stop offset="0" stopColor={scene.glow} stopOpacity="0.5" />
          <stop offset="1" stopColor={scene.glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${sceneId}-art`}>
          <ellipse cx="125" cy="107" rx="88" ry="74" />
        </clipPath>
      </defs>

      {/* Card frame */}
      <rect
        fill="url(#dsn-blazon-rim)"
        height="352"
        rx="20"
        stroke="#0d0a05"
        strokeWidth="2"
        width="242"
        x="4"
        y="4"
      />
      <rect
        fill="url(#dsn-card-leather)"
        height="332"
        rx="13"
        width="222"
        x="14"
        y="14"
      />

      {/* Art window */}
      <g clipPath={`url(#${sceneId}-art)`}>
        <rect
          fill={`url(#${sceneId}-sky)`}
          height="170"
          width="210"
          x="20"
          y="26"
        />
        <ellipse
          cx="125"
          cy="97"
          fill={`url(#${sceneId}-glow)`}
          rx="95"
          ry="80"
        />
        <path d={TERRAIN_PATHS[scene.terrain].far} fill={scene.farFill} />
        <path d={TERRAIN_PATHS[scene.terrain].near} fill={scene.nearFill} />
        <path
          d={RACE_EMBLEMS[race]}
          fill="url(#dsn-blazon-emblem)"
          stroke="#0d0a05"
          strokeWidth="6"
          style={{ paintOrder: 'stroke' }}
          transform="translate(70 47) scale(0.215)"
        />
        <rect
          filter="url(#dsn-grain)"
          height="170"
          opacity="0.07"
          width="210"
          x="20"
          y="26"
        />
      </g>
      <ellipse
        cx="125"
        cy="107"
        fill="none"
        rx="88"
        ry="74"
        stroke="#0d0a05"
        strokeWidth="7"
      />
      <ellipse
        cx="125"
        cy="107"
        fill="none"
        rx="88"
        ry="74"
        stroke="url(#dsn-blazon-rim)"
        strokeWidth="4"
      />

      {/* Name ribbon */}
      <path
        d="M30,204 C72,188 178,188 220,204 L214,224 C172,210 78,210 36,224 Z"
        fill="url(#dsn-card-leather)"
        stroke="url(#dsn-blazon-rim)"
        strokeWidth="2.5"
      />
      <defs>
        <path
          d="M34,219 C80,205 170,205 216,219"
          fill="none"
          id={`${sceneId}-name-${card.rings}-${card.attack}`}
        />
      </defs>
      <text
        fill="#f2d78f"
        fontSize="17"
        stroke="#160f05"
        strokeWidth="3"
        style={NUMBER_STYLE}
      >
        <textPath
          href={`#${sceneId}-name-${card.rings}-${card.attack}`}
          startOffset="50%"
          textAnchor="middle"
        >
          {card.name}
        </textPath>
      </text>

      {/* Rarity gem */}
      <circle
        cx="125"
        cy="228"
        fill={RARITY_COLORS[card.rarity]}
        r="5.5"
        stroke="#160f05"
        strokeWidth="1.5"
      />
      <circle cx="123" cy="226" fill="#fff" opacity="0.55" r="1.6" />

      {/* Ability box */}
      <rect
        fill="url(#dsn-card-parchment)"
        height="86"
        rx="9"
        stroke="#0d0a05"
        strokeWidth="2"
        width="192"
        x="29"
        y="238"
      />
      <foreignObject height="78" width="180" x="35" y="242">
        <div
          style={{
            alignItems: 'center',
            color: '#3b2b12',
            display: 'flex',
            fontSize: '12px',
            height: '100%',
            justifyContent: 'center',
            lineHeight: 1.3,
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, padding: '0 4px' }}>
            {card.ability ? <b>{card.ability}: </b> : null}
            {card.text}
          </p>
        </div>
      </foreignObject>

      {/* Rings gem (top-left) */}
      <circle
        cx="32"
        cy="36"
        fill="url(#dsn-ring-gem)"
        r="25"
        stroke="#0d0a05"
        strokeWidth="2.5"
      />
      <circle
        cx="32"
        cy="36"
        fill="none"
        opacity="0.8"
        r="19"
        stroke="#7a5c20"
        strokeWidth="1.5"
      />
      <StatNumber size={27} value={card.rings} x={32} y={45} />

      {/* Attack / stamina gems */}
      <circle
        cx="32"
        cy="326"
        fill="url(#dsn-stat-ember)"
        r="22"
        stroke="#0d0a05"
        strokeWidth="2.5"
      />
      <StatNumber value={card.attack} x={32} y={334} />
      <circle
        cx="218"
        cy="326"
        fill="url(#dsn-stat-moss)"
        r="22"
        stroke="#0d0a05"
        strokeWidth="2.5"
      />
      <StatNumber value={card.health} x={218} y={334} />
    </svg>
  );
};

export type { CardSpec };
export { HearthCard, SCENES, TERRAIN_PATHS };
