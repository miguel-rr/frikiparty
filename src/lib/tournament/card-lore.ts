import { type Race, raceForPlayer } from '@/components/theme/emblems';
import type { CardSpec } from '@/components/tournament/hearth-card';

/**
 * Card lore: hand-written abilities/stats for well-known players, plus a
 * deterministic fallback so ANY player gets a coherent card (portrait by
 * race, rarity by rings, stats from a name hash). Real ring counts always
 * come from the caller — lore never invents trophies.
 */

const PORTRAIT_BY_RACE: Partial<Record<Race, string>> = {
  dwarf: '/design/portraits/dwarf.webp',
  elf: '/design/portraits/elf.webp',
  hobbit: '/design/portraits/thief.webp',
  king: '/design/portraits/king.webp',
  ranger: '/design/portraits/huntsman.webp',
  wizard: '/design/portraits/wizard.webp',
};

const FALLBACK_PORTRAIT = '/design/portraits/huntsman.webp';

type Lore = Pick<CardSpec, 'attack' | 'health' | 'ability' | 'text'>;

const CURATED_LORE: Record<string, Lore> = {
  Cañete: {
    attack: 4,
    health: 8,
    ability: 'Provocar',
    text: 'Los rivales deben atacarle. Suelen arrepentirse.',
  },
  Cordente: {
    attack: 5,
    health: 5,
    ability: 'Sigilo',
    text: 'Hasta el jugador más pequeño puede cambiar el curso de una final.',
  },
  Pingus: {
    attack: 3,
    health: 9,
    ability: 'Último aliento',
    text: 'Propone otra partida a las tres de la mañana.',
  },
  Richar: {
    attack: 9,
    health: 9,
    ability: 'Grito de batalla',
    text: 'Añade un anillo a tu mano.',
  },
  White: {
    attack: 7,
    health: 7,
    ability: 'Grito de batalla',
    text: 'Un mago nunca llega tarde a una final.',
  },
  Yura: {
    attack: 6,
    health: 4,
    ability: 'Furia del viento',
    text: 'Puede jugar dos partidas en el mismo turno.',
  },
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

/** Full card spec for any player. `totalRings` = team + individual rings. */
const cardSpecFor = (name: string, totalRings: number): CardSpec => {
  const race = raceForPlayer(name);
  const curated = CURATED_LORE[name];
  const hash = hashName(name);
  return {
    name,
    rings: totalRings,
    attack: curated?.attack ?? 3 + (hash % 7),
    health: curated?.health ?? 3 + (Math.floor(hash / 7) % 7),
    rarity: rarityFor(totalRings),
    ability: curated?.ability,
    text: curated?.text ?? GENERIC_TEXT[race],
    portrait: PORTRAIT_BY_RACE[race] ?? FALLBACK_PORTRAIT,
  };
};

export { cardSpecFor };
