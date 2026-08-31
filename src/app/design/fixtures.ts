/**
 * Fixtures for the /design proposal route. The ranking, ring totals and last
 * edition are REAL, aggregated from scripts/data/historical-editions.json;
 * tournament-in-progress data (standings, bracket, draft, auction) is still
 * illustrative. Nothing here reads or writes the database.
 *
 * Domain rule (see .claude/core-logic.md): teams have no meaningful names —
 * what matters and what people remember are the players that formed them.
 * Names like "El huertar de Valentín" or "Las abuelas" are venues (rural
 * houses), never teams.
 */

import type { CardSpec } from '@/components/tournament/hearth-card';
import type { RankedPlayer } from '@/lib/tournament/ranking';

import historical from '../../../scripts/data/historical-editions.json';

/** A team is just its players plus a board-game token color for the UI. */
type TeamFixture = {
  id: string;
  players: string[];
  color: string;
};

type Standing = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
};

type BracketFixture = {
  round: string;
  matches: {
    teamAId: string;
    teamBId: string;
    scoreA: number | null;
    scoreB: number | null;
  }[];
}[];

type HistoricalEdition = {
  year: number;
  order?: number;
  venue?: string;
  mapsUrl?: string;
  winningTeam?: (string | null)[];
  individualChampion?: string;
};

const EDITIONS = (historical as { editions: HistoricalEdition[] }).editions;

const lastEdition = EDITIONS.reduce((latest, edition) =>
  edition.year > latest.year ? edition : latest,
);

/** Real data from the historical JSON (the roman numeral stays editorial). */
const LAST_EDITION = {
  year: lastEdition.year,
  edition: `Edición ${lastEdition.year}`,
  venue: lastEdition.venue ?? '',
  teamChampions: (lastEdition.winningTeam ?? []).filter(
    (player): player is string => player !== null,
  ),
  individualChampion: lastEdition.individualChampion ?? '',
} as const;

/**
 * Next edition: same rural house as 2025 (venue and maps link come from the
 * historical JSON; the resolved address is Valdemanco, Madrid).
 */
const NEXT_EVENT = {
  edition: 'Edición 2026',
  year: '2026',
  dates: '12–15 de noviembre de 2026',
  shortDates: '12–15 nov 2026',
  venue: lastEdition.venue ?? '',
  venueArea: 'Valdemanco, Madrid',
  mapsUrl: lastEdition.mapsUrl ?? '',
  /**
   * Optional venue photo (future `photo` property on the venue, hand-picked
   * per sede; a Places API lookup could fill it automatically as fallback).
   * null renders the placeholder slot.
   */
  venuePhoto:
    'https://media.er2.co/es/madrid/607c78986f10b/635/684481344093c.jpg' as
      | string
      | null,
  mapsEmbedUrl:
    'https://maps.google.com/maps?q=El+Huertar+de+Valent%C3%ADn,+28729+Valdemanco,+Madrid&z=13&output=embed',
} as const;

/**
 * Real ring totals, aggregated from the historical editions JSON. Sorted by
 * rings, individual rings as tiebreaker (core-logic ranking rules); players
 * still tied after that share a position — like Arri and White at 3rd.
 */
const RANKING: RankedPlayer[] = (() => {
  const totals = new Map<string, { rings: number; individualRings: number }>();
  const entry = (name: string) => {
    const existing = totals.get(name);
    if (existing) {
      return existing;
    }
    const created = { rings: 0, individualRings: 0 };
    totals.set(name, created);
    return created;
  };
  for (const edition of EDITIONS) {
    for (const player of edition.winningTeam ?? []) {
      if (player) {
        entry(player).rings += 1;
      }
    }
    if (edition.individualChampion) {
      entry(edition.individualChampion).individualRings += 1;
    }
  }
  return [...totals.entries()]
    .map(([name, rings]) => ({ name, ...rings }))
    .sort(
      (a, b) =>
        b.rings - a.rings ||
        b.individualRings - a.individualRings ||
        a.name.localeCompare(b.name, 'es'),
    );
})();

/** Total rings (team + individual) — e.g. for the card cost gems. */
const totalRingsFor = (name: string) => {
  const player = RANKING.find((candidate) => candidate.name === name);
  return player ? player.rings + player.individualRings : 0;
};

const TEAMS: TeamFixture[] = [
  {
    id: 'team-richar',
    players: ['Richar', 'Cañete', 'Yura', 'Pingus'],
    color: '#7fb08d',
  },
  {
    id: 'team-arsu',
    players: ['Arsu', 'Arri', 'Rober', 'Guille'],
    color: '#9a7fc0',
  },
  {
    id: 'team-white',
    players: ['White', 'Juanills', 'Cordente'],
    color: '#c65a4a',
  },
  {
    id: 'team-porneich',
    players: ['Porneich', 'Vinzont', 'Palons'],
    color: '#5a8fc0',
  },
  {
    id: 'team-bordallo',
    players: ['Bordallo', 'Ambeloki', 'Valanton'],
    color: '#d9b34a',
  },
];

const TEAMS_BY_ID: Record<string, TeamFixture> = Object.fromEntries(
  TEAMS.map((team) => [team.id, team]),
);

const STANDINGS: Standing[] = [
  { teamId: 'team-richar', played: 4, wins: 3, losses: 1 },
  { teamId: 'team-arsu', played: 4, wins: 3, losses: 1 },
  { teamId: 'team-white', played: 4, wins: 2, losses: 2 },
  { teamId: 'team-porneich', played: 4, wins: 1, losses: 3 },
  { teamId: 'team-bordallo', played: 4, wins: 1, losses: 3 },
];

const BRACKET: BracketFixture = [
  {
    round: 'Semifinales',
    matches: [
      {
        teamAId: 'team-richar',
        teamBId: 'team-porneich',
        scoreA: 2,
        scoreB: 0,
      },
      {
        teamAId: 'team-arsu',
        teamBId: 'team-white',
        scoreA: 2,
        scoreB: 1,
      },
    ],
  },
  {
    round: 'Final',
    matches: [
      {
        teamAId: 'team-richar',
        teamBId: 'team-arsu',
        scoreA: 2,
        scoreB: 1,
      },
    ],
  },
];

const CHAMPION_CARDS: CardSpec[] = [
  {
    name: 'Richar',
    rings: totalRingsFor('Richar'),
    attack: 9,
    health: 9,
    rarity: 'legendary',
    ability: 'Grito de batalla',
    text: 'Añade un anillo a tu mano.',
    portrait: '/design/portraits/king.webp',
  },
  {
    name: 'Cañete',
    rings: totalRingsFor('Cañete'),
    attack: 4,
    health: 8,
    rarity: 'epic',
    ability: 'Provocar',
    text: 'Los rivales deben atacarle. Suelen arrepentirse.',
    portrait: '/design/portraits/dwarf.webp',
  },
  {
    name: 'Yura',
    rings: totalRingsFor('Yura'),
    attack: 6,
    health: 4,
    rarity: 'rare',
    ability: 'Furia del viento',
    text: 'Puede jugar dos partidas en el mismo turno.',
    portrait: '/design/portraits/elf.webp',
  },
  {
    name: 'Pingus',
    rings: totalRingsFor('Pingus'),
    attack: 3,
    health: 9,
    rarity: 'rare',
    ability: 'Último aliento',
    text: 'Propone otra partida a las tres de la mañana.',
    portrait: '/design/portraits/huntsman.webp',
  },
];

const INDIVIDUAL_CARD: CardSpec = {
  name: 'Cordente',
  rings: totalRingsFor('Cordente'),
  attack: 5,
  health: 5,
  rarity: 'legendary',
  ability: 'Sigilo',
  text: 'Hasta el jugador más pequeño puede cambiar el curso de una final.',
  portrait: '/design/portraits/thief.webp',
};

const LOT_CARD: CardSpec = {
  name: 'White',
  rings: totalRingsFor('White'),
  attack: 7,
  health: 7,
  rarity: 'legendary',
  ability: 'Grito de batalla',
  text: 'Un mago nunca llega tarde a una subasta.',
  portrait: '/design/portraits/wizard.webp',
};

/**
 * Detail of one partido (best-of-N series): its partidas and who took each
 * game. Every PLAYER picks their own Age of the Ring faction per partida
 * (see .claude/core-logic.md, "Facciones") — the arrays align with the
 * team's players. No scores: a partida is always 1-0, so the winner is
 * marked visually instead.
 */
type PartidaFixture = {
  /** Faction per player, aligned with TEAMS_BY_ID[teamAId].players. */
  factionsA: string[];
  /** Faction per player, aligned with TEAMS_BY_ID[teamBId].players. */
  factionsB: string[];
  winner: 'A' | 'B';
};

const MATCH_DETAIL = {
  stage: 'Final',
  bestOfLabel: 'Al mejor de 3',
  teamAId: 'team-richar',
  teamBId: 'team-arsu',
  partidas: [
    {
      factionsA: ['gondor', 'erebor', 'lothlorien', 'woodland'],
      factionsB: ['mordor', 'isengard', 'mistyMountains', 'dolGuldur'],
      winner: 'A',
    },
    {
      factionsA: ['rohan', 'rivendell', 'gondor', 'erebor'],
      factionsB: ['haradwaith', 'dolGuldur', 'mordor', 'isengard'],
      winner: 'B',
    },
    {
      factionsA: ['rohan', 'gondor', 'woodland', 'rivendell'],
      factionsB: ['isengard', 'mistyMountains', 'haradwaith', 'mordor'],
      winner: 'A',
    },
  ] satisfies PartidaFixture[],
} as const;

const AUCTION = {
  lotNumber: 2,
  totalLots: 12,
  player: 'White',
  pot: 'Bombo 1',
  currentBid: 34,
  bidder: 'Arsu',
  minNextBid: 35,
  secondsLeft: 7.2,
  fraction: 0.72,
  captains: [
    { name: 'Richar', budget: 62, roster: ['Yura', 'Pingus'] },
    { name: 'Arsu', budget: 41, roster: ['Rober'], active: true },
    { name: 'Juanills', budget: 78, roster: ['Guille'] },
  ],
} as const;

/**
 * Draft mock mid-flight: 20 players, 5 teams of 4 → 4 bombos of 5 (max team
 * size = number of bombos, see core-logic). Captains come from Bombo 1.
 * Round 1 ran in inverse-ranking order (Cañete first); round 2 is the snake
 * reversal. A captain picks one player per bombo, in ANY order — hence White
 * jumped to Bombo 3 in round 1 and closed Bombo 2 in round 2.
 * The ranking is the definitive tournament snapshot used to build the pots.
 * The last three names are placeholders to reach 20 mock players.
 */
const DRAFT = {
  round: 2,
  totalRounds: 3,
  methodLabel: 'Serpiente',
  onClock: 'Arri',
  roundOrder: ['Richar', 'White', 'Arsu', 'Arri', 'Cañete'],
  /** Player each captain took on their already-played turn of THIS round. */
  picksThisRound: {
    Richar: 'Guille',
    White: 'Porneich',
    Arsu: 'Vinzont',
  } as Record<string, string>,
  captainView: 'Arri',
  ranking: [
    'Richar',
    'White',
    'Arsu',
    'Arri',
    'Cañete',
    'Juanills',
    'Rober',
    'Cordente',
    'Yura',
    'Porneich',
    'Pingus',
    'Vinzont',
    'Guille',
    'Palons',
    'Bordallo',
    'Ambeloki',
    'Valanton',
    'Curro',
    'Fonso',
    'Larry',
  ],
  pots: [
    {
      label: 'Bombo 1 · Capitanes',
      players: [
        { name: 'Richar', pickedBy: null },
        { name: 'White', pickedBy: null },
        { name: 'Arsu', pickedBy: null },
        { name: 'Arri', pickedBy: null },
        { name: 'Cañete', pickedBy: null },
      ],
    },
    {
      label: 'Bombo 2',
      players: [
        { name: 'Juanills', pickedBy: 'Cañete' },
        { name: 'Rober', pickedBy: 'Arri' },
        { name: 'Cordente', pickedBy: 'Arsu' },
        { name: 'Yura', pickedBy: 'Richar' },
        { name: 'Porneich', pickedBy: 'White' },
      ],
    },
    {
      label: 'Bombo 3',
      players: [
        { name: 'Pingus', pickedBy: 'White' },
        { name: 'Vinzont', pickedBy: 'Arsu' },
        { name: 'Guille', pickedBy: 'Richar' },
        { name: 'Palons', pickedBy: null },
        { name: 'Bordallo', pickedBy: null },
      ],
    },
    {
      label: 'Bombo 4',
      players: [
        { name: 'Ambeloki', pickedBy: null },
        { name: 'Valanton', pickedBy: null },
        { name: 'Curro', pickedBy: null },
        { name: 'Fonso', pickedBy: null },
        { name: 'Larry', pickedBy: null },
      ],
    },
  ],
} as const;

export type { BracketFixture, RankedPlayer, Standing, TeamFixture };
export {
  AUCTION,
  BRACKET,
  CHAMPION_CARDS,
  DRAFT,
  INDIVIDUAL_CARD,
  LAST_EDITION,
  LOT_CARD,
  MATCH_DETAIL,
  NEXT_EVENT,
  RANKING,
  STANDINGS,
  TEAMS,
  TEAMS_BY_ID,
};
