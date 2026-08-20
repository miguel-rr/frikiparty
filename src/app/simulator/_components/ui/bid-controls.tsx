'use client';

import { getMinNextBid } from '@/lib/simulator/auction';
import type { AuctionState } from '@/lib/simulator/types';

type BidControlsProps = {
  auction: AuctionState;
  disabled: boolean;
  onBid: (amount: number) => void;
};

const RAISES = [1, 5, 10];

const BidControls = ({ auction, disabled, onBid }: BidControlsProps) => {
  const minBid = getMinNextBid(auction);
  const base = auction.currentBid ? auction.currentBid.amount : minBid;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-full bg-amber px-4 py-2 font-extrabold text-ground text-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        onClick={() => onBid(minBid)}
        type="button"
      >
        Pujar {minBid}
      </button>
      {RAISES.map((raise) => (
        <button
          className="rounded-full bg-panel-2 px-4 py-2 font-bold text-sm ring-1 ring-hair transition-colors hover:bg-hair disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          key={raise}
          onClick={() => onBid(base + raise)}
          type="button"
        >
          +{raise}
        </button>
      ))}
    </div>
  );
};

export { BidControls };
