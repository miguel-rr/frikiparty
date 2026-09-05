/**
 * Shapes shared by the wiki tables, their seed and their pages. Anything
 * numeric lives in typed columns or in a `StatBag` so it can be compared
 * and computed with later (cost per health, ability versus price…): the
 * prose explains, the numbers are never only inside the prose.
 */

/** Named numbers, keyed by a stable English name (`damagePct`, `durationS`…). */
type StatBag = Record<string, number>;

/**
 * What a unit is good or bad against. A closed list so two factions'
 * units can be crossed; `numbers` means "strong when massed".
 */
type CounterTag =
  | 'swordsmen'
  | 'pikemen'
  | 'archers'
  | 'cavalry'
  | 'siege'
  | 'monsters'
  | 'heroes'
  | 'heroic'
  | 'structures'
  | 'infantry'
  | 'flying'
  | 'ranged'
  | 'melee'
  | 'elite'
  | 'numbers'
  | 'fire';

type AbilityKind = 'active' | 'passive' | 'leadership' | 'toggle' | 'formation';

/** A hero, unit or structure ability. `level` is the rank that unlocks it (null: from the start). */
type Ability = {
  name: string;
  level: number | null;
  hotkey: string | null;
  kind: AbilityKind;
  description: string;
  stats?: StatBag;
};

/** An equipment or structure upgrade with its price; `level` is the structure level it needs or grants. */
type Upgrade = {
  name: string;
  cost: number | null;
  hotkey: string | null;
  level: number | null;
  description: string;
  stats?: StatBag;
};

type StructureKind =
  | 'fortress'
  | 'economy'
  | 'production'
  | 'defence'
  | 'support'
  | 'summoned';

/** Where a power sits in the 3-4-3-2 spellbook tree. */
type PowerPosition = 'L' | 'C' | 'R' | 'LL' | 'LR' | 'RL' | 'RR';

type PowerKind = 'buff' | 'debuff' | 'summon' | 'heal' | 'utility' | 'attack';

export type {
  Ability,
  AbilityKind,
  CounterTag,
  PowerKind,
  PowerPosition,
  StatBag,
  StructureKind,
  Upgrade,
};
