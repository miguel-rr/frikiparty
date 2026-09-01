'use client';

import { btn } from '@/components/theme/primitives';
import { getMinNextBid } from '@/lib/tournament/auction';
import type { AuctionState } from '@/lib/tournament/types';

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
        className={`${btn.primary} px-4 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
        disabled={disabled}
        onClick={() => onBid(minBid)}
        type="button"
      >
        Pujar {minBid}
      </button>
      {RAISES.map((raise) => (
        <button
          className={`${btn.secondary} px-4 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
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
