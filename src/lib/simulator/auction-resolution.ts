import {
  computeAuctionOrder,
  computeBudget,
  computeMinBidsByPot,
  getEligibleBidders,
  getMinNextBid,
  resolveAutoAssign,
} from '@/lib/simulator/auction';
import type { AuctionState, Pots } from '@/lib/simulator/types';

const LOCKOUT_MS = 1_500;
const COUNTDOWN_MS = 10_000;

/** Fresh auction seeded from a confirmed pot/captain set, ready to run. */
const createAuctionState = (
  pots: Pots,
  captainIds: string[],
  now: number,
): AuctionState => {
  const minBidByPot = computeMinBidsByPot(pots);
  const budget = computeBudget(minBidByPot);
  const lots = computeAuctionOrder(pots);
  return {
    budgets: Object.fromEntries(captainIds.map((id) => [id, budget])),
    minBidByPot,
    lots,
    currentLotIndex: 0,
    currentBid: null,
    status: lots.length > 0 ? 'open' : 'closed',
    lockoutEndsAt: null,
    countdownEndsAt: lots.length > 0 ? now + COUNTDOWN_MS : null,
    rosters: Object.fromEntries(captainIds.map((id) => [id, [] as string[]])),
  };
};

/** A validated bid, or a human-readable reason it was rejected. */
const applyBid = (
  auction: AuctionState,
  pots: Pots,
  captainIds: string[],
  captainId: string,
  amount: number,
  now: number,
): AuctionState | { error: string } => {
  if (auction.status !== 'open') {
    return { error: 'La puja no está abierta ahora mismo.' };
  }
  const eligible = getEligibleBidders(auction, pots, captainIds);
  if (!eligible.includes(captainId)) {
    return { error: 'No puedes pujar por este jugador.' };
  }
  const minNextBid = getMinNextBid(auction);
  if (amount < minNextBid) {
    return { error: `La puja mínima ahora mismo es ${minNextBid}.` };
  }
  return {
    ...auction,
    currentBid: { captainId, amount, timestamp: now },
    status: 'lockout',
    lockoutEndsAt: now + LOCKOUT_MS,
    countdownEndsAt: null,
  };
};

/**
 * Moves on to the next lot. Whenever that crosses into a different pot (or
 * off the end of the auction), sweeps up any player from the pot just
 * finished who never got a bid — including ones skipped earlier in that
 * same pot's queue — onto whichever captains still need one from it. This
 * runs after every resolution (bid-won or not), so a pot's leftovers can
 * never be silently dropped regardless of how many of its lots went unbid.
 */
const finishLot = (
  auction: AuctionState,
  pots: Pots,
  captainIds: string[],
  now: number,
): AuctionState => {
  const currentPotIndex = auction.lots[auction.currentLotIndex]?.potIndex;
  const nextIndex = auction.currentLotIndex + 1;
  const nextPotIndex = auction.lots[nextIndex]?.potIndex;
  const leavingPot =
    currentPotIndex !== undefined && currentPotIndex !== nextPotIndex;

  let budgets = auction.budgets;
  let rosters = auction.rosters;
  if (leavingPot) {
    const minPrice = auction.minBidByPot[currentPotIndex] ?? 0;
    const assignments = resolveAutoAssign(auction, pots, captainIds);
    budgets = { ...budgets };
    rosters = { ...rosters };
    for (const assignment of assignments) {
      const cost = Math.min(budgets[assignment.captainId] ?? 0, minPrice);
      budgets[assignment.captainId] =
        (budgets[assignment.captainId] ?? 0) - cost;
      rosters[assignment.captainId] = [
        ...(rosters[assignment.captainId] ?? []),
        assignment.playerId,
      ];
    }
  }

  const closed = nextIndex >= auction.lots.length;
  return {
    ...auction,
    budgets,
    rosters,
    currentLotIndex: nextIndex,
    status: closed ? 'closed' : 'open',
    currentBid: null,
    lockoutEndsAt: null,
    countdownEndsAt: closed ? null : now + COUNTDOWN_MS,
  };
};

/** One resolution step for the current lot's expired deadline. */
const resolveLotTimeoutOnce = (
  auction: AuctionState,
  pots: Pots,
  captainIds: string[],
  now: number,
): AuctionState => {
  const lot = auction.lots[auction.currentLotIndex];
  if (!lot) return auction;

  if (auction.currentBid) {
    const winnerId = auction.currentBid.captainId;
    const amount = auction.currentBid.amount;
    const awarded: AuctionState = {
      ...auction,
      budgets: {
        ...auction.budgets,
        [winnerId]: (auction.budgets[winnerId] ?? 0) - amount,
      },
      rosters: {
        ...auction.rosters,
        [winnerId]: [...(auction.rosters[winnerId] ?? []), lot.playerId],
      },
    };
    return finishLot(awarded, pots, captainIds, now);
  }

  return finishLot(auction, pots, captainIds, now);
};

/** The lockout window closing: reopens bidding with a fresh countdown. */
const resolveLockoutEnded = (
  auction: AuctionState,
  now: number,
): AuctionState => {
  if (auction.status !== 'lockout') return auction;
  return {
    ...auction,
    status: 'open',
    lockoutEndsAt: null,
    countdownEndsAt: now + COUNTDOWN_MS,
  };
};

export {
  applyBid,
  COUNTDOWN_MS,
  createAuctionState,
  LOCKOUT_MS,
  resolveLockoutEnded,
  resolveLotTimeoutOnce,
};
