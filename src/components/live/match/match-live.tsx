'use client';

import { useState } from 'react';

import { MatchSheet } from '@/components/live/match/match-sheet';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

/** The match page's live wrapper: subscribes and hands the snapshot down. */
const MatchLive = ({
  initial,
  matchId,
}: {
  initial: LiveState;
  matchId: string;
}) => {
  const [state, setState] = useState(initial);
  api.live.onChange.useSubscription(
    { tournamentId: initial.id },
    { onData: setState },
  );
  const phase = state.phases.find((p) =>
    p.matches.some((m) => m.id === matchId),
  );
  const m = phase?.matches.find((x) => x.id === matchId);
  if (!phase || !m)
    return <p className="text-(--faded)">Ese partido ya no existe.</p>;
  return <MatchSheet match={m} phase={phase} state={state} />;
};

export { MatchLive };
