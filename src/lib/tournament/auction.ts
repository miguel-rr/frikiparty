import { shuffle } from '@/lib/tournament/ranking';
import type { AuctionLot, AuctionState, Pots } from '@/lib/tournament/types';

/**
 * Minimum price per pot, indexed like `pots` (index 0, the captains' pot,
 * is never auctioned and stays 0). The worst auctioned pot costs 50, the
 * next one up 100, and so on — matching the source spec's worked examples.
 */
const computeMinBidsByPot = (pots: Pots): number[] => {
  const auctionableCount = pots.length - 1;
  const minBids = new Array(pots.length).fill(0);
  for (let potIndex = 1; potIndex < pots.length; potIndex++) {
    const distanceFromBest = potIndex - 1;
    minBids[potIndex] = 50 * (auctionableCount - distanceFromBest);
  }
  return minBids;
};

/** Every captain gets the same budget: 2x the sum of every pot's min price. */
const computeBudget = (minBidByPot: number[]): number =>
  2 * minBidByPot.reduce((total, price) => total + price, 0);

/**
 * Full lot queue: starts at the best auctioned pot (pot index 1, right
 * after the captains' pot) down to the worst, players shuffled within each
 * pot.
 */
const computeAuctionOrder = (pots: Pots): AuctionLot[] => {
  const lots: AuctionLot[] = [];
  for (let potIndex = 1; potIndex < pots.length; potIndex++) {
    for (const playerId of shuffle(pots[potIndex] ?? [])) {
      lots.push({ potIndex, playerId });
    }
  }
  return lots;
};

const getMinNextBid = (auction: AuctionState): number => {
  const currentLot = auction.lots[auction.currentLotIndex];
  if (!currentLot) return 0;
  if (auction.currentBid) return auction.currentBid.amount + 1;
  return auction.minBidByPot[currentLot.potIndex] ?? 50;
};

/** Captains without a player from this pot yet, regardless of budget. */
const getCaptainsNeedingPot = (
  auction: AuctionState,
  pots: Pots,
  captainIds: string[],
  potIndex: number,
): string[] => {
  const potPlayers = new Set(pots[potIndex] ?? []);
  return captainIds.filter((captainId) => {
    const roster = auction.rosters[captainId] ?? [];
    return !roster.some((playerId) => potPlayers.has(playerId));
  });
};

/**
 * Captains allowed to bid on the current lot: they don't already have a
 * player from this pot, and their remaining budget covers the next valid
 * bid.
 */
const getEligibleBidders = (
  auction: AuctionState,
  pots: Pots,
  captainIds: string[],
): string[] => {
  const currentLot = auction.lots[auction.currentLotIndex];
  if (!currentLot) return [];
  const needingCaptains = new Set(
    getCaptainsNeedingPot(auction, pots, captainIds, currentLot.potIndex),
  );
  const minNextBid = getMinNextBid(auction);
  return captainIds.filter(
    (captainId) =>
      needingCaptains.has(captainId) &&
      (auction.budgets[captainId] ?? 0) >= minNextBid,
  );
};

/**
 * Every player of `potIndex` who hasn't landed on any captain's roster yet
 * — covers both a never-bid-on player and one skipped earlier in the same
 * pot's queue, regardless of how far `currentLotIndex` has moved since.
 */
const getUnassignedPlayersInPot = (
  auction: AuctionState,
  pots: Pots,
  potIndex: number,
): string[] => {
  const assigned = new Set(Object.values(auction.rosters).flat());
  return (pots[potIndex] ?? []).filter((playerId) => !assigned.has(playerId));
};

/**
 * Pairs off a pot's still-unassigned players with the captains still
 * missing one from it — covering both the common "one player, one captain"
 * close and the broke-captains fallback where several leftover players get
 * handed out without a minimum price. Called once, when the pot the
 * current lot belongs to is about to be left behind.
 */
const resolveAutoAssign = (
  auction: AuctionState,
  pots: Pots,
  captainIds: string[],
): { captainId: string; playerId: string }[] => {
  const currentLot = auction.lots[auction.currentLotIndex];
  if (!currentLot) return [];
  const potIndex = currentLot.potIndex;
  const unassignedPlayers = getUnassignedPlayersInPot(auction, pots, potIndex);
  const needingCaptains = getCaptainsNeedingPot(
    auction,
    pots,
    captainIds,
    potIndex,
  );
  return unassignedPlayers
    .map((playerId, index) => ({
      captainId: needingCaptains[index] ?? needingCaptains.at(-1),
      playerId,
    }))
    .filter(
      (assignment): assignment is { captainId: string; playerId: string } =>
        assignment.captainId !== undefined,
    );
};

export {
  computeAuctionOrder,
  computeBudget,
  computeMinBidsByPot,
  getCaptainsNeedingPot,
  getEligibleBidders,
  getMinNextBid,
  resolveAutoAssign,
};
