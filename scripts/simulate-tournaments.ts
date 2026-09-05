/**
 * End-to-end simulations of the live module (dev only): five rehearsal
 * editions dated in the past, each with a team tournament and an
 * individual one, driven through the real tRPC procedures with the admin
 * and the players' own accounts — creation, vote, ranking, pots, every
 * formation method, every phase type and series length, ties, undo,
 * comments — until the champions are crowned. The timestamps are then
 * folded into each edition's weekend so the annals read as history.
 *
 * `pnpm run db:simulate:tournaments` continues where a cut run stopped;
 * `pnpm run db:simulate:tournaments -- --reset` tells every story again.
 */
import { asc, eq, inArray, sql } from 'drizzle-orm';

import { activePhase, champion, openTies } from '@/lib/live/progression';
import {
  eligibleBidders,
  minNextBid,
  settle,
} from '@/lib/tournament/auction-live';
import { optionsFor } from '@/lib/tournament/draft-live';
import { bracketRounds } from '@/lib/tournament/phase-engine';
import type { GroupTiebreakCriterion } from '@/lib/tournament/tiebreak';
import { createCaller } from '@/server/api/root';
import { getHistoricalRanking } from '@/server/api/routers/player';
import { deleteTournamentCascade } from '@/server/api/routers/tournament';
import type { createTRPCContext } from '@/server/api/trpc';
import { db } from '@/server/db';
import {
  comment,
  edition,
  editionPlayer,
  game,
  gameVersion,
  like,
  match,
  phase,
  player,
  tournament,
  user,
  venue,
} from '@/server/db/schema';
import { applyRoomCommand, loadRoom } from '@/server/live/formation';
import {
  gamesToWinFor,
  type LiveMatch,
  type LivePhase,
} from '@/server/live/phases';
import { getLiveState, type LiveState } from '@/server/live/state';
import type { Tx } from '@/server/live/tx';

// ------------------------------------------------------------ helpers

type Session = NonNullable<
  Awaited<ReturnType<typeof createTRPCContext>>['session']
>;

/** Deterministic randomness so a re-run tells the same story. */
let seed = 20260905;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(items: T[]): T => {
  const item = items[Math.floor(rand() * items.length)];
  if (item === undefined) throw new Error('Nada que elegir.');
  return item;
};
const shuffle = <T>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
};

const callerFor = (account: {
  id: string;
  email: string;
  name: string;
  role: string;
}) => {
  const now = new Date();
  const session = {
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: `sim-${account.id}`,
      userId: account.id,
      token: 'sim',
      expiresAt: new Date(now.getTime() + 3_600_000),
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: 'simulate-tournaments',
      impersonatedBy: null,
    },
  } as unknown as Session;
  return withRetries(createCaller({ db, session, headers: new Headers() }));
};

const TRANSIENT = [
  'CONNECTION_CLOSED',
  'ECONNRESET',
  'fetch failed',
  'ETIMEDOUT',
];
const isTransient = (error: unknown): boolean => {
  const text =
    error instanceof Error
      ? `${error.message} ${String(error.cause ?? '')}`
      : '';
  return TRANSIENT.some((needle) => text.includes(needle));
};

/** Runs `fn`, making it again when the pooler drops the connection under it. */
const retry = async <T>(fn: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= 4 || !isTransient(error)) throw error;
      log(`   (conexión caída; reintento ${attempt})`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
};

/**
 * Every procedure runs in its own transaction, so a call cut short by the
 * pooler dropping the connection can simply be made again.
 */
const withRetries = <T extends object>(target: T): T =>
  new Proxy(target, {
    // The caller is a recursive proxy: every level is callable, so both
    // property access and calls are trapped.
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver) as unknown;
      if (typeof value === 'function' || (value && typeof value === 'object'))
        return withRetries(value as object);
      return value;
    },
    apply(fn, thisArg, args: unknown[]) {
      return retry(() =>
        Promise.resolve(
          Reflect.apply(fn as (...a: unknown[]) => unknown, thisArg, args),
        ),
      );
    },
  });

type Caller = ReturnType<typeof callerFor>;

type Person = {
  id: string;
  name: string;
  historicalPosition: number;
  caller: Caller;
};

const log = (line: string) => console.log(line);

// ------------------------------------------------------------ scenarios

type PhasePlan = Parameters<Caller['phases']['savePlan']>[0]['phases'][number];

/** Who wins a match, when the story needs a fixed outcome. */
type Decide = (input: {
  match: LiveMatch;
  phase: LivePhase;
  state: LiveState;
  /** Team ids of the match's group in seed order (group phases). */
  seeds: string[];
}) => string | null;

type TournamentScenario = {
  kind: 'team' | 'individual';
  teamSize: number;
  players: number;
  rankingSource: 'historical' | 'vote' | 'combined';
  historicalWeightPercent?: number;
  formation:
    | { method: 'random' | 'pots_random' }
    | {
        method: 'draft';
        draft: 'snake' | 'linear';
        order: 'ranking' | 'inverse-ranking' | 'fixed-random' | 'full-random';
      }
    | { method: 'auction' };
  model: 'classic' | 'swiss';
  /** Built once the team count is known. */
  phases: (teamCount: number) => PhasePlan[];
  /** Captain-driven flow (ready, draw, line-ups, map, concession) for these phases; the rest is hand-entered. */
  captainFlowPhases: number[];
  decide?: Decide;
  /** Undo and override the first decided game (F5 admin tools). */
  undoFirst?: boolean;
  comments?: string[];
};

type EditionScenario = {
  order: number;
  startsAt: string;
  endsAt: string;
  team: TournamentScenario;
  individual: TournamentScenario;
};

const DEFAULT_CHAIN: GroupTiebreakCriterion[] = [
  'head_to_head',
  'ranking_inverse',
  'draw',
];

const groupPlan = (input: {
  name?: string | null;
  groupCount: number;
  roundsFormat: 'single' | 'double';
  gamesToWinMatch: number;
  qualifiersPerGroup: number;
  chain?: GroupTiebreakCriterion[];
  factions?: PhasePlan['factions'];
}): PhasePlan => ({
  type: 'group',
  name: input.name ?? null,
  group: {
    groupCount: input.groupCount,
    roundsFormat: input.roundsFormat,
    gamesToWinMatch: input.gamesToWinMatch,
    tiebreakChain: input.chain ?? DEFAULT_CHAIN,
    qualifiersPerGroup: input.qualifiersPerGroup,
    groupDistribution: 'random',
  },
  bracket: null,
  swiss: null,
  factions: input.factions ?? null,
});

const bracketPlan = (input: {
  name?: string | null;
  entrants: number;
  thirdPlace: boolean;
  seedingSource: 'previous_phase' | 'ranking';
  /** Games to win: [play-in, ..., semis, final] from the final backwards. */
  finalGames: number;
  semisGames?: number;
  otherGames?: number;
  factions?: PhasePlan['factions'];
}): PhasePlan => {
  const last = bracketRounds(input.entrants);
  const byRound: Record<string, number> = { [String(last)]: input.finalGames };
  if (input.semisGames && last > 1)
    byRound[String(last - 1)] = input.semisGames;
  return {
    type: 'bracket',
    name: input.name ?? 'Playoffs',
    group: null,
    bracket: {
      hasThirdPlaceMatch: input.thirdPlace,
      seedingSource: input.seedingSource,
      gamesToWinByRound: byRound,
      defaultGamesToWin: input.otherGames ?? 1,
    },
    swiss: null,
    factions: input.factions ?? null,
  };
};

const swissPlan = (input: {
  eliminationLosses: number;
  pairingMethod: 'random' | 'ranking_parity' | 'ranking_seed';
  factions?: PhasePlan['factions'];
}): PhasePlan => ({
  type: 'swiss',
  name: 'Suizo',
  group: null,
  bracket: null,
  swiss: {
    eliminationLosses: input.eliminationLosses,
    pairingMethod: input.pairingMethod,
  },
  factions: input.factions ?? null,
});

const DEPLETING = {
  allowRepeatAcrossTeams: false,
  poolMode: 'depleting' as const,
  poolCarriesOver: false,
};
const DEPLETING_CARRY = { ...DEPLETING, poolCarriesOver: true };
const FRESH = {
  allowRepeatAcrossTeams: true,
  poolMode: 'fresh' as const,
  poolCarriesOver: false,
};

/** A circular tie at the top of a group: s0 > s1 > s2 > s0, the rest lose. */
const circularTop3: Decide = ({ match: m, seeds }) => {
  const a = seeds.indexOf(m.teamAId ?? '');
  const b = seeds.indexOf(m.teamBId ?? '');
  if (a < 0 || b < 0) return null;
  const top = [0, 1, 2];
  if (top.includes(a) && top.includes(b)) {
    // 0 beats 1, 1 beats 2, 2 beats 0.
    const winnerIndex = (a + 1) % 3 === b ? a : b;
    return seeds[winnerIndex] ?? null;
  }
  if (top.includes(a)) return m.teamAId;
  if (top.includes(b)) return m.teamBId;
  return a < b ? m.teamAId : m.teamBId;
};

const EDITIONS: EditionScenario[] = [
  {
    order: 2,
    startsAt: '2026-01-16',
    endsAt: '2026-01-18',
    team: {
      kind: 'team',
      teamSize: 4,
      players: 21,
      rankingSource: 'historical',
      formation: { method: 'pots_random' },
      model: 'classic',
      phases: () => [
        groupPlan({
          groupCount: 2,
          roundsFormat: 'single',
          gamesToWinMatch: 1,
          qualifiersPerGroup: 2,
          factions: DEPLETING,
        }),
        bracketPlan({
          entrants: 4,
          thirdPlace: true,
          seedingSource: 'previous_phase',
          semisGames: 2,
          finalGames: 3,
          factions: DEPLETING_CARRY,
        }),
      ],
      captainFlowPhases: [1, 2],
      comments: [
        'Dos grupos y a por los playoffs. Que gane el que menos duerma.',
        'El tercer puesto también se juega, que nadie se relaje.',
      ],
    },
    individual: {
      kind: 'individual',
      teamSize: 1,
      players: 8,
      rankingSource: 'historical',
      formation: { method: 'random' },
      model: 'swiss',
      phases: () => [
        swissPlan({ eliminationLosses: 2, pairingMethod: 'ranking_parity' }),
      ],
      captainFlowPhases: [],
    },
  },
  {
    order: 3,
    startsAt: '2026-02-20',
    endsAt: '2026-02-22',
    team: {
      kind: 'team',
      teamSize: 3,
      players: 23,
      rankingSource: 'vote',
      formation: { method: 'draft', draft: 'snake', order: 'inverse-ranking' },
      model: 'classic',
      phases: () => [
        groupPlan({
          name: 'Liga',
          groupCount: 1,
          roundsFormat: 'single',
          gamesToWinMatch: 1,
          qualifiersPerGroup: 6,
          chain: ['head_to_head', 'draw'],
          factions: FRESH,
        }),
        bracketPlan({
          entrants: 6,
          thirdPlace: false,
          seedingSource: 'previous_phase',
          semisGames: 2,
          finalGames: 2,
          factions: FRESH,
        }),
      ],
      captainFlowPhases: [2],
      comments: [
        'Liga de ocho y luego a matarse. Snake draft, como manda la tradición.',
      ],
    },
    individual: {
      kind: 'individual',
      teamSize: 1,
      players: 6,
      rankingSource: 'historical',
      formation: { method: 'random' },
      model: 'classic',
      phases: () => [
        bracketPlan({
          name: 'Cuadro',
          entrants: 6,
          thirdPlace: false,
          seedingSource: 'ranking',
          finalGames: 1,
        }),
      ],
      captainFlowPhases: [],
    },
  },
  {
    order: 4,
    startsAt: '2026-04-10',
    endsAt: '2026-04-12',
    team: {
      kind: 'team',
      teamSize: 4,
      players: 16,
      rankingSource: 'combined',
      historicalWeightPercent: 60,
      formation: { method: 'auction' },
      model: 'classic',
      phases: () => [
        groupPlan({
          groupCount: 1,
          roundsFormat: 'double',
          gamesToWinMatch: 2,
          qualifiersPerGroup: 2,
          chain: ['head_to_head', 'tiebreak_match'],
          factions: DEPLETING,
        }),
        bracketPlan({
          name: 'Gran final',
          entrants: 2,
          thirdPlace: false,
          seedingSource: 'previous_phase',
          finalGames: 3,
          factions: DEPLETING_CARRY,
        }),
      ],
      captainFlowPhases: [2],
      decide: circularTop3,
      comments: [
        'Subasta con oro de verdad. Quien pague de más, que llore en silencio.',
        'Triple empate en cabeza: partidos de desempate. Esto es lo que queríamos.',
      ],
    },
    individual: {
      kind: 'individual',
      teamSize: 1,
      players: 12,
      rankingSource: 'historical',
      formation: { method: 'random' },
      model: 'classic',
      phases: () => [
        groupPlan({
          groupCount: 2,
          roundsFormat: 'single',
          gamesToWinMatch: 1,
          qualifiersPerGroup: 2,
        }),
        bracketPlan({
          entrants: 4,
          thirdPlace: true,
          seedingSource: 'previous_phase',
          finalGames: 1,
        }),
      ],
      captainFlowPhases: [],
    },
  },
  {
    order: 5,
    startsAt: '2026-05-22',
    endsAt: '2026-05-24',
    team: {
      kind: 'team',
      teamSize: 3,
      players: 12,
      rankingSource: 'historical',
      formation: { method: 'random' },
      model: 'swiss',
      phases: () => [
        swissPlan({
          eliminationLosses: 2,
          pairingMethod: 'ranking_seed',
          factions: DEPLETING,
        }),
      ],
      captainFlowPhases: [1],
      comments: ['Suizo a dos derrotas. Sin grupos, sin excusas.'],
    },
    individual: {
      kind: 'individual',
      teamSize: 1,
      players: 10,
      rankingSource: 'historical',
      formation: { method: 'random' },
      model: 'swiss',
      phases: () => [
        swissPlan({ eliminationLosses: 1, pairingMethod: 'random' }),
      ],
      captainFlowPhases: [],
    },
  },
  {
    order: 6,
    startsAt: '2026-07-03',
    endsAt: '2026-07-05',
    team: {
      kind: 'team',
      teamSize: 4,
      players: 20,
      rankingSource: 'vote',
      formation: { method: 'draft', draft: 'linear', order: 'fixed-random' },
      model: 'classic',
      phases: () => [
        groupPlan({
          groupCount: 1,
          roundsFormat: 'single',
          gamesToWinMatch: 1,
          qualifiersPerGroup: 4,
          factions: DEPLETING_CARRY,
        }),
        bracketPlan({
          entrants: 4,
          thirdPlace: true,
          seedingSource: 'previous_phase',
          semisGames: 2,
          finalGames: 3,
          factions: DEPLETING_CARRY,
        }),
      ],
      captainFlowPhases: [1, 2],
      undoFirst: true,
      comments: [
        'Draft lineal con orden a suertes. Los últimos serán los primeros, o no.',
        'Se ha deshecho un resultado y se ha vuelto a anotar. Todo en orden.',
      ],
    },
    individual: {
      kind: 'individual',
      teamSize: 1,
      players: 5,
      rankingSource: 'historical',
      formation: { method: 'random' },
      model: 'classic',
      phases: () => [
        groupPlan({
          name: 'Liguilla',
          groupCount: 1,
          roundsFormat: 'single',
          gamesToWinMatch: 1,
          qualifiersPerGroup: 1,
          chain: ['head_to_head', 'draw'],
        }),
      ],
      captainFlowPhases: [],
      decide: circularTop3,
    },
  },
];

const TEAM_NAMES = [
  'Los Jinetes de la Marca',
  'La Guardia de la Ciudadela',
  'Los Uruks de Isengard',
  'Los Hijos de Durin',
  'La Compañía Gris',
  'Los Corsarios de Umbar',
  'Los Guardianes del Bosque',
  'La Hueste de Angmar',
];

// ------------------------------------------------------------ the run

const main = async () => {
  if (process.env.VERCEL_ENV === 'production')
    throw new Error('Las simulaciones no existen en producción.');

  const [adminRow] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    .from(user)
    .where(eq(user.role, 'admin'));
  if (!adminRow?.role) throw new Error('No hay ninguna cuenta de admin.');
  const admin = callerFor({ ...adminRow, role: adminRow.role });

  const ranking = await getHistoricalRanking(db);
  const accounts = await db
    .select({
      playerId: player.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    .from(player)
    .innerJoin(user, eq(user.id, player.userId));
  const people: Person[] = ranking
    .map((ranked, index) => {
      const account = accounts.find((a) => a.playerId === ranked.id);
      if (!account) return null;
      return {
        id: ranked.id,
        name: ranked.name,
        historicalPosition: index,
        caller: callerFor({ ...account, role: account.role ?? 'user' }),
      };
    })
    .filter((p): p is Person => p !== null);
  if (people.length < 23)
    throw new Error(
      `Sólo ${people.length} jugadores con cuenta; hacen falta 23.`,
    );
  const personById = new Map(people.map((p) => [p.id, p]));

  const [aotr] = await db
    .select({ id: game.id })
    .from(game)
    .where(eq(game.name, 'Age of the Ring'));
  if (!aotr) throw new Error('Siembra el catálogo primero.');
  const versions = await db
    .select({ id: gameVersion.id })
    .from(gameVersion)
    .where(eq(gameVersion.gameId, aotr.id))
    .orderBy(asc(gameVersion.releaseOrder));
  const version = versions.at(-1);
  if (!version) throw new Error('AotR no tiene versiones.');
  const venues = await db
    .select({ id: venue.id, name: venue.name })
    .from(venue)
    .where(eq(venue.isPlace, true));

  if (process.argv.includes('--fold-only')) {
    await foldExisting();
    process.exit(0);
  }
  const done = await resetSimulations();

  for (const [index, scenario] of EDITIONS.entries()) {
    if (done.has(scenario.order)) {
      log(
        `\n=== Edición 2026 · ${scenario.order}: ya contada, se conserva ===`,
      );
      continue;
    }
    const house = venues[index % venues.length];
    const [ed] = await db
      .insert(edition)
      .values({
        year: 2026,
        order: scenario.order,
        venueId: house?.id ?? null,
        startsAt: scenario.startsAt,
        endsAt: scenario.endsAt,
        isRehearsal: true,
      })
      .returning({ id: edition.id });
    if (!ed) throw new Error('No se pudo crear la edición.');
    log(
      `\n=== Edición 2026 · ${scenario.order} (${house?.name ?? 'sin casa'}) ===`,
    );
    const roster = shuffle(people).slice(0, scenario.team.players);
    await db
      .insert(editionPlayer)
      .values(roster.map((p) => ({ editionId: ed.id, playerId: p.id })));
    const ids: string[] = [];
    ids.push(
      await simulateTournament({
        admin,
        editionId: ed.id,
        scenario: scenario.team,
        roster,
        gameId: aotr.id,
        gameVersionId: version.id,
        personById,
      }),
    );
    ids.push(
      await simulateTournament({
        admin,
        editionId: ed.id,
        scenario: scenario.individual,
        roster: shuffle(people).slice(0, scenario.individual.players),
        gameId: aotr.id,
        gameVersionId: version.id,
        personById,
      }),
    );
    await foldIntoWeekend(ed.id, ids, scenario.startsAt, scenario.endsAt);
  }
  log('\nSimulaciones terminadas.');
  process.exit(0);
};

/** Re-folds the timestamps of every simulated edition already in the database. */
const foldExisting = async () => {
  const rows = await db
    .select({
      id: edition.id,
      order: edition.order,
      startsAt: edition.startsAt,
      endsAt: edition.endsAt,
    })
    .from(edition)
    .where(eq(edition.isRehearsal, true));
  for (const ed of rows) {
    if (!ed.startsAt || !ed.endsAt) continue;
    const ids = (
      await db
        .select({ id: tournament.id })
        .from(tournament)
        .where(eq(tournament.editionId, ed.id))
    ).map((t) => t.id);
    if (ids.length === 0) continue;
    log(`Edición 2026 · ${ed.order}:`);
    await foldIntoWeekend(ed.id, ids, ed.startsAt, ed.endsAt);
  }
};

/**
 * Out with the unfinished simulations (editions of 2026 beyond the real
 * one); the finished ones stay and are skipped. `--reset` wipes them all.
 */
const resetSimulations = async (): Promise<Set<number>> => {
  const keepFinished = !process.argv.includes('--reset');
  const done = new Set<number>();
  const old = await db
    .select({ id: edition.id, order: edition.order })
    .from(edition)
    .where(eq(edition.isRehearsal, true));
  for (const ed of old) {
    const tournaments = await db
      .select({ id: tournament.id, stage: tournament.stage })
      .from(tournament)
      .where(eq(tournament.editionId, ed.id));
    if (
      keepFinished &&
      tournaments.length === 2 &&
      tournaments.every((t) => t.stage === 'completed')
    ) {
      done.add(ed.order);
      continue;
    }
    for (const t of tournaments) {
      const phaseIds = (
        await db
          .select({ id: phase.id })
          .from(phase)
          .where(eq(phase.tournamentId, t.id))
      ).map((p) => p.id);
      if (phaseIds.length > 0) {
        const matchIds = (
          await db
            .select({ id: match.id })
            .from(match)
            .where(inArray(match.phaseId, phaseIds))
        ).map((m) => m.id);
        if (matchIds.length > 0) {
          await db.delete(like).where(inArray(like.matchId, matchIds));
          await db.delete(comment).where(inArray(comment.matchId, matchIds));
        }
      }
      await db.transaction((tx) => deleteTournamentCascade(tx, t.id));
    }
    await db.delete(like).where(eq(like.editionId, ed.id));
    await db.delete(comment).where(eq(comment.editionId, ed.id));
    await db.delete(editionPlayer).where(eq(editionPlayer.editionId, ed.id));
    await db.delete(edition).where(eq(edition.id, ed.id));
    log(`Borrada la simulación anterior 2026 · ${ed.order}.`);
  }
  return done;
};

const simulateTournament = async (input: {
  admin: Caller;
  editionId: string;
  scenario: TournamentScenario;
  roster: Person[];
  gameId: string;
  gameVersionId: string;
  personById: Map<string, Person>;
}): Promise<string> => {
  const { admin, scenario, roster, personById } = input;
  const label = scenario.kind === 'team' ? 'Equipos' : 'Individual';
  const { id } = await admin.tournament.create({
    editionId: input.editionId,
    kind: scenario.kind,
    isOfficial: true,
    gameId: input.gameId,
    gameVersionId: input.gameVersionId,
    model: scenario.model,
    teamSize: scenario.teamSize,
    rankingSource: scenario.rankingSource,
    historicalWeightPercent: scenario.historicalWeightPercent ?? null,
    participantPlayerIds: roster.map((p) => p.id),
  });
  log(
    `-- ${label}: ${roster.length} jugadores, equipos de ${scenario.teamSize}, ranking ${scenario.rankingSource}, formación ${scenario.formation.method}`,
  );
  const read = async () => {
    const state = await retry(() => getLiveState(db, id, { privileged: true }));
    if (!state) throw new Error('El torneo desapareció.');
    return state;
  };

  // Start; vote when the ranking asks for it.
  await admin.tournament.start({ tournamentId: id });
  let state = await read();
  if (state.stage === 'voting') {
    for (const voter of roster) {
      const others = roster.filter((p) => p.id !== voter.id);
      // Everyone roughly agrees with history, with their own opinions.
      const order = [...others]
        .map((p) => ({ id: p.id, key: p.historicalPosition + rand() * 6 - 3 }))
        .sort((a, b) => a.key - b.key)
        .map((p) => p.id);
      await voter.caller.vote.submit({ tournamentId: id, order });
    }
    await admin.tournament.closeVoting({ tournamentId: id });
    log(`   votación: ${roster.length} papeletas`);
  }
  await admin.tournament.confirmRanking({ tournamentId: id });
  await admin.tournament.confirmPots({ tournamentId: id });
  state = await read();
  log(
    `   bombos: ${state.pots.map((p) => p.length).join('/')} · ${state.teams.length} equipos`,
  );

  // Formation.
  await admin.formation.setMethod({
    tournamentId: id,
    method: scenario.formation.method,
  });
  const captains = state.teams
    .map((t) => t.members.find((m) => m.isCaptain)?.playerId)
    .filter((c): c is string => c !== undefined);
  if (scenario.formation.method === 'draft') {
    await admin.formation.startDraft({
      tournamentId: id,
      method: scenario.formation.draft,
      captainOrderMethod: scenario.formation.order,
    });
    await runDraft(id, personById);
    await admin.formation.finish({ tournamentId: id });
  } else if (scenario.formation.method === 'auction') {
    await admin.formation.startAuction({ tournamentId: id, config: {} });
    await runAuction(id, admin, personById);
    await admin.formation.finish({ tournamentId: id });
  } else {
    await admin.formation.startRandom({ tournamentId: id });
  }
  if (scenario.kind === 'team') {
    for (const [index, captainId] of shuffle(captains).entries()) {
      const name = TEAM_NAMES[index];
      if (!name || rand() < 0.3) continue;
      await personById.get(captainId)?.caller.formation.nameTeam({
        tournamentId: id,
        name,
      });
    }
  }
  state = await read();
  log(
    `   equipos: ${state.teams.map((t) => `${t.name ?? 'Equipo'} (${t.members.map((m) => m.name).join(', ')})`).join(' | ')}`,
  );

  // Phases.
  await admin.phases.savePlan({
    tournamentId: id,
    phases: scenario.phases(state.teams.length),
  });
  await admin.phases.generateFirst({ tournamentId: id });
  await admin.phases.startPlay({ tournamentId: id });

  // Play until the crown.
  let undone = !scenario.undoFirst;
  for (let guard = 0; guard < 400; guard += 1) {
    state = await read();
    if (state.stage === 'completed') break;
    const phase = activePhase(state);
    if (!phase) throw new Error('No hay fase activa.');
    const pending = phase.matches.filter(
      (m) => !m.byeTeamId && m.status !== 'completed' && m.teamAId && m.teamBId,
    );
    if (pending.length > 0) {
      const m = pending[0] as LiveMatch;
      const captainFlow = scenario.captainFlowPhases.includes(phase.order);
      const seeds = phase.groups.find((g) => g.id === m.groupId)?.teamIds ?? [];
      const wanted =
        scenario.decide?.({ match: m, phase, state, seeds }) ??
        strongerSide(state, m);
      await playMatch({
        admin,
        state,
        phase,
        match: m,
        wanted,
        captainFlow,
        personById,
      });
      if (!undone) {
        undone = true;
        await undoAndOverride(admin, id, m.id);
      }
      continue;
    }
    // Nothing to play: ties to settle, or the next phase to generate.
    const ties = openTies(state, phase);
    if (ties.length > 0) {
      const tie = ties[0] as { groupId: string; teamIds: string[] };
      const chain = phase.group?.tiebreakChain ?? [];
      if (chain.includes('tiebreak_match')) {
        const tiebreaks = phase.matches.filter(
          (m) => m.isTiebreak && m.groupId === tie.groupId,
        );
        if (tiebreaks.length === 0) {
          await admin.match.createTiebreakMatches({
            tournamentId: id,
            phaseId: phase.id,
            groupId: tie.groupId,
            teamIds: tie.teamIds,
          });
          log(
            `   desempate: partidos extra entre ${tie.teamIds.length} equipos`,
          );
          continue;
        }
        // The extra matches are played: their record orders the tie.
        const wins = new Map(tie.teamIds.map((t) => [t, 0]));
        for (const m of tiebreaks)
          if (m.winnerTeamId)
            wins.set(m.winnerTeamId, (wins.get(m.winnerTeamId) ?? 0) + 1);
        const order = [...tie.teamIds].sort(
          (a, b) => (wins.get(b) ?? 0) - (wins.get(a) ?? 0),
        );
        await admin.match.resolveTie({
          tournamentId: id,
          phaseId: phase.id,
          groupId: tie.groupId,
          teamIds: order,
          method: 'manual',
        });
        log('   desempate resuelto con los partidos extra');
      } else {
        await admin.match.resolveTie({
          tournamentId: id,
          phaseId: phase.id,
          groupId: tie.groupId,
          teamIds: tie.teamIds,
          method: 'draw',
        });
        log(`   desempate a suertes entre ${tie.teamIds.length}`);
      }
      continue;
    }
    const next = state.phases.find((p) => p.order > phase.order);
    if (!next) throw new Error(`La fase ${phase.order} terminó sin corona.`);
    await admin.match.generateNext({ tournamentId: id });
    log(`   fase ${next.order} generada`);
  }
  state = await read();
  if (state.stage !== 'completed') throw new Error('El torneo no terminó.');
  const winner = state.teams.find((t) => t.id === champion(state));
  log(`   campeones: ${winner?.members.map((m) => m.name).join(', ')}`);

  // Comments on the wall and on the final's sheet.
  for (const body of scenario.comments ?? []) {
    const author = pick(roster);
    await author.caller.social.addComment({
      target: { editionId: input.editionId },
      body,
    });
  }
  if (scenario.comments) {
    const last = [...state.phases].reverse().find((p) => p.matches.length > 0);
    const final = last?.matches.at(-1);
    if (final) {
      await pick(roster).caller.social.addComment({
        target: { matchId: final.id },
        body: 'Qué partido. Guardad el replay, que esto hay que verlo otra vez.',
      });
    }
  }
  return id;
};

/** The better-ranked side wins more often than not. */
const strongerSide = (state: LiveState, m: LiveMatch) => {
  const strength = (teamId: string | null) => {
    const team = state.teams.find((t) => t.id === teamId);
    const ranking = state.ranking ?? [];
    if (!team || team.members.length === 0) return ranking.length;
    return (
      team.members.reduce((sum, member) => {
        const index = ranking.indexOf(member.playerId);
        return sum + (index === -1 ? ranking.length : index);
      }, 0) / team.members.length
    );
  };
  const gap = strength(m.teamBId) - strength(m.teamAId);
  const pA = 1 / (1 + Math.exp(-gap / 4));
  return rand() < pA ? m.teamAId : m.teamBId;
};

/** One match to its end, game by game, through the captains or the organiser. */
const playMatch = async (input: {
  admin: Caller;
  state: LiveState;
  phase: LivePhase;
  match: LiveMatch;
  wanted: string | null;
  captainFlow: boolean;
  personById: Map<string, Person>;
}) => {
  const { admin, phase, personById } = input;
  const tournamentId = input.state.id;
  const toWin = gamesToWinFor(phase, input.match);
  const wanted = input.wanted ?? input.match.teamAId;
  const other =
    wanted === input.match.teamAId ? input.match.teamBId : input.match.teamAId;
  if (!wanted || !other) throw new Error('Partido sin equipos.');
  let wins = 0;
  let losses = 0;
  for (let g = 0; g < 9; g += 1) {
    // The wanted side wins, with the odd game dropped for drama.
    const winner: string = losses < toWin - 1 && rand() < 0.3 ? other : wanted;
    if (winner === wanted) wins += 1;
    else losses += 1;
    if (input.captainFlow) {
      await playGameAsCaptains({
        state: input.state,
        matchId: input.match.id,
        winner,
        personById,
      });
    } else {
      await admin.match.setResult({
        tournamentId,
        matchId: input.match.id,
        gameId: null,
        winnerTeamId: winner,
      });
    }
    if (wins >= toWin) break;
  }
};

/** Ready → draw → line-ups → confirm → map → the loser concedes. */
const playGameAsCaptains = async (input: {
  state: LiveState;
  matchId: string;
  winner: string;
  personById: Map<string, Person>;
}) => {
  const tournamentId = input.state.id;
  const fresh = await retry(() =>
    getLiveState(db, tournamentId, { privileged: true }),
  );
  if (!fresh) throw new Error('El torneo desapareció.');
  const m = fresh.phases
    .flatMap((p) => p.matches)
    .find((x) => x.id === input.matchId);
  if (!m) throw new Error('El partido desapareció.');
  const sides = [m.teamAId, m.teamBId].map((teamId) => {
    const team = fresh.teams.find((t) => t.id === teamId);
    const captainId = team?.members.find((x) => x.isCaptain)?.playerId;
    const captain = captainId ? input.personById.get(captainId) : undefined;
    if (!team || !captain) throw new Error('Un equipo sin capitán con cuenta.');
    return { team, captain };
  });
  for (const side of sides)
    await side.captain.caller.match.ready({ tournamentId, matchId: m.id });
  const drawn = await retry(() =>
    getLiveState(db, tournamentId, { privileged: true }),
  );
  const game = drawn?.phases
    .flatMap((p) => p.matches)
    .find((x) => x.id === m.id)
    ?.games.find((x) => x.status !== 'completed');
  if (!game) throw new Error('No se abrió la partida.');
  if (game.draws.length > 0) {
    for (const side of sides) {
      const factions = shuffle(
        game.draws
          .filter((d) => d.teamId === side.team.id)
          .map((d) => d.factionId),
      );
      await side.captain.caller.match.setLineup({
        tournamentId,
        matchId: m.id,
        assignments: side.team.members.map((member, index) => ({
          playerId: member.playerId,
          factionId: factions[index] as string,
        })),
      });
    }
    for (const side of sides)
      await side.captain.caller.match.confirmLineup({
        tournamentId,
        matchId: m.id,
      });
  }
  if (fresh.maps.length > 0) {
    const map = pick(fresh.maps);
    await sides[0]?.captain.caller.match.setMap({
      tournamentId,
      matchId: m.id,
      gameId: game.id,
      map: map.name,
      mapId: map.id,
    });
  }
  const loser = sides.find((s) => s.team.id !== input.winner);
  if (!loser) throw new Error('Nadie pierde.');
  await loser.captain.caller.match.declareLoss({ tournamentId, matchId: m.id });
};

/** The organiser's second thoughts: override the result, undo it, set it back. */
const undoAndOverride = async (
  admin: Caller,
  tournamentId: string,
  matchId: string,
) => {
  const state = await retry(() =>
    getLiveState(db, tournamentId, { privileged: true }),
  );
  const m = state?.phases
    .flatMap((p) => p.matches)
    .find((x) => x.id === matchId);
  const game = m?.games.find((g) => g.status === 'completed');
  if (!m || !game || !game.winnerTeamId) return;
  const other = game.winnerTeamId === m.teamAId ? m.teamBId : m.teamAId;
  if (!other) return;
  await admin.match.setResult({
    tournamentId,
    matchId,
    gameId: game.id,
    winnerTeamId: other,
  });
  const after = await retry(() =>
    getLiveState(db, tournamentId, { privileged: true }),
  );
  const changed = after?.phases
    .flatMap((p) => p.matches)
    .find((x) => x.id === matchId)
    ?.games.filter((g) => g.status === 'completed')
    .at(-1);
  if (!changed) return;
  await admin.match.undoGame({ tournamentId, matchId, gameId: changed.id });
  await admin.match.setResult({
    tournamentId,
    matchId,
    gameId: null,
    winnerTeamId: game.winnerTeamId,
  });
  log('   resultado corregido, deshecho y vuelto a anotar');
};

const runDraft = async (
  tournamentId: string,
  personById: Map<string, Person>,
) => {
  for (let guard = 0; guard < 200; guard += 1) {
    const { state: room } = await retry(() =>
      loadRoom(db as unknown as Tx, tournamentId, 'draft'),
    );
    if (room.phase === 'closed' || !room.currentCaptainId) return;
    const captain = personById.get(room.currentCaptainId);
    if (!captain) throw new Error('Capitán sin cuenta en el draft.');
    const option = pick(optionsFor(room, captain.id));
    // Captains lean towards the best available, with a little whim.
    const playerId =
      rand() < 0.6 ? (option.players[0] as string) : pick(option.players);
    await captain.caller.formation.pick({
      tournamentId,
      potIndex: option.potIndex,
      playerId,
    });
  }
  throw new Error('El draft no terminó.');
};

const runAuction = async (
  tournamentId: string,
  admin: Caller,
  personById: Map<string, Person>,
) => {
  const settleNow = () =>
    retry(() =>
      applyRoomCommand(
        db,
        tournamentId,
        { userId: null },
        'auction',
        (room) => ({
          events: settle(room, room.deadlineAt ?? Date.now()),
        }),
      ),
    );
  for (let guard = 0; guard < 600; guard += 1) {
    const { state: room } = await retry(() =>
      loadRoom(db as unknown as Tx, tournamentId, 'auction'),
    );
    if (room.phase === 'closed') return;
    if (room.phase === 'idle') {
      await admin.formation.confirmNext({ tournamentId });
    } else if (room.phase === 'lot_open' || room.phase === 'countdown') {
      const bidders = eligibleBidders(room).filter(
        (c) => (room.budgets[c] ?? 0) >= minNextBid(room),
      );
      const keen = room.phase === 'lot_open' ? 0.85 : 0.45;
      if (bidders.length > 0 && rand() < keen) {
        const captain = personById.get(pick(bidders));
        if (!captain) throw new Error('Capitán sin cuenta en la subasta.');
        const floor = minNextBid(room);
        const budget = room.budgets[captain.id] ?? 0;
        const amount = Math.min(budget, floor + (rand() < 0.3 ? 1 : 0));
        await captain.caller.formation.bid({ tournamentId, amount });
      } else {
        await settleNow();
      }
    } else if (room.phase === 'lockout') {
      await settleNow();
    } else if (room.phase === 'unsold_wait') {
      await admin.formation.confirmSkip({ tournamentId });
    } else if (room.phase === 'raffle_wait') {
      await admin.formation.raffle({ tournamentId });
    } else {
      throw new Error(`Fase de subasta inesperada: ${room.phase}.`);
    }
  }
  throw new Error('La subasta no terminó.');
};

/**
 * Folds the edition's tournaments into its weekend (Friday 17:00 to
 * Sunday 19:00, Madrid): the event log is mapped linearly from the
 * minutes the simulation took, keeping order and pacing, and every other
 * timestamp is then rebuilt from the events it came from, so games,
 * votes, picks, lots and rooms agree with the log to the millisecond.
 * Running it again on a folded edition changes nothing.
 */
const foldIntoWeekend = async (
  editionId: string,
  tournamentIds: string[],
  startsAt: string,
  endsAt: string,
) => {
  const ids = sql.join(
    tournamentIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const sim = sql`(${ids})`;
  const [span] = (await db.execute(sql`
    SELECT min(at)::text AS t0, max(at)::text AS t1
    FROM frikiparty_tournament_event WHERE tournament_id IN ${sim}
  `)) as unknown as { t0: string | null; t1: string | null }[];
  if (!span?.t0 || !span.t1) return;
  if (span.t1 > `${endsAt} 23:59:59`) {
    // 15:00 UTC is 17:00 in Madrid in summer (16:00 in winter): near enough.
    const start = sql`${`${startsAt} 15:00:00`}::timestamp`;
    const seconds =
      (Date.parse(`${endsAt}T17:00:00Z`) -
        Date.parse(`${startsAt}T15:00:00Z`)) /
      1000;
    await retry(() =>
      db.execute(sql`
        UPDATE frikiparty_tournament_event SET at = ${start}
          + (at - ${span.t0}::timestamp)
          * (${seconds}::float8 / greatest(1, extract(epoch from (${span.t1}::timestamp - ${span.t0}::timestamp))))
        WHERE tournament_id IN ${sim}
      `),
    );
  }
  const ev = sql.raw('frikiparty_tournament_event');
  const statements = [
    sql`UPDATE frikiparty_tournament t SET
      created_at = (SELECT min(at) FROM ${ev} e WHERE e.tournament_id = t.id),
      stage_changed_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = t.id AND e.type = 'stage_changed')
      WHERE t.id IN ${sim}`,
    sql`UPDATE frikiparty_team t SET created_at = (SELECT min(at) FROM ${ev} e WHERE e.tournament_id = t.tournament_id)
      WHERE t.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_team_member tm SET created_at = COALESCE(
      (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = tm.tournament_id
        AND e.type = CASE WHEN tm.is_captain THEN 'captains_assigned' ELSE 'stage_changed' END
        AND (tm.is_captain OR e.payload->>'to' = 'teams_ready')),
      (SELECT min(at) FROM ${ev} e WHERE e.tournament_id = tm.tournament_id))
      WHERE tm.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_phase ph SET created_at = COALESCE(
      (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id AND e.type = 'phase_plan_saved'),
      (SELECT min(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id))
      WHERE ph.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_phase_group_config c SET created_at = ph.created_at
      FROM frikiparty_phase ph WHERE ph.id = c.phase_id AND ph.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_tournament_swiss_config c SET created_at =
      (SELECT min(created_at) FROM frikiparty_phase ph WHERE ph.tournament_id = c.tournament_id)
      WHERE c.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_match m SET
      created_at = COALESCE((SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id
        AND ((e.type = 'phase_generated' AND e.payload->>'phaseId' = ph.id::text)
          OR (m.is_tiebreak AND e.type = 'tiebreak_matches_created' AND e.payload->>'phaseId' = ph.id::text))), ph.created_at),
      played_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id
        AND e.type = 'match_completed' AND e.payload->>'matchId' = m.id::text)
      FROM frikiparty_phase ph WHERE ph.id = m.phase_id AND ph.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_match_game g SET
      played_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id AND e.type = 'game_completed' AND e.payload->>'gameId' = g.id::text),
      started_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id AND e.type = 'game_started' AND e.payload->>'gameId' = g.id::text),
      ready_team_a_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id AND e.type = 'captain_ready' AND e.payload->>'gameId' = g.id::text AND e.payload->>'side' = 'A'),
      ready_team_b_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id AND e.type = 'captain_ready' AND e.payload->>'gameId' = g.id::text AND e.payload->>'side' = 'B'),
      confirmed_team_a_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id AND e.type = 'lineup_confirmed' AND e.payload->>'gameId' = g.id::text AND e.payload->>'teamId' = m.team_a_id::text),
      confirmed_team_b_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = ph.tournament_id AND e.type = 'lineup_confirmed' AND e.payload->>'gameId' = g.id::text AND e.payload->>'teamId' = m.team_b_id::text)
      FROM frikiparty_match m JOIN frikiparty_phase ph ON ph.id = m.phase_id
      WHERE m.id = g.match_id AND ph.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_tournament_vote v SET submitted_at = COALESCE(
      (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = v.tournament_id AND e.type = 'vote_submitted' AND e.payload->>'playerId' = v.voter_player_id::text),
      (SELECT min(at) FROM ${ev} e WHERE e.tournament_id = v.tournament_id))
      WHERE v.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_draft d SET created_at = COALESCE(
      (SELECT min(at) FROM ${ev} e WHERE e.tournament_id = d.tournament_id AND e.stream = 'draft'), created_at)
      WHERE d.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_draft_pick p SET picked_at = COALESCE(
      (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = d.tournament_id AND e.type = 'player_picked' AND e.payload->>'playerId' = p.picked_player_id::text), d.created_at)
      FROM frikiparty_draft d WHERE d.id = p.draft_id AND d.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_auction a SET created_at = COALESCE(
      (SELECT min(at) FROM ${ev} e WHERE e.tournament_id = a.tournament_id AND e.stream = 'auction'), created_at)
      WHERE a.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_auction_lot l SET sold_at = COALESCE(
      (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = a.tournament_id AND e.type IN ('lot_sold', 'lot_auto_assigned') AND e.payload->>'playerId' = l.player_id::text),
      (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = a.tournament_id AND e.type = 'raffle_assigned' AND e.payload::text LIKE '%' || l.player_id::text || '%'),
      a.created_at)
      FROM frikiparty_auction a WHERE a.id = l.auction_id AND a.tournament_id IN ${sim}`,
    // Bids keep their order, a dozen seconds apart, closing on the sale.
    sql`UPDATE frikiparty_auction_bid b SET bid_at = l.sold_at
      - make_interval(secs => 12 * (SELECT count(*) FROM frikiparty_auction_bid b2 WHERE b2.lot_id = b.lot_id AND b2.amount > b.amount))
      - interval '5 seconds'
      FROM frikiparty_auction_lot l JOIN frikiparty_auction a ON a.id = l.auction_id
      WHERE l.id = b.lot_id AND a.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_live_room r SET
      created_at = (SELECT min(at) FROM ${ev} e WHERE e.tournament_id = r.tournament_id AND e.stream = r.kind),
      updated_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = r.tournament_id AND e.stream = r.kind),
      deadline_at = NULL
      WHERE r.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_live_version v SET updated_at = (SELECT max(at) FROM ${ev} e WHERE e.tournament_id = v.tournament_id)
      WHERE v.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_comment c SET created_at = (SELECT max(at) + interval '20 minutes' FROM ${ev} e WHERE e.tournament_id IN ${sim})
      WHERE c.edition_id = ${editionId}::uuid`,
    sql`UPDATE frikiparty_comment c SET created_at = m.played_at + interval '10 minutes'
      FROM frikiparty_match m JOIN frikiparty_phase ph ON ph.id = m.phase_id
      WHERE m.id = c.match_id AND m.played_at IS NOT NULL AND ph.tournament_id IN ${sim}`,
    sql`UPDATE frikiparty_edition_player ep SET confirmed_at = (SELECT min(at) - interval '20 days' FROM ${ev} e WHERE e.tournament_id IN ${sim})
      WHERE ep.edition_id = ${editionId}::uuid`,
    sql`UPDATE frikiparty_edition e SET created_at = (SELECT min(at) - interval '40 days' FROM ${ev} ev WHERE ev.tournament_id IN ${sim})
      WHERE e.id = ${editionId}::uuid`,
  ];
  for (const statement of statements) await retry(() => db.execute(statement));
  log(`   fechas plegadas al fin de semana ${startsAt} → ${endsAt}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
