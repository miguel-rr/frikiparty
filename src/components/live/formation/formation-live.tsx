'use client';

import Link from 'next/link';
import { useState } from 'react';

import { FormationRoom } from '@/components/live/formation/formation-room';
import { TeamsReveal } from '@/components/live/teams-reveal';
import { btn, tag } from '@/components/theme/primitives';
import { STAGE_META } from '@/lib/live/stages';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

/** The room page's live wrapper: subscribes and hands the snapshot down. */
const FormationLive = ({
  initial,
  tv,
}: {
  initial: LiveState;
  tv?: boolean;
}) => {
  const [state, setState] = useState(initial);
  api.live.onChange.useSubscription(
    { tournamentId: initial.id },
    { onData: setState },
  );
  const meta = STAGE_META[state.stage];
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className={tag}>Edición {state.editionYear} · La sala</span>
          <span
            className={`d-display font-bold text-(--parchment) uppercase ${tv ? 'text-4xl' : 'text-2xl'}`}
          >
            {meta.title}
          </span>
        </div>
        {tv ? null : (
          <div className="flex gap-2">
            <Link className={btn.outline} href="/live/formation?display=tv">
              Modo TV
            </Link>
            <Link className={btn.outline} href="/live">
              El torneo
            </Link>
          </div>
        )}
      </header>
      {state.stage === 'formation' ? (
        <FormationRoom live={state} tv={tv} />
      ) : null}
      {state.stage !== 'formation' &&
      state.teams.some((t) => t.members.length > 1) ? (
        <TeamsReveal state={state} />
      ) : null}
      {state.stage !== 'formation' &&
      !state.teams.some((t) => t.members.length > 1) ? (
        <p className="text-(--faded)">{meta.next}</p>
      ) : null}
    </div>
  );
};

export { FormationLive };
