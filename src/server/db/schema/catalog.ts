import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  BoardHalves,
  BoardRing,
  MapOrigin,
  MapSizeBand,
} from '@/lib/live/map-board';
import type {
  Ability,
  CounterTag,
  PowerKind,
  PowerPosition,
  StatBag,
  StructureKind,
  Upgrade,
} from '@/lib/wiki/types';
import { createTable } from '@/server/db/schema/create-table';

/** Official games (AotR, BotME) plus a growing list of non-official ones. */
const game = createTable('game', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  // URL identity for /games/<slug>; null until the wiki gives it a page.
  slug: text('slug').unique(),
  isOfficial: boolean('is_official').notNull().default(false),
  // Wiki: plain paragraphs, and the game's own site.
  description: text('description'),
  websiteUrl: text('website_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const gameVersion = createTable(
  'game_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => game.id),
    version: text('version').notNull(),
    // Chronological order — version strings like "1.06" vs "1.10" don't sort correctly as text.
    releaseOrder: integer('release_order').notNull(),
    // Wiki: when it shipped, what changed (plain paragraphs), the official notes.
    releasedAt: date('released_at'),
    notes: text('notes'),
    changelogUrl: text('changelog_url'),
  },
  (table) => [unique().on(table.gameId, table.version)],
);

/**
 * A faction's availability for a given tournament is derived by comparing
 * `introducedInVersion`/`removedInVersion` release order against the
 * tournament's own game version — there's no per-tournament roster table.
 */
const faction = createTable('faction', {
  id: uuid('id').primaryKey().defaultRandom(),
  introducedInVersionId: uuid('introduced_in_version_id')
    .notNull()
    .references(() => gameVersion.id),
  removedInVersionId: uuid('removed_in_version_id').references(
    () => gameVersion.id,
  ),
  name: text('name').notNull(),
  // Stable key into the presentation catalogue (emblems, colours) in
  // src/lib/tournament/factions.ts; null for games without one.
  code: text('code').unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  // Alternate factions (Angmar, Dol Amroth…) transform a core faction on
  // specific maps and aren't offered in tournaments by default.
  kind: text('kind').notNull().default('core').$type<'core' | 'alternate'>(),
  transformsFactionId: uuid('transforms_faction_id').references(
    (): AnyPgColumn => faction.id,
  ),
  // Wiki: the faction's crest, when we have a bitmap beyond the SVG emblem.
  imageUrl: text('image_url'),
});

/**
 * The wiki: what a faction is like *from* a game version on. Content is
 * versioned by "valid from": showing a faction under version X means the
 * newest revision whose version is X or earlier, so nothing is duplicated
 * across versions that changed nothing, and each rework gets its own
 * revision without touching the older ones. Text fields hold plain
 * paragraphs; the structured parts live in the tables below.
 */
const factionRevision = createTable(
  'faction_revision',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => faction.id, { onDelete: 'cascade' }),
    gameVersionId: uuid('game_version_id')
      .notNull()
      .references(() => gameVersion.id),
    summary: text('summary'),
    overview: text('overview'),
    strengths: text('strengths').array().notNull().default(sql`'{}'::text[]`),
    weaknesses: text('weaknesses').array().notNull().default(sql`'{}'::text[]`),
    // What this revision changes against the previous one.
    changes: text('changes'),
    ringHero: text('ring_hero'),
    sourceUrl: text('source_url'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.factionId, table.gameVersionId)],
);

const factionHero = createTable('faction_hero', {
  id: uuid('id').primaryKey().defaultRandom(),
  revisionId: uuid('revision_id')
    .notNull()
    .references(() => factionRevision.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  title: text('title'),
  recruitedAt: text('recruited_at'),
  // Numbers as numbers, so heroes can be compared (cost per health…).
  cost: integer('cost'),
  buildTimeSeconds: integer('build_time_seconds'),
  health: integer('health'),
  armourSet: text('armour_set'),
  attackType: text('attack_type'),
  // Primary weapon, straight from the game's INI files (10.0 onwards).
  damage: integer('damage'),
  damageType: text('damage_type'),
  attackDelayMs: integer('attack_delay_ms'),
  attackRange: integer('attack_range'),
  speed: integer('speed'),
  // Summoned heroes (Elessar, Gwaihir) come from a power, not the fortress.
  isSummon: boolean('is_summon').notNull().default(false),
  description: text('description'),
  abilities: jsonb('abilities').$type<Ability[]>().notNull().default([]),
  stats: jsonb('stats').$type<StatBag>().notNull().default({}),
  imageUrl: text('image_url'),
  portraitUrl: text('portrait_url'),
  sortOrder: integer('sort_order').notNull().default(0),
});

type UnitCategory =
  | 'swordsmen'
  | 'pikemen'
  | 'archers'
  | 'cavalry'
  | 'siege'
  | 'monster'
  | 'heroic'
  | 'special';

const factionUnit = createTable('faction_unit', {
  id: uuid('id').primaryKey().defaultRandom(),
  revisionId: uuid('revision_id')
    .notNull()
    .references(() => factionRevision.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull().$type<UnitCategory>(),
  recruitedAt: text('recruited_at'),
  requirements: text('requirements'),
  cost: integer('cost'),
  commandPoints: integer('command_points'),
  health: integer('health'),
  buildTimeSeconds: integer('build_time_seconds'),
  armourSet: text('armour_set'),
  attackType: text('attack_type'),
  // Cap on the battlefield (Swan Knights 3, Fountain Guards 2…); null: none.
  maxCount: integer('max_count'),
  // Primary weapon, straight from the game's INI files (10.0 onwards).
  damage: integer('damage'),
  damageType: text('damage_type'),
  attackDelayMs: integer('attack_delay_ms'),
  attackRange: integer('attack_range'),
  speed: integer('speed'),
  // Members of one battalion (horde); null for single units.
  battalionSize: integer('battalion_size'),
  isSummon: boolean('is_summon').notNull().default(false),
  // Closed tag lists so units of different factions can be crossed.
  strongAgainst: text('strong_against')
    .array()
    .$type<CounterTag[]>()
    .notNull()
    .default(sql`'{}'::text[]`),
  weakAgainst: text('weak_against')
    .array()
    .$type<CounterTag[]>()
    .notNull()
    .default(sql`'{}'::text[]`),
  description: text('description'),
  abilities: jsonb('abilities').$type<Ability[]>().notNull().default([]),
  upgrades: jsonb('upgrades').$type<Upgrade[]>().notNull().default([]),
  stats: jsonb('stats').$type<StatBag>().notNull().default({}),
  imageUrl: text('image_url'),
  portraitUrl: text('portrait_url'),
  sortOrder: integer('sort_order').notNull().default(0),
});

const factionStructure = createTable('faction_structure', {
  id: uuid('id').primaryKey().defaultRandom(),
  revisionId: uuid('revision_id')
    .notNull()
    .references(() => factionRevision.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kind: text('kind').$type<StructureKind>(),
  cost: integer('cost'),
  buildTimeSeconds: integer('build_time_seconds'),
  // Health at level 1; `healthByLevel` when the structure levels up.
  health: integer('health'),
  healthByLevel: integer('health_by_level')
    .array()
    .notNull()
    .default(sql`'{}'::integer[]`),
  armourSet: text('armour_set'),
  maxCount: integer('max_count'),
  description: text('description'),
  bonus: text('bonus'),
  // Units it recruits (names as written in faction_unit), levels/upgrades it sells, abilities it casts.
  produces: text('produces').array().notNull().default(sql`'{}'::text[]`),
  upgrades: jsonb('upgrades').$type<Upgrade[]>().notNull().default([]),
  abilities: jsonb('abilities').$type<Ability[]>().notNull().default([]),
  stats: jsonb('stats').$type<StatBag>().notNull().default({}),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
});

const factionPower = createTable('faction_power', {
  id: uuid('id').primaryKey().defaultRandom(),
  revisionId: uuid('revision_id')
    .notNull()
    .references(() => factionRevision.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // Spellbook tier (1–4), points, and the slot in the 3-4-3-2 tree.
  tier: integer('tier'),
  cost: integer('cost'),
  position: text('position').$type<PowerPosition>(),
  kind: text('kind').$type<PowerKind>(),
  // Names of the powers of the tier above this one links to.
  requires: text('requires').array().notNull().default(sql`'{}'::text[]`),
  description: text('description'),
  stats: jsonb('stats').$type<StatBag>().notNull().default({}),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
});

/**
 * Maps a game is played on. Grows as organisers type new names (same
 * pattern as `tag`); can be pre-seeded when a list is available.
 */
const gameMap = createTable(
  'game_map',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => game.id),
    name: text('name').notNull(),
    // Player slots the map is built for, when known (2, 4, 6, 8…).
    players: integer('players'),
    introducedInVersionId: uuid('introduced_in_version_id').references(
      () => gameVersion.id,
    ),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.gameId, table.name)],
);

/**
 * The illustrated sheet of a map (the 4v4 booklet's art): where its start
 * rings sit on the image, which lobby slot each ring is, and how the rings
 * split into the two sides by default. Captains place their players on
 * these rings before a game; the organiser can re-split them per game.
 */
const gameMapBoard = createTable('game_map_board', {
  gameMapId: uuid('game_map_id')
    .primaryKey()
    .references(() => gameMap.id, { onDelete: 'cascade' }),
  // Public path of the image, e.g. /maps/aotr/evendim.webp.
  imageUrl: text('image_url').notNull(),
  // Pixel size of the art the ring coordinates are measured on.
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  rings: jsonb('rings').notNull().$type<BoardRing[]>(),
  // Ring indexes of each side, before the draw says which team gets which.
  halves: jsonb('halves').notNull().$type<BoardHalves>(),
  // What the booklet says of the map: who made it, its size band and its
  // playable size in cells ("Mediano · 500 × 500").
  origin: text('origin').$type<MapOrigin>(),
  sizeBand: text('size_band').$type<MapSizeBand>(),
  cellsWidth: integer('cells_width'),
  cellsHeight: integer('cells_height'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Free-form tag catalog, scoped to media for now. Grows as users type new tags. */
const tag = createTable('tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export {
  faction,
  factionHero,
  factionPower,
  factionRevision,
  factionStructure,
  factionUnit,
  game,
  gameMap,
  gameMapBoard,
  gameVersion,
  tag,
  type UnitCategory,
};
