'use client';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn, panelGold } from '@/components/theme/primitives';
import { volunteerWindowOpen } from '@/lib/tournament/formation-config';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

/**
 * Volunteer captains, for everyone: who has signed up so far, what
 * happens with too many or too few, and, for a participant while the
 * window is open, the button to sign up or take it back.
 */
const CaptainVolunteers = ({ state }: { state: LiveState }) => {
  const config = state.formationConfig;
  const { user } = useSessionUser();
  const open = volunteerWindowOpen(state.stage, config, state.rankingMeta);
  const mine = api.vote.mine.useQuery(
    { tournamentId: state.id },
    { enabled: Boolean(user) && open },
  );
  const toggle = api.tournament.setMyCaptainVolunteer.useMutation();
  if (config.captainSource !== 'volunteers' || !open) return null;
  const names = new Map(state.participants.map((p) => [p.id, p.name]));
  const volunteers = config.captainVolunteers;
  const teams = state.teams.length;
  const me = mine.data?.playerId ?? null;
  const signedUp = me !== null && volunteers.includes(me);
  return (
    <section className={`${panelGold} flex flex-col gap-4 p-5 sm:p-7`}>
      <div className="flex flex-col gap-1">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          ¿Quieres ser capitán?
        </h3>
        <p className="text-(--faded) text-sm">
          Hacen falta {teams} capitanes. Si se apuntan más,{' '}
          {config.volunteerSurplus === 'ranking'
            ? 'entran los mejor situados en el ranking'
            : 'se sortea quién entra'}
          . Si se apuntan menos, se completan con los mejor situados del
          ranking, que no pueden renunciar.
          {config.volunteerWindow === 'after_ranking'
            ? ' El ranking ya es público: puedes decidir sabiendo dónde has quedado.'
            : ' Te puedes apuntar mientras dura la votación y su revisión.'}
        </p>
      </div>
      <p className="text-sm">
        <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          Apuntados · {volunteers.length}
        </span>
        <br />
        <span className="text-(--parchment)">
          {volunteers.length > 0
            ? volunteers.map((id) => names.get(id) ?? '…').join(', ')
            : 'Nadie todavía.'}
        </span>
      </p>
      {me ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={signedUp ? btn.secondary : btn.primary}
            disabled={toggle.isPending}
            onClick={() =>
              toggle.mutate({ tournamentId: state.id, volunteer: !signedUp })
            }
            type="button"
          >
            {signedUp ? 'Ya no quiero ser capitán' : 'Quiero ser capitán'}
          </button>
          {toggle.error ? (
            <span className="text-(--ember) text-xs">
              {toggle.error.message}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export { CaptainVolunteers };
