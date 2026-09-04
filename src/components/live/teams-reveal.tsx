'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn, input, panelGold } from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import { cardSpecFor } from '@/lib/tournament/card-lore';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

const TEAM_DELAY_MS = 1100;
const CARD_DELAY_MS = 180;

/**
 * The teams, one after another, captain first and the rest sliding in
 * beside them. The captain of a team sees a small field to name it.
 */
const TeamsReveal = ({ state }: { state: LiveState }) => {
  const byId = new Map(state.participants.map((p) => [p.id, p]));
  const leaderId = state.ranking?.[0];
  const { user } = useSessionUser();
  const mine = api.player.mine.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
  return (
    <section className="flex flex-col gap-8">
      <style>{`
        @keyframes live-team-in { 0% { opacity: 0; transform: translateY(24px); } 100% { opacity: 1; transform: none; } }
        @keyframes live-card-slide { 0% { opacity: 0; transform: translateX(-30px) rotate(-4deg); } 100% { opacity: 1; transform: none; } }
      `}</style>
      {state.teams.map((team, teamIndex) => {
        const captain = team.members.find((m) => m.isCaptain);
        const isMine = captain?.playerId === mine.data?.id;
        const ordered = [...team.members].sort(
          (a, b) => (a.seat ?? 99) - (b.seat ?? 99),
        );
        return (
          <div
            className={`${panelGold} flex flex-col gap-4 p-5`}
            key={team.id}
            style={{
              animation: 'live-team-in 600ms ease-out both',
              animationDelay: `${teamIndex * TEAM_DELAY_MS}ms`,
            }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="d-display font-bold text-(--parchment) text-xl uppercase">
                {team.name ?? `Equipo de ${captain?.name ?? teamIndex + 1}`}
              </span>
              {isMine ? (
                <NameForm current={team.name} tournamentId={state.id} />
              ) : null}
            </div>
            <ul className="flex flex-wrap gap-3">
              {ordered.map((member, cardIndex) => {
                const p = byId.get(member.playerId);
                if (!p) return null;
                const card = cardSpecFor({
                  name: p.name,
                  rings: p.rings,
                  individualRings: p.individualRings,
                  cardPortrait: p.cardPortrait,
                  cardAbility: p.cardAbility,
                  cardAbilityText: p.cardAbilityText,
                  isLeader: p.id === leaderId,
                });
                return (
                  <li
                    className={`w-[calc(50%-0.375rem)] max-w-36 sm:w-32 lg:w-36 ${member.isCaptain ? 'drop-shadow-[0_0_18px_rgba(240,212,138,0.45)]' : ''}`}
                    key={member.playerId}
                    style={{
                      animation:
                        'live-card-slide 500ms cubic-bezier(.2,.8,.2,1) both',
                      animationDelay: `${teamIndex * TEAM_DELAY_MS + 250 + cardIndex * CARD_DELAY_MS}ms`,
                    }}
                  >
                    <Link href={`/players/${member.slug}`}>
                      <PortraitCard card={card} className="w-full" />
                    </Link>
                    {member.isCaptain ? (
                      <span className="mt-1 block text-center font-mono text-(--gold) text-2xs uppercase tracking-2xl">
                        Capitán
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
};

const NameForm = ({
  current,
  tournamentId,
}: {
  current: string | null;
  tournamentId: string;
}) => {
  const [name, setName] = useState(current ?? '');
  const utils = api.useUtils();
  const rename = api.formation.nameTeam.useMutation({
    onSuccess: () => utils.live.state.invalidate({ tournamentId }),
  });
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        rename.mutate({ tournamentId, name });
      }}
    >
      <input
        className={`${input} w-48 py-1 text-sm`}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        placeholder="Bautiza a tu equipo"
        value={name}
      />
      <button
        className={`${btn.secondary} px-3 py-1 text-xs`}
        disabled={rename.isPending}
        type="submit"
      >
        Guardar
      </button>
    </form>
  );
};

export { TeamsReveal };
