'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { BidControls } from '@/app/simulator/_components/ui/bid-controls';
import { CaptainBudgetHud } from '@/app/simulator/_components/ui/captain-budget-hud';
import { CountdownRing } from '@/app/simulator/_components/ui/countdown-ring';
import { PlayerChip } from '@/app/simulator/_components/ui/player-chip';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { useAuctionClock } from '@/app/simulator/_components/use-auction-clock';
import { getEligibleBidders } from '@/lib/simulator/auction';
import { MOCK_PLAYERS } from '@/lib/simulator/mock-data';

const getPlayerName = (id: string) =>
  MOCK_PLAYERS.find((player) => player.id === id)?.name ?? id;

const AuctionSimulationStep = () => {
  useAuctionClock();
  const { state, dispatch } = useSimulator();
  const auction = state.auction;
  const pots = state.pots ?? [];
  const captainIds = state.captainIds ?? [];

  if (!auction) return null;

  const currentLot = auction.lots[auction.currentLotIndex];
  const isClosed = auction.status === 'closed';
  const eligible = getEligibleBidders(auction, pots, captainIds);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-tight">
          Subasta
        </h2>
        <p className="font-mono text-muted text-xs">
          Lote {Math.min(auction.currentLotIndex + 1, auction.lots.length)} /{' '}
          {auction.lots.length}
        </p>
      </div>

      {isClosed ? (
        <p className="font-semibold text-sm">Subasta terminada.</p>
      ) : currentLot ? (
        <div className="flex flex-col gap-4 rounded-xl bg-panel-2 p-4 ring-1 ring-hair">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[0.6rem] text-muted uppercase tracking-widest">
                Bombo {currentLot.potIndex + 1}
              </p>
              <p className="font-bold text-xl">
                {getPlayerName(currentLot.playerId)}
              </p>
            </div>
            <CountdownRing
              durationMs={auction.status === 'lockout' ? 1_500 : 10_000}
              endsAt={
                auction.status === 'lockout'
                  ? auction.lockoutEndsAt
                  : auction.countdownEndsAt
              }
              label={auction.status === 'lockout' ? 'Bloqueo' : 'Puja'}
            />
          </div>

          {auction.currentBid ? (
            <p className="text-sm">
              Puja actual:{' '}
              <span className="font-bold text-amber">
                {auction.currentBid.amount}
              </span>
            </p>
          ) : (
            <p className="text-muted text-sm">Sin pujas todavía.</p>
          )}

          <div className="flex flex-col gap-3">
            {captainIds.map((captainId) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-panel px-3 py-2 ring-1 ring-hair"
                key={captainId}
              >
                <PlayerChip
                  playerId={captainId}
                  subtitle={`Presupuesto: ${auction.budgets[captainId] ?? 0}`}
                />
                <BidControls
                  auction={auction}
                  disabled={
                    auction.status !== 'open' || !eligible.includes(captainId)
                  }
                  onBid={(amount) =>
                    dispatch({ type: 'PLACE_BID', captainId, amount })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <CaptainBudgetHud
        budgets={auction.budgets}
        captainIds={captainIds}
        rosters={auction.rosters}
      />

      <WizardNav nextDisabled={!isClosed} nextLabel="Ver equipos" />
    </section>
  );
};

export { AuctionSimulationStep };
