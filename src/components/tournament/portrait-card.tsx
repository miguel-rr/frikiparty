'use client';

import { useEffect, useState } from 'react';

import { raceForPlayer } from '@/components/theme/emblems';
import {
  type CardSpec,
  SCENES,
  TERRAIN_PATHS,
} from '@/components/tournament/hearth-card';

/**
 * Hearthstone-style card with a painted portrait in the art window.
 * Evolution of HearthCard (kept for smaller avatar-like uses): same chrome —
 * rings gem, name ribbon, rarity gem, parchment ability box, corner stats —
 * but the art is a raster illustration from /public/design/portraits,
 * composited over the per-race scene backdrop (sky, glow, terrain).
 *
 * Portraits: Battle for Wesnoth character art (www.wesnoth.org),
 * transparent-background paintings, GPLv2+ / CC BY-SA 4.0.
 */

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

const PortraitCard = ({
  card,
  className = '',
}: {
  card: CardSpec;
  className?: string;
}) => {
  // Easter egg: tapping either bottom gem rerolls it to a random value.
  const [attackShown, setAttackShown] = useState<number | null>(null);
  const [healthShown, setHealthShown] = useState<number | null>(null);
  const reroll = (current: number) => {
    let next = current;
    while (next === current) {
      next = 1 + Math.floor(Math.random() * 9);
    }
    return next;
  };

  // Fate deals fresh stats on every visit — client-side after hydration,
  // so the statically built page (and its HTML) never changes.
  const pinnedStats = card.pinnedStats === true;
  useEffect(() => {
    if (pinnedStats) {
      return;
    }
    setAttackShown(1 + Math.floor(Math.random() * 9));
    setHealthShown(1 + Math.floor(Math.random() * 9));
  }, [pinnedStats]);

  const race = raceForPlayer(card.name);
  const scene = SCENES[race];
  const legendary = card.rarity === 'legendary';
  const clipId = `pc-art-${card.name.toLowerCase().replace(/[^a-z]/g, '')}`;
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
      <title>
        {`${card.name} — ${card.rings} anillos${
          card.individualRings ? ` · ${card.individualRings} individuales` : ''
        }`}
      </title>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="125" cy="107" rx="88" ry="74" />
        </clipPath>
        <linearGradient id={`${clipId}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={scene.skyTop} />
          <stop offset="1" stopColor={scene.skyBottom} />
        </linearGradient>
        <radialGradient cx="0.5" cy="0.4" id={`${clipId}-glow`} r="0.5">
          <stop offset="0" stopColor={scene.glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={scene.glow} stopOpacity="0" />
        </radialGradient>
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

      {/* Art window: transparent portrait over the race scene */}
      <g clipPath={`url(#${clipId})`}>
        <rect
          fill={`url(#${clipId}-sky)`}
          height="150"
          width="178"
          x="36"
          y="32"
        />
        <ellipse
          cx="125"
          cy="95"
          fill={`url(#${clipId}-glow)`}
          rx="92"
          ry="72"
        />
        <path d={TERRAIN_PATHS[scene.terrain].far} fill={scene.farFill} />
        <path d={TERRAIN_PATHS[scene.terrain].near} fill={scene.nearFill} />
        <image
          height="150"
          href={card.portrait}
          preserveAspectRatio={
            card.portraitAlign === 'center'
              ? 'xMidYMid slice'
              : 'xMidYMin slice'
          }
          width="178"
          x="36"
          y="32"
        />
        <ellipse cx="125" cy="107" fill="url(#dsn-vignette)" rx="88" ry="74" />
        <rect
          filter="url(#dsn-grain)"
          height="150"
          opacity="0.06"
          width="178"
          x="36"
          y="32"
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
          id={`${clipId}-name`}
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
          href={`#${clipId}-name`}
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

      {/* Individual rings — hollow "solitaire" band with a crown gem (top-right) */}
      <g>
        <circle
          cx="218"
          cy="36"
          fill="#1a1208"
          r="23"
          stroke="#0d0a05"
          strokeWidth="2.5"
        />
        <circle
          cx="218"
          cy="36"
          fill="none"
          r="16"
          stroke="url(#dsn-ring-gem)"
          strokeWidth="5"
        />
        <circle
          cx="218"
          cy="36"
          fill="none"
          opacity="0.9"
          r="16"
          stroke="#f6e2a4"
          strokeDasharray="7 94"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <circle
          cx="218"
          cy="20"
          fill="#c9a557"
          r="4.2"
          stroke="#0d0a05"
          strokeWidth="1.5"
        />
        <circle cx="218" cy="20" fill="#f6e2a4" r="2.2" />
        <StatNumber
          size={19}
          value={card.individualRings ?? 0}
          x={218}
          y={43}
        />
      </g>

      {/* Attack / stamina gems — tap one and fate rerolls it */}
      {/* biome-ignore lint/a11y/useSemanticElements: SVG has no button element */}
      <g
        className="cursor-pointer focus:outline-none"
        onClick={() => setAttackShown((value) => reroll(value ?? card.attack))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            setAttackShown((value) => reroll(value ?? card.attack));
          }
        }}
        role="button"
        tabIndex={0}
      >
        <circle
          cx="32"
          cy="326"
          fill="url(#dsn-stat-ember)"
          r="22"
          stroke="#0d0a05"
          strokeWidth="2.5"
        />
        <StatNumber value={attackShown ?? card.attack} x={32} y={334} />
      </g>
      {/* biome-ignore lint/a11y/useSemanticElements: SVG has no button element */}
      <g
        className="cursor-pointer focus:outline-none"
        onClick={() => setHealthShown((value) => reroll(value ?? card.health))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            setHealthShown((value) => reroll(value ?? card.health));
          }
        }}
        role="button"
        tabIndex={0}
      >
        <circle
          cx="218"
          cy="326"
          fill="url(#dsn-stat-moss)"
          r="22"
          stroke="#0d0a05"
          strokeWidth="2.5"
        />
        <StatNumber value={healthShown ?? card.health} x={218} y={334} />
      </g>
    </svg>
  );
};

export { PortraitCard };
