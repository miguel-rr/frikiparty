'use client';

import { useSessionUser } from '@/components/layout/auth-slot';
import { AuctionStage } from '@/components/live/formation/auction-stage';
import { DraftStage } from '@/components/live/formation/draft-stage';
import { panel } from '@/components/theme/primitives';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

/**
 * The formation room for whoever is looking: the auction or the draft
 * from the live snapshot, with the captain's controls when the viewer
 * captains a team (their account, nothing else).
 */
const FormationRoom = ({ live, tv }: { live: LiveState; tv?: boolean }) => {
  const { user } = useSessionUser();
  const mine = api.player.mine.useQuery(undefined, {
    enabled: Boolean(user) && !tv,
    staleTime: 5 * 60 * 1000,
  });
  const myCaptainId =
    mine.data &&
    live.teams.some((t) =>
      t.members.some((m) => m.isCaptain && m.playerId === mine.data?.id),
    )
      ? mine.data.id
      : null;
  const utils = api.useUtils();
  const bid = api.formation.bid.useMutation({
    onSettled: () => utils.live.state.invalidate({ tournamentId: live.id }),
  });
  const pick = api.formation.pick.useMutation({
    onSettled: () => utils.live.state.invalidate({ tournamentId: live.id }),
  });

  if (!live.room) {
    return (
      <section
        className={`${panel} flex flex-col items-center gap-2 p-8 text-center`}
      >
        <span className="d-display font-bold text-(--parchment) text-xl uppercase">
          {live.formationMethod === 'random' ||
          live.formationMethod === 'pots_random'
            ? 'El sorteo está a punto'
            : live.formationMethod === 'draft'
              ? 'El draft está a punto'
              : live.formationMethod === 'auction'
                ? 'La subasta está a punto'
                : 'Los capitanes se preparan'}
        </span>
        <p className="max-w-[44ch] text-(--faded) text-sm">
          {myCaptainId
            ? 'Eres capitán: cuando el organizador abra la sala, tus controles aparecerán aquí.'
            : 'Cuando el organizador abra la sala, se verá aquí en directo.'}
        </p>
      </section>
    );
  }

  if (live.room.kind === 'auction') {
    return (
      <AuctionStage
        auction={live.room.state}
        bidError={bid.error?.message ?? null}
        bidPending={bid.isPending}
        captainId={myCaptainId}
        live={live}
        onBid={(amount) => bid.mutate({ tournamentId: live.id, amount })}
        tv={tv}
      />
    );
  }
  return (
    <DraftStage
      captainId={myCaptainId}
      draft={live.room.state}
      live={live}
      onPick={(potIndex, playerId) =>
        pick.mutate({ tournamentId: live.id, potIndex, playerId })
      }
      pickError={pick.error?.message ?? null}
      pickPending={pick.isPending}
      tv={tv}
    />
  );
};

export { FormationRoom };
