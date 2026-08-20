'use client';

import { useEffect } from 'react';

import { useSimulator } from '@/app/simulator/_components/simulator-context';

/**
 * Owns every wall-clock effect for the live auction: schedules exactly one
 * setTimeout for whichever deadline is active (lockout or bidding
 * countdown) and lets React's cleanup cancel it whenever the auction state
 * moves on to a new deadline or the step unmounts.
 */
const useAuctionClock = (): void => {
  const { state, dispatch } = useSimulator();
  const auction = state.auction;

  useEffect(() => {
    if (!auction) return;

    if (auction.status === 'lockout' && auction.lockoutEndsAt !== null) {
      const delay = Math.max(0, auction.lockoutEndsAt - Date.now());
      const timeout = setTimeout(
        () => dispatch({ type: 'LOCKOUT_ENDED' }),
        delay,
      );
      return () => clearTimeout(timeout);
    }

    if (auction.status === 'open' && auction.countdownEndsAt !== null) {
      const delay = Math.max(0, auction.countdownEndsAt - Date.now());
      const timeout = setTimeout(
        () => dispatch({ type: 'LOT_TIMEOUT' }),
        delay,
      );
      return () => clearTimeout(timeout);
    }
  }, [auction, dispatch]);
};

export { useAuctionClock };
