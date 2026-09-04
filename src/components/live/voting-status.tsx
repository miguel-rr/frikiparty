'use client';

import Link from 'next/link';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn, panel, panelGold } from '@/components/theme/primitives';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

/**
 * Who has spoken and who hasn't: the vote is secret, the list of voters is
 * not (the Council likes to know who's holding things up). A participant
 * who hasn't voted gets the door to the ballot right here.
 */
const VotingStatus = ({ state }: { state: LiveState }) => {
  const { user } = useSessionUser();
  const mine = api.vote.mine.useQuery(
    { tournamentId: state.id },
    { enabled: Boolean(user) },
  );
  const submitted = new Set(state.voting.submittedPlayerIds);
  const voted = state.participants.filter((p) => submitted.has(p.id));
  const pending = state.participants.filter((p) => !submitted.has(p.id));

  return (
    <section className={`${panelGold} flex flex-col gap-6 p-5 sm:p-7`}>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="d-display font-bold text-(--gold-hi) text-4xl">
          {voted.length}
          <span className="text-(--faded) text-2xl">
            {' '}
            / {state.participants.length}
          </span>
        </span>
        <span className="font-mono text-(--faded) text-xs uppercase tracking-2xl">
          votos sellados
        </span>
        {mine.data && !mine.data.submittedAt ? (
          <Link className={`${btn.primary} mt-2`} href="/live/vote">
            Votar ahora
          </Link>
        ) : null}
        {mine.data?.submittedAt ? (
          <span className="mt-2 font-mono text-(--moss) text-xs uppercase tracking-2xl">
            Tu voto está sellado
          </span>
        ) : null}
        {!user ? (
          <Link className={`${btn.outline} mt-2`} href="/login?next=/live/vote">
            Entra para votar
          </Link>
        ) : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <NameList
          empty="Nadie ha votado todavía."
          names={voted.map((p) => p.name)}
          title="Han hablado"
          tone="moss"
        />
        <NameList
          empty="No falta nadie."
          names={pending.map((p) => p.name)}
          title="Faltan por votar"
          tone="ember"
        />
      </div>
    </section>
  );
};

const NameList = ({
  title,
  names,
  empty,
  tone,
}: {
  title: string;
  names: string[];
  empty: string;
  tone: 'moss' | 'ember';
}) => (
  <div className={`${panel} flex flex-col gap-2 p-4`}>
    <span
      className={`font-bold font-mono text-2xs uppercase tracking-2xl ${
        tone === 'moss' ? 'text-(--moss)' : 'text-(--ember)'
      }`}
    >
      {title} · {names.length}
    </span>
    {names.length === 0 ? (
      <span className="text-(--faded) text-sm italic">{empty}</span>
    ) : (
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-(--parchment) text-sm">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    )}
  </div>
);

export { VotingStatus };
