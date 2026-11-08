import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { TIER_POSITIONS } from '@/lib/wiki/labels';
import type { PowerPosition } from '@/lib/wiki/types';
import { db } from '@/server/db';
import {
  faction,
  factionHero,
  factionPower,
  factionRevision,
  factionStructure,
  factionUnit,
  game,
  gameVersion,
} from '@/server/db/schema';
import { publicUrl } from '@/server/storage/r2';

import { FACTIONS_10, VERSION_10 } from './wiki-data/aotr-10/factions';

/**
 * Age of the Ring 10.0.0 in the wiki: the version itself, every core and
 * alternate faction it ships (the alternates linked to the core faction
 * they replace on their map), and a full 10.0.0 revision for each one.
 *
 * Numbers and names come straight from the game files: the sheets in
 * scripts/wiki-data/aotr-10/<code>.json were extracted from the 10.0 INIs
 * and lotr.str (Spanish from Galcano11's translation where the English
 * didn't change since 9.3.3, ours elsewhere). Faction prose lives in
 * scripts/wiki-data/aotr-10/factions.ts.
 *
 * Pictures are linked only when they exist in `.wiki-images/` (upload them
 * with `pnpm run wiki:images`). Idempotent: `pnpm run db:seed:wiki:10` (and
 * `:prod`); run after db:seed:catalog.
 */

const DATA_DIR = path.resolve('scripts/wiki-data/aotr-10');
const IMAGES_DIR = path.resolve('.wiki-images');

// ----------------------------------------------------------------- sheets

const abilitySchema = z.object({
  name: z.string(),
  level: z.number().int().nullable(),
  hotkey: z.string().nullable(),
  kind: z.enum(['active', 'passive', 'leadership', 'toggle', 'formation']),
  description: z.string(),
});

const upgradeSchema = z.object({
  name: z.string(),
  cost: z.number().int().nullable(),
  hotkey: z.string().nullable(),
  level: z.number().int().nullable(),
  description: z.string(),
  stats: z.record(z.number()).optional(),
});

const counterSchema = z.enum([
  'swordsmen',
  'pikemen',
  'archers',
  'cavalry',
  'siege',
  'monsters',
  'heroes',
  'heroic',
  'structures',
  'infantry',
  'flying',
  'ranged',
  'numbers',
]);

const optionalInt = z.number().int().nullish();
const optionalText = z.string().nullish();

const weaponFields = {
  damage: optionalInt,
  damageType: optionalText,
  attackDelayMs: optionalInt,
  attackRange: optionalInt,
  speed: optionalInt,
};

const heroSchema = z.object({
  slug: z.string(),
  name: z.string(),
  title: optionalText,
  recruitedAt: optionalText,
  cost: optionalInt,
  buildTime: optionalInt,
  health: optionalInt,
  armourSet: optionalText,
  attackType: optionalText,
  description: z.string(),
  abilities: z.array(abilitySchema),
  stats: z.record(z.number()),
  ...weaponFields,
});

const unitSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.enum([
    'swordsmen',
    'pikemen',
    'archers',
    'cavalry',
    'siege',
    'monster',
    'heroic',
    'special',
  ]),
  recruitedAt: optionalText,
  requirements: optionalText,
  cost: optionalInt,
  cp: optionalInt,
  health: optionalInt,
  buildTime: optionalInt,
  armourSet: optionalText,
  attackType: optionalText,
  maxCount: optionalInt,
  battalionSize: optionalInt,
  strongAgainst: z.array(counterSchema),
  weakAgainst: z.array(counterSchema),
  description: optionalText,
  abilities: z.array(abilitySchema),
  upgrades: z.array(upgradeSchema),
  stats: z.record(z.number()),
  ...weaponFields,
});

const structureSchema = z.object({
  slug: z.string(),
  name: z.string(),
  kind: z.enum([
    'fortress',
    'economy',
    'production',
    'defence',
    'support',
    'summoned',
  ]),
  cost: optionalInt,
  buildTime: optionalInt,
  health: optionalInt,
  healthByLevel: z.array(z.number().int()),
  armourSet: optionalText,
  maxCount: optionalInt,
  description: optionalText,
  produces: z.array(z.string()),
  upgrades: z.array(upgradeSchema),
  abilities: z.array(abilitySchema),
});

const powerSchema = z.object({
  slug: z.string(),
  name: z.string(),
  tier: z.number().int().min(1).max(4),
  position: z.enum(['L', 'C', 'R', 'LL', 'LR', 'RL', 'RR']),
  kind: z.enum(['buff', 'debuff', 'summon', 'heal', 'utility', 'attack']),
  cost: optionalInt,
  requires: z.array(z.string()),
  description: z.string(),
});

const sheetSchema = z.object({
  code: z.string(),
  heroes: z.array(heroSchema),
  units: z.array(unitSchema),
  structures: z.array(structureSchema),
  powers: z.array(powerSchema),
});

type Sheet = z.infer<typeof sheetSchema>;

const readSheet = (code: string): Sheet =>
  sheetSchema.parse(
    JSON.parse(readFileSync(path.join(DATA_DIR, `${code}.json`), 'utf8')),
  );

// ----------------------------------------------------------------- images

type ImageKind = 'units' | 'heroes' | 'structures' | 'powers';

/**
 * Public URL of a game icon (the round select portrait, or the spellbook
 * button for powers), only if it is in `.wiki-images/aotr-10/` (and so in
 * R2 after `pnpm run wiki:images`).
 */
const imageUrl = (code: string, kind: ImageKind, slug: string) => {
  const key = `aotr-10/${code}/${kind}/${slug}.webp`;
  return existsSync(path.join(IMAGES_DIR, key))
    ? publicUrl(`wiki/${key}`)
    : null;
};

const crestUrl = (code: string) => {
  const key = `aotr/${code}/logo.webp`;
  return existsSync(path.join(IMAGES_DIR, key))
    ? publicUrl(`wiki/${key}`)
    : null;
};

// ------------------------------------------------------------------- rows

const positionIndex = (tier: number, position: PowerPosition) =>
  (TIER_POSITIONS[tier] ?? []).indexOf(position);

const sortPowers = (powers: Sheet['powers']) =>
  [...powers].sort(
    (a, b) =>
      a.tier - b.tier ||
      positionIndex(a.tier, a.position) - positionIndex(b.tier, b.position),
  );

const replaceContents = async (code: string, sheet: Sheet, rid: string) => {
  for (const table of [
    factionHero,
    factionUnit,
    factionStructure,
    factionPower,
  ]) {
    await db.delete(table).where(eq(table.revisionId, rid));
  }
  if (sheet.heroes.length) {
    await db.insert(factionHero).values(
      sheet.heroes.map((h, i) => ({
        revisionId: rid,
        name: h.name,
        title: h.title ?? null,
        recruitedAt: h.recruitedAt ?? null,
        cost: h.cost ?? null,
        buildTimeSeconds: h.buildTime ?? null,
        health: h.health ?? null,
        armourSet: h.armourSet ?? null,
        attackType: h.attackType ?? null,
        damage: h.damage ?? null,
        damageType: h.damageType ?? null,
        attackDelayMs: h.attackDelayMs ?? null,
        attackRange: h.attackRange ?? null,
        speed: h.speed ?? null,
        description: h.description,
        abilities: h.abilities,
        stats: h.stats,
        imageUrl: null,
        portraitUrl: imageUrl(code, 'heroes', h.slug),
        sortOrder: i,
      })),
    );
  }
  if (sheet.units.length) {
    await db.insert(factionUnit).values(
      sheet.units.map((u, i) => ({
        revisionId: rid,
        name: u.name,
        category: u.category,
        recruitedAt: u.recruitedAt ?? null,
        requirements: u.requirements ?? null,
        cost: u.cost ?? null,
        commandPoints: u.cp ?? null,
        health: u.health ?? null,
        buildTimeSeconds: u.buildTime ?? null,
        armourSet: u.armourSet ?? null,
        attackType: u.attackType ?? null,
        maxCount: u.maxCount ?? null,
        damage: u.damage ?? null,
        damageType: u.damageType ?? null,
        attackDelayMs: u.attackDelayMs ?? null,
        attackRange: u.attackRange ?? null,
        speed: u.speed ?? null,
        battalionSize: u.battalionSize ?? null,
        strongAgainst: u.strongAgainst,
        weakAgainst: u.weakAgainst,
        description: u.description ?? null,
        abilities: u.abilities,
        upgrades: u.upgrades,
        stats: u.stats,
        imageUrl: null,
        portraitUrl: imageUrl(code, 'units', u.slug),
        sortOrder: i,
      })),
    );
  }
  if (sheet.structures.length) {
    await db.insert(factionStructure).values(
      sheet.structures.map((s, i) => ({
        revisionId: rid,
        name: s.name,
        kind: s.kind,
        cost: s.cost ?? null,
        buildTimeSeconds: s.buildTime ?? null,
        health: s.health ?? null,
        healthByLevel: s.healthByLevel,
        armourSet: s.armourSet ?? null,
        maxCount: s.maxCount ?? null,
        description: s.description ?? null,
        produces: s.produces,
        upgrades: s.upgrades,
        abilities: s.abilities,
        imageUrl: imageUrl(code, 'structures', s.slug),
        sortOrder: i,
      })),
    );
  }
  if (sheet.powers.length) {
    await db.insert(factionPower).values(
      sortPowers(sheet.powers).map((p, i) => ({
        revisionId: rid,
        name: p.name,
        tier: p.tier,
        cost: p.cost ?? null,
        position: p.position,
        kind: p.kind,
        requires: p.requires,
        description: p.description,
        imageUrl: imageUrl(code, 'powers', p.slug),
        sortOrder: i,
      })),
    );
  }
};

// ------------------------------------------------------------- top level

const upsertVersion = async (gameId: string) => {
  const values = {
    releaseOrder: VERSION_10.releaseOrder,
    releasedAt: VERSION_10.releasedAt,
    notes: VERSION_10.notes,
    changelogUrl: VERSION_10.changelogUrl,
  };
  const [existing] = await db
    .select({ id: gameVersion.id })
    .from(gameVersion)
    .where(
      and(
        eq(gameVersion.gameId, gameId),
        eq(gameVersion.version, VERSION_10.version),
      ),
    );
  if (existing) {
    await db
      .update(gameVersion)
      .set(values)
      .where(eq(gameVersion.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(gameVersion)
    .values({ gameId, version: VERSION_10.version, ...values })
    .returning({ id: gameVersion.id });
  if (!row) throw new Error('No se pudo crear la versión 10.0.0');
  console.log(`Versión creada: ${VERSION_10.version}`);
  return row.id;
};

const factionIdByCode = async (code: string) =>
  (
    await db
      .select({ id: faction.id })
      .from(faction)
      .where(eq(faction.code, code))
  )[0]?.id ?? null;

/** Core factions must exist (db:seed:catalog); alternates are created here. */
const upsertFaction = async (code: string, versionId: string) => {
  const meta = FACTIONS_10[code];
  if (!meta) throw new Error(`Sin datos de facción: ${code}`);
  const transformsFactionId = meta.transforms
    ? await factionIdByCode(meta.transforms)
    : null;
  if (meta.transforms && !transformsFactionId) {
    throw new Error(`Falta la facción principal ${meta.transforms}`);
  }
  const values = {
    name: meta.name,
    kind: meta.kind,
    transformsFactionId,
    sortOrder: meta.sortOrder,
    imageUrl: crestUrl(code),
  };
  const existing = await factionIdByCode(code);
  if (existing) {
    // Keep a crest set by an earlier seed when there is no local file.
    const { imageUrl: crest, ...rest } = values;
    await db
      .update(faction)
      .set(crest ? values : rest)
      .where(eq(faction.id, existing));
    return existing;
  }
  if (meta.kind === 'core') {
    throw new Error(`Falta la facción ${code}: siembra antes db:seed:catalog`);
  }
  const [row] = await db
    .insert(faction)
    .values({ code, introducedInVersionId: versionId, ...values })
    .returning({ id: faction.id });
  if (!row) throw new Error(`No se pudo crear la facción ${code}`);
  console.log(`Facción alternativa creada: ${meta.name}`);
  return row.id;
};

const upsertRevision = async (
  code: string,
  factionId: string,
  versionId: string,
) => {
  const meta = FACTIONS_10[code];
  if (!meta) throw new Error(`Sin datos de facción: ${code}`);
  const values = {
    factionId,
    gameVersionId: versionId,
    summary: meta.summary,
    overview: meta.overview,
    strengths: meta.strengths,
    weaknesses: meta.weaknesses,
    changes: meta.changes,
    ringHero: meta.ringHero ?? null,
    sourceUrl: VERSION_10.changelogUrl,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(factionRevision)
    .values(values)
    .onConflictDoUpdate({
      target: [factionRevision.factionId, factionRevision.gameVersionId],
      set: values,
    })
    .returning({ id: factionRevision.id });
  if (!row) throw new Error(`No se pudo guardar la revisión de ${code}`);
  const sheet = readSheet(code);
  await replaceContents(code, sheet, row.id);
  console.log(
    `${meta.name} @ ${VERSION_10.version}: ${sheet.units.length} unidades, ${sheet.heroes.length} héroes, ${sheet.structures.length} estructuras, ${sheet.powers.length} poderes`,
  );
};

const main = async () => {
  const [aotr] = await db
    .select({ id: game.id })
    .from(game)
    .where(eq(game.name, 'Age of the Ring'));
  if (!aotr) throw new Error('Siembra primero el catálogo (db:seed:catalog).');
  const versionId = await upsertVersion(aotr.id);

  const codes = Object.keys(FACTIONS_10);
  // Core first, so alternates can point at the faction they replace.
  const ordered = [
    ...codes.filter((c) => FACTIONS_10[c]?.kind === 'core'),
    ...codes.filter((c) => FACTIONS_10[c]?.kind === 'alternate'),
  ];
  for (const code of ordered) {
    const factionId = await upsertFaction(code, versionId);
    await upsertRevision(code, factionId, versionId);
  }
  console.log(`Wiki 10.0.0 sembrada: ${ordered.length} facciones.`);
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
