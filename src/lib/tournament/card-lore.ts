import { type Race, raceForPlayer } from '@/components/theme/emblems';
import type { CardSpec } from '@/components/tournament/hearth-card';

/**
 * Card lore. Three layers:
 *
 * - Portrait and stats are FIXED per player (curated or name-hash), so a
 *   player always looks the same; one day each user will pick their own.
 * - Ability name+text are curated per player in the DB (card_ability,
 *   card_ability_text); without one, a race-generic line fills the card.
 *
 * Real ring counts always come from the caller — lore never invents
 * trophies.
 */

/** Every available portrait, keyed by file basename, with a Spanish label for pickers. */
const PORTRAIT_LABELS: Record<string, string> = {
  dwarf: 'Enano',
  'elf-lord': 'Señor élfico',
  elf: 'Elfo',
  guard: 'Guardia real',
  huntsman: 'Montaraz',
  king: 'Rey',
  longbowman: 'Arquero',
  'mage-white': 'Mago blanco',
  marksman: 'Tirador élfico',
  marshal: 'Mariscal',
  rider: 'Jinete',
  runemaster: 'Maestro rúnico',
  thief: 'Hobbit',
  wizard: 'Mago',
  wose: 'Ente',
};

const portraitPath = (key: string) => `/design/portraits/${key}.webp`;

const PORTRAITS_BY_RACE: Record<Race, string[]> = {
  archer: ['marksman', 'longbowman'],
  dwarf: ['dwarf', 'runemaster'],
  elf: ['elf', 'elf-lord'],
  ent: ['wose'],
  hobbit: ['thief'],
  king: ['king', 'marshal'],
  ranger: ['huntsman'],
  rohirrim: ['rider'],
  warrior: ['guard'],
  wizard: ['wizard', 'mage-white'],
};

const FALLBACK_PORTRAIT_KEY = 'huntsman';

/** Curated defaults for the faces everyone knows; a DB choice overrides, the rest hash into their race pool. */
const PLAYER_PORTRAITS: Record<string, string> = {
  Cañete: 'dwarf',
  Cordente: 'thief',
  Pingus: 'huntsman',
  Richar: 'king',
  White: 'wizard',
  Yura: 'elf',
};

const GENERIC_TEXT: Record<Race, string> = {
  archer: 'Alcance: golpea desde la última fila de la mesa.',
  dwarf: 'Coraza: nunca abandona una partida a medias.',
  elf: 'Elusivo: imposible de leer hasta el último turno.',
  ent: 'Raíces: cuanto más dura la partida, más fuerte se hace.',
  hobbit: 'Sigilo: nadie lo ve venir hasta que es tarde.',
  king: 'Mando: sus compañeros de equipo ganan +1 de moral.',
  ranger: 'Explorador: conoce todos los mapas del torneo.',
  rohirrim: 'Carga: empieza cada partida al galope.',
  warrior: 'Firmeza: no retrocede ni en la peor pantalla.',
  wizard: 'Conjuro: convierte una derrota en experiencia.',
};

const hashName = (name: string) => {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash;
};

const rarityFor = (totalRings: number): CardSpec['rarity'] => {
  if (totalRings >= 6) {
    return 'legendary';
  }
  if (totalRings >= 4) {
    return 'epic';
  }
  if (totalRings >= 2) {
    return 'rare';
  }
  return 'common';
};

/** Chosen (DB) portrait wins, then the curated map, then the race pool by name hash. */
const portraitFor = (name: string, race: Race, chosen?: string | null) => {
  if (chosen && PORTRAIT_LABELS[chosen]) {
    return portraitPath(chosen);
  }
  const fixed = PLAYER_PORTRAITS[name];
  if (fixed) {
    return portraitPath(fixed);
  }
  const pool = PORTRAITS_BY_RACE[race];
  return portraitPath(
    pool[hashName(name) % pool.length] ?? FALLBACK_PORTRAIT_KEY,
  );
};

/** A player's card inputs: real ring counts plus their stored card choices. */
type CardIdentity = {
  name: string;
  rings: number;
  individualRings?: number;
  /** Portrait key from PORTRAIT_LABELS, or null/undefined for the default. */
  cardPortrait?: string | null;
  cardAbility?: string | null;
  cardAbilityText?: string | null;
  /** The ranking leader always opens at 9/9 (fate rerolls the rest). */
  isLeader?: boolean;
};

/**
 * Deterministic card for one player: portrait/stats/rarity never change;
 * the lore comes from the pin (Richar), the player's stored choice, or the
 * race-generic fallback. No randomness — use dealCardSpecs for deck deals.
 * Rarity counts both ring kinds; the card shows them separately.
 */
const cardSpecFor = (identity: CardIdentity): CardSpec => {
  const { name, rings, individualRings = 0 } = identity;
  const race = raceForPlayer(name);
  const hash = hashName(name);
  return {
    name,
    rings,
    individualRings,
    attack: identity.isLeader ? 9 : 3 + (hash % 7),
    health: identity.isLeader ? 9 : 3 + (Math.floor(hash / 7) % 7),
    pinnedStats: identity.isLeader === true,
    rarity: rarityFor(rings + individualRings),
    ability: identity.cardAbility ?? undefined,
    text: identity.cardAbilityText ?? GENERIC_TEXT[race],
    portrait: portraitFor(name, race, identity.cardPortrait),
  };
};

/** Cards for a group of players; every line is curated or race-generic. */
const dealCardSpecs = (players: CardIdentity[]): CardSpec[] =>
  players.map(cardSpecFor);

const PORTRAIT_OPTIONS = Object.entries(PORTRAIT_LABELS)
  .map(([key, label]) => ({ key, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es'));

export {
  type CardIdentity,
  cardSpecFor,
  dealCardSpecs,
  PORTRAIT_OPTIONS,
  portraitPath,
};
