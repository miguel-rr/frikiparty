import { sql } from 'drizzle-orm';

import type { db as Db } from '@/server/db';
import {
  type EventStream,
  liveVersion,
  tournamentEvent,
} from '@/server/db/schema';

type Database = typeof Db;

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

type Actor = {
  userId: string | null;
  /** The admin behind an "Entrar como" session, if any. */
  impersonatedByUserId?: string | null;
};

type EventInput = {
  stream: EventStream;
  type: string;
  payload?: Record<string, unknown>;
  /** When the fact happened; defaults to now. Timers pass their deadline. */
  at?: Date;
};

type TournamentTx = {
  tx: Tx;
  /** Appends to the tournament's event log; seq is handed out in order. */
  emit: (event: EventInput) => Promise<number>;
};

/**
 * Every write the live module makes goes through here: one transaction
 * per action, the tournament's live_version row locked first so writers
 * to the same tournament run one at a time (which is what makes event
 * `seq` gap-free and lets timers resolve lazily without racing), events
 * appended in that same transaction, and the version bumped at the end so
 * subscribers wake up.
 */
const runTournamentTx = async <T>(
  db: Database,
  tournamentId: string,
  actor: Actor,
  work: (ctx: TournamentTx) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.insert(liveVersion).values({ tournamentId }).onConflictDoNothing();
    await tx.execute(
      sql`SELECT version FROM ${liveVersion} WHERE ${liveVersion.tournamentId} = ${tournamentId} FOR UPDATE`,
    );
    const [last] = await tx
      .select({ seq: sql<number>`coalesce(max(${tournamentEvent.seq}), 0)` })
      .from(tournamentEvent)
      .where(sql`${tournamentEvent.tournamentId} = ${tournamentId}`);
    let seq = Number(last?.seq ?? 0);

    const emit = async (event: EventInput) => {
      seq += 1;
      await tx.insert(tournamentEvent).values({
        tournamentId,
        stream: event.stream,
        seq,
        type: event.type,
        payload: event.payload ?? {},
        at: event.at ?? new Date(),
        actorUserId: actor.userId,
        impersonatedByUserId: actor.impersonatedByUserId ?? null,
      });
      return seq;
    };

    const result = await work({ tx, emit });

    await tx
      .update(liveVersion)
      .set({
        version: sql`${liveVersion.version} + 1`,
        updatedAt: new Date(),
      })
      .where(sql`${liveVersion.tournamentId} = ${tournamentId}`);
    return result;
  });

/** The actor for an event, from a tRPC session (impersonation included). */
const actorFromSession = (
  session:
    | {
        user: { id: string };
        session: { impersonatedBy?: string | null };
      }
    | null
    | undefined,
): Actor => ({
  userId: session?.user.id ?? null,
  impersonatedByUserId: session?.session.impersonatedBy ?? null,
});

export {
  type Actor,
  actorFromSession,
  type EventInput,
  runTournamentTx,
  type TournamentTx,
  type Tx,
};
