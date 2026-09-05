import { and, asc, desc, eq, getTableName, lte, sql } from 'drizzle-orm';

import type { db as Db } from '@/server/db';
import {
  edition,
  faction,
  factionHero,
  factionPower,
  factionRevision,
  factionStructure,
  factionUnit,
  game,
  gameMap,
  gameVersion,
  tournament,
} from '@/server/db/schema';

type Database = typeof Db;

// Single-table selects render columns unqualified, which is ambiguous inside
// a correlated subquery: spell the outer table out.
const gameId = sql.raw(`"${getTableName(game)}"."id"`);

/** The games with a wiki page (a slug), official first. */
const listGames = (db: Database) =>
  db
    .select({
      id: game.id,
      name: game.name,
      slug: game.slug,
      isOfficial: game.isOfficial,
      description: game.description,
      versions: sql<number>`(select count(*)::int from ${gameVersion} gv where gv.game_id = ${gameId})`,
      factions: sql<number>`(select count(*)::int from ${faction} f join ${gameVersion} v on v.id = f.introduced_in_version_id where v.game_id = ${gameId})`,
    })
    .from(game)
    .where(sql`${game.slug} IS NOT NULL`)
    .orderBy(desc(game.isOfficial), asc(game.name));

/** A version's place in the timeline, for "valid from" lookups. */
type VersionRef = {
  id: string;
  version: string;
  releaseOrder: number;
  releasedAt: string | null;
};

const versionsOf = (db: Database, gameId: string): Promise<VersionRef[]> =>
  db
    .select({
      id: gameVersion.id,
      version: gameVersion.version,
      releaseOrder: gameVersion.releaseOrder,
      releasedAt: gameVersion.releasedAt,
    })
    .from(gameVersion)
    .where(eq(gameVersion.gameId, gameId))
    .orderBy(asc(gameVersion.releaseOrder));

/** Whether a faction exists in a version (introduced before, not yet removed). */
const availableIn = (
  f: { introducedOrder: number; removedOrder: number | null },
  order: number,
) =>
  f.introducedOrder <= order &&
  (f.removedOrder === null || f.removedOrder > order);

const factionsOf = async (db: Database, gameId: string) => {
  const intro = gameVersion;
  const rows = await db
    .select({
      id: faction.id,
      name: faction.name,
      code: faction.code,
      kind: faction.kind,
      imageUrl: faction.imageUrl,
      sortOrder: faction.sortOrder,
      transformsFactionId: faction.transformsFactionId,
      introducedVersion: intro.version,
      introducedOrder: intro.releaseOrder,
      removedOrder: sql<
        number | null
      >`(select release_order from ${gameVersion} r where r.id = ${faction.removedInVersionId})`,
      removedVersion: sql<
        string | null
      >`(select version from ${gameVersion} r where r.id = ${faction.removedInVersionId})`,
    })
    .from(faction)
    .innerJoin(intro, eq(intro.id, faction.introducedInVersionId))
    .where(eq(intro.gameId, gameId))
    .orderBy(asc(faction.kind), asc(faction.sortOrder), asc(faction.name));
  return rows;
};

type WikiFaction = Awaited<ReturnType<typeof factionsOf>>[number];

/** Everything /games/<slug>/<version>/<code> renders. */
type FactionPageData = NonNullable<Awaited<ReturnType<typeof getFactionPage>>>;

/** /games/<slug>: the game, its versions (with the editions that played them), factions and maps. */
const getGame = async (db: Database, slug: string) => {
  const [row] = await db.select().from(game).where(eq(game.slug, slug));
  if (!row) return null;
  const [versions, factions, maps, played] = await Promise.all([
    db
      .select()
      .from(gameVersion)
      .where(eq(gameVersion.gameId, row.id))
      .orderBy(desc(gameVersion.releaseOrder)),
    factionsOf(db, row.id),
    db
      .select({
        id: gameMap.id,
        name: gameMap.name,
        players: gameMap.players,
        description: gameMap.description,
        introducedVersion: sql<
          string | null
        >`(select version from ${gameVersion} v where v.id = ${gameMap.introducedInVersionId})`,
      })
      .from(gameMap)
      .where(eq(gameMap.gameId, row.id))
      .orderBy(asc(gameMap.name)),
    db
      .select({ versionId: tournament.gameVersionId, year: edition.year })
      .from(tournament)
      .innerJoin(edition, eq(edition.id, tournament.editionId))
      .where(eq(tournament.gameId, row.id))
      .orderBy(asc(edition.year)),
  ]);
  return {
    ...row,
    versions: versions.map((v) => ({
      ...v,
      editions: [
        ...new Set(
          played.filter((p) => p.versionId === v.id).map((p) => p.year),
        ),
      ],
      factionCount: factions.filter(
        (f) => f.kind === 'core' && availableIn(f, v.releaseOrder),
      ).length,
    })),
    factions,
    maps,
    editionsWithoutVersion: [
      ...new Set(played.filter((p) => p.versionId === null).map((p) => p.year)),
    ],
  };
};

/**
 * The revision that applies to a faction under a version: the newest one
 * at or before it. `inherited` says it was written for an earlier version.
 */
const resolveRevision = async (
  db: Database,
  factionId: string,
  order: number,
) => {
  const [rev] = await db
    .select({
      id: factionRevision.id,
      summary: factionRevision.summary,
      overview: factionRevision.overview,
      strengths: factionRevision.strengths,
      weaknesses: factionRevision.weaknesses,
      changes: factionRevision.changes,
      ringHero: factionRevision.ringHero,
      sourceUrl: factionRevision.sourceUrl,
      updatedAt: factionRevision.updatedAt,
      version: gameVersion.version,
      releaseOrder: gameVersion.releaseOrder,
    })
    .from(factionRevision)
    .innerJoin(gameVersion, eq(gameVersion.id, factionRevision.gameVersionId))
    .where(
      and(
        eq(factionRevision.factionId, factionId),
        lte(gameVersion.releaseOrder, order),
      ),
    )
    .orderBy(desc(gameVersion.releaseOrder))
    .limit(1);
  if (!rev) return null;
  return { ...rev, inherited: rev.releaseOrder < order };
};

/** /games/<slug>/<version>: notes, the factions available with their summaries, the maps. */
const getGameVersionPage = async (
  db: Database,
  slug: string,
  version: string,
) => {
  const [row] = await db
    .select({
      gameId: game.id,
      gameName: game.name,
      gameSlug: game.slug,
      id: gameVersion.id,
      version: gameVersion.version,
      releaseOrder: gameVersion.releaseOrder,
      releasedAt: gameVersion.releasedAt,
      notes: gameVersion.notes,
      changelogUrl: gameVersion.changelogUrl,
    })
    .from(gameVersion)
    .innerJoin(game, eq(game.id, gameVersion.gameId))
    .where(and(eq(game.slug, slug), eq(gameVersion.version, version)));
  if (!row) return null;
  const [allVersions, factions, maps, played] = await Promise.all([
    versionsOf(db, row.gameId),
    factionsOf(db, row.gameId),
    db
      .select({
        id: gameMap.id,
        name: gameMap.name,
        players: gameMap.players,
        description: gameMap.description,
        introducedOrder: sql<
          number | null
        >`(select release_order from ${gameVersion} v where v.id = ${gameMap.introducedInVersionId})`,
      })
      .from(gameMap)
      .where(eq(gameMap.gameId, row.gameId))
      .orderBy(asc(gameMap.name)),
    db
      .select({ year: edition.year })
      .from(tournament)
      .innerJoin(edition, eq(edition.id, tournament.editionId))
      .where(eq(tournament.gameVersionId, row.id)),
  ]);
  const available = factions.filter((f) => availableIn(f, row.releaseOrder));
  const withRevision = await Promise.all(
    available.map(async (f) => ({
      ...f,
      revision: await resolveRevision(db, f.id, row.releaseOrder),
    })),
  );
  return {
    ...row,
    allVersions,
    factions: withRevision,
    maps: maps.filter(
      (m) =>
        m.introducedOrder === null || m.introducedOrder <= row.releaseOrder,
    ),
    editions: [...new Set(played.map((p) => p.year))].sort(),
  };
};

/** /games/<slug>/<version>/<code>: the faction as it was in that version. */
const getFactionPage = async (
  db: Database,
  slug: string,
  version: string,
  code: string,
) => {
  const versionPage = await getGameVersionPage(db, slug, version);
  if (!versionPage) return null;
  const entry = versionPage.factions.find((f) => f.code === code);
  if (!entry) return null;
  const revision = entry.revision;
  const [heroes, units, structures, powers] = revision
    ? await Promise.all([
        db
          .select()
          .from(factionHero)
          .where(eq(factionHero.revisionId, revision.id))
          .orderBy(asc(factionHero.sortOrder)),
        db
          .select()
          .from(factionUnit)
          .where(eq(factionUnit.revisionId, revision.id))
          .orderBy(asc(factionUnit.sortOrder)),
        db
          .select()
          .from(factionStructure)
          .where(eq(factionStructure.revisionId, revision.id))
          .orderBy(asc(factionStructure.sortOrder)),
        db
          .select()
          .from(factionPower)
          .where(eq(factionPower.revisionId, revision.id))
          .orderBy(asc(factionPower.sortOrder)),
      ])
    : [[], [], [], []];
  // Versions this faction exists in, for the switcher.
  const versionsWithFaction = versionPage.allVersions.filter((v) =>
    availableIn(entry, v.releaseOrder),
  );
  const revisionVersions = (
    await db
      .select({
        version: gameVersion.version,
        releaseOrder: gameVersion.releaseOrder,
      })
      .from(factionRevision)
      .innerJoin(gameVersion, eq(gameVersion.id, factionRevision.gameVersionId))
      .where(eq(factionRevision.factionId, entry.id))
  ).map((r) => r.version);
  const transforms = entry.transformsFactionId
    ? (versionPage.factions.find((f) => f.id === entry.transformsFactionId) ??
      null)
    : null;
  return {
    game: { name: versionPage.gameName, slug: versionPage.gameSlug ?? slug },
    version: {
      id: versionPage.id,
      version: versionPage.version,
      releaseOrder: versionPage.releaseOrder,
    },
    faction: {
      ...entry,
      transforms: transforms
        ? { name: transforms.name, code: transforms.code }
        : null,
    },
    revision,
    heroes,
    units,
    structures,
    powers,
    versionsWithFaction,
    revisionVersions,
  };
};

/** Every static path of the wiki. */
const listWikiParams = async (db: Database) => {
  const games = await db
    .select({ id: game.id, slug: game.slug })
    .from(game)
    .where(sql`${game.slug} IS NOT NULL`);
  const out: { slug: string; version?: string; code?: string }[] = [];
  for (const g of games) {
    if (!g.slug) continue;
    out.push({ slug: g.slug });
    const versions = await versionsOf(db, g.id);
    const factions = await factionsOf(db, g.id);
    for (const v of versions) {
      out.push({ slug: g.slug, version: v.version });
      for (const f of factions) {
        if (f.code && availableIn(f, v.releaseOrder))
          out.push({ slug: g.slug, version: v.version, code: f.code });
      }
    }
  }
  return out;
};

/** Ids of the core factions available for a tournament's version (the draw pool). */
const listCoreFactionsForVersion = async (
  db: Database,
  gameVersionId: string,
) => {
  const [v] = await db
    .select({ gameId: gameVersion.gameId, order: gameVersion.releaseOrder })
    .from(gameVersion)
    .where(eq(gameVersion.id, gameVersionId));
  if (!v) return [];
  const all = await factionsOf(db, v.gameId);
  return all.filter((f) => f.kind === 'core' && availableIn(f, v.order));
};

export {
  type FactionPageData,
  getFactionPage,
  getGame,
  getGameVersionPage,
  listCoreFactionsForVersion,
  listGames,
  listWikiParams,
  type WikiFaction,
};
