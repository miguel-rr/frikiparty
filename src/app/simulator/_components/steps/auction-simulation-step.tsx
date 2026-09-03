'use client';

import { useSimulator } from '@/app/simulator/_components/simulator-context';
import { WizardNav } from '@/app/simulator/_components/ui/wizard-nav';
import { useAuctionClock } from '@/app/simulator/_components/use-auction-clock';
import { BidControls } from '@/components/tournament/bid-controls';
import { CaptainBudgetHud } from '@/components/tournament/captain-budget-hud';
import { CountdownRing } from '@/components/tournament/countdown-ring';
import { PlayerChip } from '@/components/tournament/player-chip';
import { getEligibleBidders } from '@/lib/tournament/auction';

const AuctionSimulationStep = () => {
  useAuctionClock();
  const { state, dispatch } = useSimulator();
  const getPlayerName = (id: string) =>
    state.players.find((player) => player.id === id)?.name ?? id;
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
        <h2 className="d-display font-bold text-2xl uppercase tracking-wide">
          Subasta
        </h2>
        <p className="font-mono text-(--faded) text-xs">
          Lote {Math.min(auction.currentLotIndex + 1, auction.lots.length)} /{' '}
          {auction.lots.length}
        </p>
      </div>

      {isClosed ? (
        <p className="font-semibold text-sm">Subasta terminada.</p>
      ) : currentLot ? (
        <div className="flex flex-col gap-4 rounded-xl bg-(--panel-2) p-4 ring-(--hair) ring-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-(--faded) text-2xs uppercase tracking-widest">
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
              <span className="font-bold text-(--gold)">
                {auction.currentBid.amount}
              </span>
            </p>
          ) : (
            <p className="text-(--faded) text-sm">Sin pujas todavía.</p>
          )}

          <div className="flex flex-col gap-3">
            {captainIds.map((captainId) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-(--panel) px-3 py-2 ring-(--hair) ring-1"
                key={captainId}
              >
                <PlayerChip
                  name={getPlayerName(captainId)}
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
        getPlayerName={getPlayerName}
        rosters={auction.rosters}
      />

      <WizardNav nextDisabled={!isClosed} nextLabel="Ver equipos" />
    </section>
  );
};

export { AuctionSimulationStep };
