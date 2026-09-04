import { TRPCError } from '@trpc/server';
import { and, asc, eq, inArray, lte } from 'drizzle-orm';

import {
  type AuctionEvent,
  type AuctionLiveState,
  type EventDraft,
  foldAuction,
  settle,
} from '@/lib/tournament/auction-live';
import { type DraftLiveState, foldDraft } from '@/lib/tournament/draft-live';
import type { db as Db } from '@/server/db';
import { liveRoom, tournamentEvent } from '@/server/db/schema';
import { type Actor, runTournamentTx, type Tx } from '@/server/live/tx';

type Database = typeof Db;

type RoomKind = 'draft' | 'auction';

type RoomState<K extends RoomKind> = K extends 'auction'
  ? AuctionLiveState
  : DraftLiveState;

/** The stream's events, folded state and the room row, inside a tx. */
const loadRoom = async <K extends RoomKind>(
  tx: Tx,
  tournamentId: string,
  kind: K,
) => {
  const rows = await tx
    .select({
      seq: tournamentEvent.seq,
      type: tournamentEvent.type,
      payload: tournamentEvent.payload,
      at: tournamentEvent.at,
      undoneBySeq: tournamentEvent.undoneBySeq,
    })
    .from(tournamentEvent)
    .where(
      and(
        eq(tournamentEvent.tournamentId, tournamentId),
        eq(tournamentEvent.stream, kind),
      ),
    )
    .orderBy(asc(tournamentEvent.seq));
  const events: AuctionEvent[] = rows.map((row) => ({
    seq: row.seq,
    type: row.type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    at: row.at.getTime(),
    undoneBySeq: row.undoneBySeq,
  }));
  const state = (
    kind === 'auction' ? foldAuction(events) : foldDraft(events)
  ) as RoomState<K>;
  return { events, state };
};

const roomStatus = (state: AuctionLiveState | DraftLiveState) =>
  state.phase === 'closed'
    ? 'closed'
    : state.phase === 'paused'
      ? 'paused'
      : 'open';

const roomDeadline = (
  kind: RoomKind,
  state: AuctionLiveState | DraftLiveState,
) =>
  kind === 'auction' && (state as AuctionLiveState).deadlineAt !== null
    ? new Date((state as AuctionLiveState).deadlineAt as number)
    : null;

/** Writes the folded state as the room's projection. */
const saveRoom = async (
  tx: Tx,
  tournamentId: string,
  kind: RoomKind,
  state: AuctionLiveState | DraftLiveState,
) => {
  await tx
    .insert(liveRoom)
    .values({
      tournamentId,
      kind,
      state,
      version: 1,
      lastSeq: state.lastSeq,
      deadlineAt: roomDeadline(kind, state),
      status: roomStatus(state),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [liveRoom.tournamentId, liveRoom.kind],
      set: {
        state,
        version: (await currentVersion(tx, tournamentId, kind)) + 1,
        lastSeq: state.lastSeq,
        deadlineAt: roomDeadline(kind, state),
        status: roomStatus(state),
        updatedAt: new Date(),
      },
    });
};

const currentVersion = async (tx: Tx, tournamentId: string, kind: RoomKind) => {
  const [row] = await tx
    .select({ version: liveRoom.version })
    .from(liveRoom)
    .where(
      and(eq(liveRoom.tournamentId, tournamentId), eq(liveRoom.kind, kind)),
    );
  return row?.version ?? 0;
};

type Proposal =
  | { events: EventDraft[]; undoneSeqs?: number[] }
  | { error: string };

/**
 * One formation action: fold the stream, ask the engine what follows,
 * append it (marking undone events when it's an undo), refold and save.
 * Everything inside the tournament's serialised transaction.
 */
const applyRoomCommand = async <K extends RoomKind>(
  db: Database,
  tournamentId: string,
  actor: Actor,
  kind: K,
  decide: (state: RoomState<K>, events: AuctionEvent[]) => Proposal,
) =>
  runTournamentTx(db, tournamentId, actor, async ({ tx, emit }) => {
    const { events, state } = await loadRoom(tx, tournamentId, kind);
    const proposal = decide(state, events);
    if ('error' in proposal) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: proposal.error });
    }
    let undoSeq: number | null = null;
    for (const event of proposal.events) {
      const seq = await emit({
        stream: kind,
        type: event.type,
        payload: event.payload,
        at: event.at === undefined ? undefined : new Date(event.at),
      });
      if (event.type === 'undo') undoSeq = seq;
    }
    if (
      proposal.undoneSeqs &&
      proposal.undoneSeqs.length > 0 &&
      undoSeq !== null
    ) {
      await tx
        .update(tournamentEvent)
        .set({ undoneBySeq: undoSeq })
        .where(
          and(
            eq(tournamentEvent.tournamentId, tournamentId),
            inArray(tournamentEvent.seq, proposal.undoneSeqs),
          ),
        );
    }
    const refolded = await loadRoom(tx, tournamentId, kind);
    await saveRoom(tx, tournamentId, kind, refolded.state);
    return refolded.state;
  });

/**
 * Lazily resolves the auction's due timers (live plan §3.2): called by the
 * change subscription on every tick, it only opens a transaction when the
 * room's deadline has passed. Chains resolutions until nothing is due, so
 * a stalled server catches up in one go with the original timestamps.
 */
const settleAuctionTimers = async (db: Database, tournamentId: string) => {
  const [due] = await db
    .select({ id: liveRoom.id })
    .from(liveRoom)
    .where(
      and(
        eq(liveRoom.tournamentId, tournamentId),
        eq(liveRoom.kind, 'auction'),
        eq(liveRoom.status, 'open'),
        lte(liveRoom.deadlineAt, new Date()),
      ),
    );
  if (!due) return false;
  await runTournamentTx(
    db,
    tournamentId,
    { userId: null },
    async ({ tx, emit }) => {
      let { state } = await loadRoom(tx, tournamentId, 'auction');
      for (let guard = 0; guard < 10; guard += 1) {
        const dueEvents = settle(state, Date.now());
        if (dueEvents.length === 0) break;
        for (const event of dueEvents) {
          await emit({
            stream: 'auction',
            type: event.type,
            payload: event.payload,
            at: event.at === undefined ? undefined : new Date(event.at),
          });
        }
        ({ state } = await loadRoom(tx, tournamentId, 'auction'));
      }
      await saveRoom(tx, tournamentId, 'auction', state);
    },
  );
  return true;
};

export {
  applyRoomCommand,
  loadRoom,
  type RoomKind,
  type RoomState,
  saveRoom,
  settleAuctionTimers,
};
