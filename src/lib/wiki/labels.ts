import type {
  AbilityKind,
  CounterTag,
  PowerKind,
  PowerPosition,
  StructureKind,
} from '@/lib/wiki/types';
import type { UnitCategory } from '@/server/db/schema';

const CATEGORY_LABELS: Record<UnitCategory, string> = {
  swordsmen: 'Espadas',
  pikemen: 'Picas',
  archers: 'Arqueros',
  cavalry: 'Caballería',
  siege: 'Asedio',
  monster: 'Monstruo',
  heroic: 'Heroica',
  special: 'Especial',
};

const COUNTER_LABELS: Record<CounterTag, string> = {
  swordsmen: 'espadas',
  pikemen: 'picas',
  archers: 'arqueros',
  cavalry: 'caballería',
  siege: 'asedio',
  monsters: 'monstruos',
  heroes: 'héroes',
  heroic: 'unidades heroicas',
  structures: 'estructuras',
  infantry: 'infantería',
  flying: 'voladores',
  ranged: 'a distancia',
  melee: 'cuerpo a cuerpo',
  elite: 'tropas de élite',
  numbers: 'en masa',
  fire: 'fuego',
};

const ABILITY_KIND_LABELS: Record<AbilityKind, string> = {
  active: 'activa',
  passive: 'pasiva',
  leadership: 'liderazgo',
  toggle: 'alternar',
  formation: 'formación',
};

const STRUCTURE_KIND_LABELS: Record<StructureKind, string> = {
  fortress: 'Fortaleza',
  economy: 'Economía',
  production: 'Reclutamiento',
  defence: 'Defensa',
  support: 'Apoyo',
  summoned: 'Invocada',
};

const POWER_KIND_LABELS: Record<PowerKind, string> = {
  buff: 'mejora',
  debuff: 'penalización',
  summon: 'invocación',
  heal: 'curación',
  utility: 'utilidad',
  attack: 'ataque',
};

/** Tier → points it costs in every AotR spellbook. */
const TIER_COST: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 25 };

/** Column (0–6) of each tree position, so the four tiers line up like the in-game book. */
const POWER_COLUMN: Record<PowerPosition, number> = {
  L: 1,
  C: 3,
  R: 5,
  LL: 0,
  LR: 2,
  RL: 4,
  RR: 6,
};

/**
 * Column of a power given its tier: the last tier's two powers sit between
 * the three of the tier above (columns 2 and 4), as the in-game book draws it.
 */
const powerColumn = (tier: number | null, position: PowerPosition) =>
  tier === 4 ? (position === 'L' ? 2 : 4) : POWER_COLUMN[position];

/** Positions of each tier, left to right. */
const TIER_POSITIONS: Record<number, PowerPosition[]> = {
  1: ['L', 'C', 'R'],
  2: ['LL', 'LR', 'RL', 'RR'],
  3: ['L', 'C', 'R'],
  4: ['L', 'R'],
};

export {
  ABILITY_KIND_LABELS,
  CATEGORY_LABELS,
  COUNTER_LABELS,
  POWER_COLUMN,
  POWER_KIND_LABELS,
  powerColumn,
  STRUCTURE_KIND_LABELS,
  TIER_COST,
  TIER_POSITIONS,
};
