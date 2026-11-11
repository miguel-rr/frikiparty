'use client';

import Link from 'next/link';
import { useState } from 'react';

import { btn, panelGold } from '@/components/theme/primitives';
import type { PollPage } from '@/server/api/routers/poll';
import { api } from '@/trpc/react';

import { PAGE, PAGE_PATH } from './content';

type PagePoll = PollPage['polls'][number];

const dateText = (date: Date) =>
  new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(date);

const statusText = (poll: PagePoll) => {
  if (poll.phase === 'closed') return 'cerrada';
  if (poll.phase === 'waiting') return 'aún no abierta';
  return poll.closesAt
    ? `cierra el ${dateText(poll.closesAt)}`
    : 'abierta, sin hora de cierre todavía';
};

/** Votes so far, and how many it takes to open the results. */
const Turnout = ({ poll }: { poll: PagePoll }) => {
  const reached = poll.votes >= poll.quorum;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-(--hair-gold) border-t pt-4">
      <span className="text-(--faded) text-sm">
        <strong className="d-display text-(--parchment) text-xl tabular-nums">
          {poll.votes}
        </strong>{' '}
        {poll.votes === 1 ? 'voto' : 'votos'}
      </span>
      {reached ? null : (
        <span className="rounded-full border border-(--hair-gold) px-3 py-1 font-mono text-(--faded) text-2xs uppercase tracking-xl">
          Hacen falta {poll.quorum} para ver los resultados
        </span>
      )}
    </div>
  );
};

const ResultBars = ({ poll }: { poll: PagePoll }) => {
  const results = poll.results ?? [];
  const total = results.reduce((sum, row) => sum + row.votes, 0);
  const top = Math.max(0, ...results.map((row) => row.votes));
  return (
    <div className="flex flex-col gap-3">
      {poll.options.map((option) => {
        const votes = results.find((row) => row.key === option.key)?.votes ?? 0;
        const share = total ? Math.round((votes / total) * 100) : 0;
        const leading = poll.closed && votes === top && top > 0;
        return (
          <div className="flex flex-col gap-1" key={option.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span
                className={
                  leading ? 'font-bold text-(--gold-hi)' : 'text-(--parchment)'
                }
              >
                {leading ? '♛ ' : ''}
                {option.label}
                {poll.myVote === option.key ? (
                  <span className="ml-2 font-mono text-(--gold) text-2xs uppercase tracking-xl">
                    tu voto
                  </span>
                ) : null}
              </span>
              <span className="font-mono text-(--faded) text-xs">
                {share}% · {votes}
              </span>
            </div>
            <div className="h-2 rounded-full bg-(--night-2)">
              <div
                className={`h-full rounded-full ${leading ? 'bg-linear-to-r from-(--gold) to-(--gold-hi)' : 'bg-(--faded)/45'}`}
                style={{ width: `${share}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const VoteForm = ({
  poll,
  onVoted,
}: {
  poll: PagePoll;
  onVoted: () => Promise<unknown>;
}) => {
  const [chosen, setChosen] = useState<string | null>(poll.myVote);
  // The mutation stays pending until the page has refetched, so the form
  // never flashes back before the new state arrives.
  const vote = api.poll.vote.useMutation({ onSuccess: () => onVoted() });
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col justify-center gap-2 py-4">
        {poll.options.map((option) => (
          <button
            aria-pressed={chosen === option.key}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              chosen === option.key
                ? 'border-(--gold) bg-(--gold)/10 text-(--gold-hi)'
                : 'border-(--hair) text-(--parchment) hover:border-(--hair-gold)'
            }`}
            key={option.key}
            onClick={() => setChosen(option.key)}
            type="button"
          >
            <span
              aria-hidden
              className={`grid size-4.5 flex-none place-items-center rounded-full border ${
                chosen === option.key
                  ? 'border-(--gold)'
                  : 'border-(--faded)/60'
              }`}
            >
              {chosen === option.key ? (
                <span className="size-2.5 rounded-full bg-(--gold)" />
              ) : null}
            </span>
            {option.label}
          </button>
        ))}
      </div>
      <button
        className={`${btn.primary} self-start`}
        disabled={!chosen || vote.isPending}
        onClick={() =>
          chosen && vote.mutate({ pollId: poll.id, optionKey: chosen })
        }
        type="button"
      >
        {vote.isPending
          ? 'Votando…'
          : poll.myVote
            ? 'Cambiar mi voto'
            : 'Votar'}
      </button>
      <span className="text-(--faded) text-xs">
        Tu voto es anónimo y puedes cambiarlo hasta el cierre.
      </span>
      {vote.error ? (
        <span className="text-(--ember) text-sm">{vote.error.message}</span>
      ) : null}
    </div>
  );
};

/** One poll as this viewer may see it. */
const PollCard = ({
  poll,
  signedIn,
  canVote,
  onVoted,
}: {
  poll: PagePoll;
  signedIn: boolean;
  canVote: boolean;
  onVoted: () => Promise<unknown>;
}) => {
  const [editing, setEditing] = useState(false);
  const label = poll.options.find(
    (option) => option.key === poll.myVote,
  )?.label;
  const noQuorum = poll.closed && poll.votes < poll.quorum;
  const body = (() => {
    if (poll.phase === 'waiting') {
      return (
        <div className="flex flex-1 flex-col justify-center gap-4 py-4">
          <p className="rounded-lg border border-(--hair-gold) border-dashed px-4 py-3 text-center text-(--parchment)">
            La votación aún no se ha abierto
            {poll.opensAt ? `: se abre el ${dateText(poll.opensAt)}.` : '.'}
          </p>
          <ul className="flex flex-col gap-2 opacity-50">
            {poll.options.map((option) => (
              <li
                className="rounded-lg border border-(--hair) px-4 py-3 text-(--parchment)"
                key={option.key}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (poll.closed) {
      if (noQuorum) {
        return (
          <p className="text-(--faded)">
            Votación cerrada sin quórum: votaron {poll.votes} de {poll.eligible}
            , hacían falta {poll.quorum}.
          </p>
        );
      }
      return (
        <div className="flex flex-col gap-3">
          <ResultBars poll={poll} />
          <span className="text-(--faded) text-xs">
            Resultado orientativo, no vinculante.
          </span>
        </div>
      );
    }
    if (!signedIn) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-(--gold)/50 border-dashed bg-(--night-2)/70 px-4 py-6 text-center">
          <p className="max-w-[36ch] text-(--parchment)">
            Para votar y ver los resultados tienes que{' '}
            <strong>entrar con tu cuenta</strong>.
          </p>
          <Link
            className={`${btn.primary} px-8 py-3 text-lg`}
            href={`/login?next=${encodeURIComponent(PAGE_PATH)}`}
          >
            Entrar para votar
          </Link>
          <span className="text-(--faded) text-xs">
            Al entrar vuelves aquí mismo.
          </span>
        </div>
      );
    }
    if (!canVote) {
      return (
        <p className="rounded-lg border border-(--hair) bg-(--night-2)/70 px-4 py-4 text-(--faded) text-sm">
          Solo votan los jugadores confirmados para la Frikiparty 2026. Si vas a
          venir, confirma tu asistencia desde tu menú y vuelve.
        </p>
      );
    }
    if (!poll.myVote || editing) {
      return (
        <VoteForm
          onVoted={async () => {
            await onVoted();
            setEditing(false);
          }}
          poll={poll}
        />
      );
    }
    return (
      <div className="flex flex-1 flex-col gap-4">
        {poll.results ? (
          <ResultBars poll={poll} />
        ) : (
          <p className="text-(--parchment)">
            Has votado <strong className="text-(--gold-hi)">{label}</strong>.
            Los resultados se abren cuando haya votado la mitad más uno.
          </p>
        )}
        <button
          className="mt-auto self-start font-bold text-(--gold) text-sm hover:text-(--gold-hi)"
          onClick={() => setEditing(true)}
          type="button"
        >
          Cambiar mi voto
        </button>
      </div>
    );
  })();
  return (
    <div className={`${panelGold} d-corners flex flex-col gap-5 p-5 sm:p-6`}>
      <span className="d-corner-b" />
      <div className="flex flex-col gap-1">
        <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
          Votación · {statusText(poll)}
        </span>
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          {poll.question}
        </h3>
      </div>
      <div className="flex flex-1 flex-col">{body}</div>
      {poll.phase !== 'waiting' && (signedIn || poll.closed) ? (
        <Turnout poll={poll} />
      ) : null}
    </div>
  );
};

/** The page's polls, live: they refetch after every vote. */
const PollSection = () => {
  const page = api.poll.page.useQuery({ page: PAGE });
  if (page.isPending) {
    return <p className="text-center text-(--faded)">Cargando votaciones…</p>;
  }
  if (!page.data) {
    return (
      <p className="text-center text-(--faded)">
        Las votaciones todavía no están abiertas.
      </p>
    );
  }
  const data = page.data;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {data.polls.map((poll) => (
        <PollCard
          canVote={data.canVote}
          key={poll.id}
          onVoted={() => page.refetch()}
          poll={poll}
          signedIn={data.signedIn}
        />
      ))}
    </div>
  );
};

export { PollSection };
