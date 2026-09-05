import type {
  Ability,
  AbilityKind,
  CounterTag,
  PowerKind,
  PowerPosition,
  StatBag,
  StructureKind,
  Upgrade,
} from '@/lib/wiki/types';
import type { UnitCategory } from '@/server/db/schema';

/**
 * Source images on the community wiki (file names as uploaded there). The
 * image pipeline turns them into `wiki/aotr/<faction>/<kind>/<slug>.webp`
 * (+ `-portrait`) in R2; the seed only needs to know which ones exist.
 */
type WikiImages = { portrait?: string; ingame?: string };

type HeroData = {
  slug: string;
  name: string;
  title?: string;
  recruitedAt?: string;
  cost?: number;
  buildTime?: number;
  health?: number;
  armourSet?: string;
  attackType?: string;
  isSummon?: boolean;
  description: string;
  abilities: Ability[];
  stats?: StatBag;
  images?: WikiImages;
};

type UnitData = {
  slug: string;
  name: string;
  category: UnitCategory;
  recruitedAt?: string;
  requirements?: string;
  cost?: number;
  cp?: number;
  health?: number;
  buildTime?: number;
  armourSet?: string;
  attackType?: string;
  maxCount?: number;
  isSummon?: boolean;
  strongAgainst?: CounterTag[];
  weakAgainst?: CounterTag[];
  description?: string;
  abilities?: Ability[];
  upgrades?: Upgrade[];
  stats?: StatBag;
  images?: WikiImages;
};

type StructureData = {
  slug: string;
  name: string;
  kind: StructureKind;
  cost?: number;
  buildTime?: number;
  health?: number;
  healthByLevel?: number[];
  armourSet?: string;
  maxCount?: number;
  description?: string;
  bonus?: string;
  produces?: string[];
  upgrades?: Upgrade[];
  abilities?: Ability[];
  stats?: StatBag;
  images?: WikiImages;
};

type PowerData = {
  slug: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  position: PowerPosition;
  kind?: PowerKind;
  description: string;
  stats?: StatBag;
};

type FactionData = {
  code: string;
  heroes: HeroData[];
  units: UnitData[];
  structures: StructureData[];
  powers: PowerData[];
};

/** Shorthand for an ability row. */
const ab = (
  name: string,
  level: number | null,
  hotkey: string | null,
  kind: AbilityKind,
  description: string,
  stats?: StatBag,
): Ability => ({ name, level, hotkey, kind, description, stats });

/** Shorthand for an upgrade row. */
const up = (
  name: string,
  cost: number | null,
  hotkey: string | null,
  description: string,
  level: number | null = null,
  stats?: StatBag,
): Upgrade => ({ name, cost, hotkey, level, description, stats });

export type {
  FactionData,
  HeroData,
  PowerData,
  StructureData,
  UnitData,
  WikiImages,
};
export { ab, up };
