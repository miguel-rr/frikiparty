import {
  buildCaptainOrder,
  buildDraftOrder,
  getAvailablePotIndices,
  getUndraftedPlayersInPot,
  resolveNextTurn,
} from '@/lib/tournament/draft';
import type {
  CaptainOrderMethod,
  DraftMethod,
  DraftState,
} from '@/lib/tournament/types';

/**
 * The live draft, event-sourced like the auction: `foldDraft(events)` is
 * the state; commands propose events. No clock — a pick happens when the
 * captain acts (live plan §6, F2). Pause blocks everyone; undo forgets the
 * last pick.
 */

type DraftLiveState = {
  pots: string[][];
  captainIds: string[];
  captainPotIndex: number;
  method: DraftMethod;
  captainOrderMethod: CaptainOrderMethod;
  /** First-round order; snake reverses it on odd rounds. */
  baseOrder: string[];
  turnQueue: string[];
  picks: {
    captainId: string;
    potIndex: number;
    playerId: string;
    at: number;
    seq: number;
  }[];
  phase: 'open' | 'paused' | 'closed';
  pausedPhase: 'open' | null;
  /** Whose turn it is (null once nobody has anything left to pick). */
  currentCaptainId: string | null;
  startedAt: number | null;
  closedAt: number | null;
  lastSeq: number;
};

type DraftEvent = {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  at: number;
  undoneBySeq: number | null;
};

type EventDraft = {
  type: string;
  payload?: Record<string, unknown>;
  at?: number;
};

type CommandResult = { events: EventDraft[] } | { error: string };

/** The draftable pots as the engine expects them: the captains' pot first at index 0. */
const engineDraftState = (state: DraftLiveState): DraftState => ({
  method: state.method,
  turnQueue: state.turnQueue,
  picks: state.picks.map(({ captainId, potIndex, playerId }) => ({
    captainId,
    potIndex,
    playerId,
  })),
});

/**
 * The pots as the pure engine wants them: index 0 must be the captains'
 * pot (never draftable). When captains come from another pot, that pot is
 * swapped to the front and the mapping kept so pot indices shown to people
 * stay the real ones.
 */
const potsForEngine = (pots: string[][], captainPotIndex: number) => {
  if (captainPotIndex === 0)
    return { pots, toReal: (i: number) => i, toEngine: (i: number) => i };
  const order = [
    captainPotIndex,
    ...pots.map((_, i) => i).filter((i) => i !== captainPotIndex),
  ];
  return {
    pots: order.map((i) => pots[i] ?? []),
    toReal: (i: number) => order[i] ?? i,
    toEngine: (i: number) => order.indexOf(i),
  };
};

const startDraftEvents = (input: {
  pots: string[][];
  captainIds: string[];
  captainPotIndex: number;
  ranking: string[];
  captainOrderMethod: CaptainOrderMethod;
  method: DraftMethod;
  /** Hand-edited first-round order; defaults to the method's. */
  baseOrder?: string[];
  now: number;
}): EventDraft[] => {
  const baseOrder =
    input.baseOrder ??
    buildCaptainOrder(
      input.captainIds,
      input.ranking,
      input.captainOrderMethod,
    );
  const turnQueue = buildDraftOrder(
    input.captainIds,
    baseOrder,
    input.pots.length,
    input.captainOrderMethod,
    input.method,
  );
  return [
    {
      type: 'draft_started',
      at: input.now,
      payload: {
        pots: input.pots,
        captainIds: input.captainIds,
        captainPotIndex: input.captainPotIndex,
        method: input.method,
        captainOrderMethod: input.captainOrderMethod,
        baseOrder,
        turnQueue,
      },
    },
  ];
};

const strList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];

const currentTurn = (state: DraftLiveState) => {
  const { pots, toEngine, toReal } = potsForEngine(
    state.pots,
    state.captainPotIndex,
  );
  const engine = engineDraftState(state);
  engine.picks = engine.picks.map((pick) => ({
    ...pick,
    potIndex: toEngine(pick.potIndex),
  }));
  const captain = resolveNextTurn(engine, pots);
  return { captain: captain ?? null, pots, toEngine, toReal, engine };
};

const foldDraft = (events: DraftEvent[]): DraftLiveState => {
  const state: DraftLiveState = {
    pots: [],
    captainIds: [],
    captainPotIndex: 0,
    method: 'snake',
    captainOrderMethod: 'inverse-ranking',
    baseOrder: [],
    turnQueue: [],
    picks: [],
    phase: 'open',
    pausedPhase: null,
    currentCaptainId: null,
    startedAt: null,
    closedAt: null,
    lastSeq: 0,
  };
  for (const event of events) {
    state.lastSeq = event.seq;
    if (event.undoneBySeq !== null) continue;
    const p = event.payload;
    switch (event.type) {
      case 'draft_started':
        state.pots = (p.pots as string[][]) ?? [];
        state.captainIds = strList(p.captainIds);
        state.captainPotIndex =
          typeof p.captainPotIndex === 'number' ? p.captainPotIndex : 0;
        state.method = (p.method as DraftMethod) ?? 'snake';
        state.captainOrderMethod =
          (p.captainOrderMethod as CaptainOrderMethod) ?? 'inverse-ranking';
        state.baseOrder = strList(p.baseOrder);
        state.turnQueue = strList(p.turnQueue);
        state.startedAt = event.at;
        state.phase = 'open';
        break;
      case 'player_picked':
        state.picks.push({
          captainId: String(p.captainId),
          potIndex: Number(p.potIndex),
          playerId: String(p.playerId),
          at: event.at,
          seq: event.seq,
        });
        break;
      case 'paused':
        state.pausedPhase = state.phase === 'open' ? 'open' : null;
        state.phase = 'paused';
        break;
      case 'resumed':
        state.phase = 'open';
        state.pausedPhase = null;
        break;
      case 'draft_closed':
        state.phase = 'closed';
        state.closedAt = event.at;
        break;
      default:
        break;
    }
  }
  state.currentCaptainId =
    state.phase === 'closed' ? null : currentTurn(state).captain;
  return state;
};

/** Pots (real indices) the captain may pick from now, and who's left in each. */
const optionsFor = (state: DraftLiveState, captainId: string) => {
  const { pots, engine, toReal } = currentTurn(state);
  return getAvailablePotIndices(pots, engine, captainId).map((enginePot) => ({
    potIndex: toReal(enginePot),
    players: getUndraftedPlayersInPot(pots, engine, enginePot),
  }));
};

const pickPlayer = (
  state: DraftLiveState,
  captainId: string,
  potIndex: number,
  playerId: string,
  now: number,
): CommandResult => {
  if (state.phase !== 'open') return { error: 'El draft no está en marcha.' };
  if (state.currentCaptainId !== captainId) return { error: 'No es tu turno.' };
  const option = optionsFor(state, captainId).find(
    (o) => o.potIndex === potIndex,
  );
  if (!option) return { error: 'No puedes elegir de ese bombo.' };
  if (!option.players.includes(playerId))
    return { error: 'Ese jugador ya no está disponible.' };
  return {
    events: [
      {
        type: 'player_picked',
        at: now,
        payload: { captainId, potIndex, playerId },
      },
    ],
  };
};

const pauseDraft = (state: DraftLiveState, now: number): CommandResult =>
  state.phase === 'open'
    ? { events: [{ type: 'paused', at: now, payload: {} }] }
    : { error: 'El draft no está en marcha.' };

const resumeDraft = (state: DraftLiveState, now: number): CommandResult =>
  state.phase === 'paused'
    ? { events: [{ type: 'resumed', at: now, payload: {} }] }
    : { error: 'El draft no está en pausa.' };

/** Organiser: forget the last pick. */
const undoPick = (
  events: DraftEvent[],
  state: DraftLiveState,
  now: number,
): { undoneSeqs: number[]; event: EventDraft } | { error: string } => {
  if (state.phase === 'closed') return { error: 'El draft ya está cerrado.' };
  const last = [...events]
    .reverse()
    .find((e) => e.undoneBySeq === null && e.type === 'player_picked');
  if (!last) return { error: 'No hay ninguna elección que deshacer.' };
  return {
    undoneSeqs: [last.seq],
    event: { type: 'undo', at: now, payload: { pickSeq: last.seq } },
  };
};

/** Whether every captain has picked all they can. */
const isDraftComplete = (state: DraftLiveState) =>
  state.phase !== 'closed' &&
  state.currentCaptainId === null &&
  state.startedAt !== null;

const closeDraft = (state: DraftLiveState, now: number): CommandResult =>
  isDraftComplete(state)
    ? { events: [{ type: 'draft_closed', at: now, payload: {} }] }
    : { error: 'Aún quedan elecciones por hacer.' };

export {
  closeDraft,
  type DraftEvent,
  type DraftLiveState,
  foldDraft,
  isDraftComplete,
  optionsFor,
  pauseDraft,
  pickPlayer,
  resumeDraft,
  startDraftEvents,
  undoPick,
};
