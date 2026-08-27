import { shuffle } from '@/lib/tournament/ranking';
import type {
  CaptainOrderMethod,
  DraftMethod,
  DraftState,
  Pots,
} from '@/lib/tournament/types';

/**
 * Base turn order for the draft. `ranking`/`inverse-ranking` are derived
 * from the confirmed ranking; `fixed-random` draws one shuffle used for
 * every round; `full-random` also starts here, but `buildDraftOrder`
 * re-shuffles it independently on every round instead of reusing it.
 */
const buildCaptainOrder = (
  captainIds: string[],
  ranking: string[],
  method: CaptainOrderMethod,
): string[] => {
  if (method === 'ranking') {
    return [...captainIds].sort(
      (a, b) => ranking.indexOf(a) - ranking.indexOf(b),
    );
  }
  if (method === 'inverse-ranking') {
    return [...captainIds].sort(
      (a, b) => ranking.indexOf(b) - ranking.indexOf(a),
    );
  }
  return shuffle(captainIds);
};

/**
 * Full pick-by-pick turn queue: one round per pot, `captainIds.length`
 * picks per round. Snake reverses the round order every other round;
 * `full-random` ignores the snake/linear choice and reshuffles each round.
 */
const buildDraftOrder = (
  captainIds: string[],
  baseOrder: string[],
  potCount: number,
  captainOrderMethod: CaptainOrderMethod,
  draftMethod: DraftMethod,
): string[] => {
  const queue: string[] = [];
  for (let round = 0; round < potCount; round++) {
    if (captainOrderMethod === 'full-random') {
      queue.push(...shuffle(captainIds));
      continue;
    }
    const roundOrder =
      draftMethod === 'snake' && round % 2 === 1
        ? [...baseOrder].reverse()
        : baseOrder;
    queue.push(...roundOrder);
  }
  return queue;
};

const hasPickedFromPot = (
  draft: DraftState,
  captainId: string,
  potIndex: number,
): boolean =>
  draft.picks.some(
    (pick) => pick.captainId === captainId && pick.potIndex === potIndex,
  );

const getUndraftedPlayersInPot = (
  pots: Pots,
  draft: DraftState,
  potIndex: number,
): string[] => {
  const drafted = new Set(
    draft.picks
      .filter((pick) => pick.potIndex === potIndex)
      .map((pick) => pick.playerId),
  );
  return (pots[potIndex] ?? []).filter((playerId) => !drafted.has(playerId));
};

/**
 * Pots the current captain can still pick from: not theirs yet, not empty.
 * Pot 0 is never included — its members are the captains themselves, not a
 * draftable pool.
 */
const getAvailablePotIndices = (
  pots: Pots,
  draft: DraftState,
  captainId: string,
): number[] =>
  pots
    .map((_, potIndex) => potIndex)
    .filter(
      (potIndex) =>
        potIndex > 0 &&
        !hasPickedFromPot(draft, captainId, potIndex) &&
        getUndraftedPlayersInPot(pots, draft, potIndex).length > 0,
    );

/**
 * Whose turn it is: the first captain from `picks.length` onward in the
 * queue who still has *something* pickable right now. A pot shorter than
 * the team count (the last one, when players don't divide evenly) can
 * leave a captain with nothing at their nominal queue slot — skipping them
 * instead of returning them keeps the draft from deadlocking on a turn
 * nobody can take. Returns undefined once no one left in the queue has any
 * pot to pick from, which is what marks the draft complete.
 */
const resolveNextTurn = (draft: DraftState, pots: Pots): string | undefined => {
  for (
    let index = draft.picks.length;
    index < draft.turnQueue.length;
    index++
  ) {
    const candidate = draft.turnQueue[index];
    if (
      candidate &&
      getAvailablePotIndices(pots, draft, candidate).length > 0
    ) {
      return candidate;
    }
  }
  return undefined;
};

export {
  buildCaptainOrder,
  buildDraftOrder,
  getAvailablePotIndices,
  getUndraftedPlayersInPot,
  hasPickedFromPot,
  resolveNextTurn,
};
