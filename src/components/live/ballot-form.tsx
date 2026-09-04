'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ReorderList } from '@/components/live/reorder-list';
import { btn, panel, panelGold } from '@/components/theme/primitives';
import { api } from '@/trpc/react';

type PlayerRef = { id: string; name: string; slug: string };

/**
 * The personal ranking: every other participant, best at the top, opened
 * in historical order. "Enviar" asks twice — once sent, the ballot is
 * sealed and nobody, not even the organiser, gets to read it.
 */
const BallotForm = ({
  tournamentId,
  players,
}: {
  tournamentId: string;
  players: PlayerRef[];
}) => {
  const utils = api.useUtils();
  const mine = api.vote.mine.useQuery({ tournamentId });
  const submit = api.vote.submit.useMutation({
    onSuccess: () => {
      utils.vote.mine.invalidate({ tournamentId });
      utils.live.state.invalidate({ tournamentId });
    },
  });
  const [order, setOrder] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const byId = new Map(players.map((p) => [p.id, p]));

  if (mine.isPending) {
    return <p className="text-(--faded) text-sm">Preparando tu papeleta…</p>;
  }
  if (!mine.data) {
    return (
      <div className={`${panel} flex flex-col gap-3 p-6 text-center`}>
        <p className="text-(--parchment)">
          Esta votación es sólo para los participantes del torneo.
        </p>
        <p className="text-(--faded) text-sm">
          Si participas y ves esto, tu cuenta no está vinculada a tu jugador:
          pídele el código al organizador.
        </p>
        <Link className={`${btn.outline} self-center`} href="/live">
          Volver al torneo
        </Link>
      </div>
    );
  }
  if (mine.data.submittedAt) {
    return (
      <div
        className={`${panelGold} flex flex-col items-center gap-3 p-8 text-center`}
      >
        <span className="d-display font-bold text-(--gold-hi) text-2xl uppercase">
          Tu voto está sellado
        </span>
        <p className="max-w-[44ch] text-(--faded)">
          Lo enviaste el{' '}
          {mine.data.submittedAt.toLocaleString('es-ES', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
          . Nadie puede leerlo: sólo cuenta en el resultado final.
        </p>
        <Link className={btn.outline} href="/live">
          Volver al torneo
        </Link>
      </div>
    );
  }

  const current = order ?? mine.data.initialOrder;

  return (
    <div className="flex flex-col gap-6">
      <ReorderList
        disabled={submit.isPending}
        ids={current}
        onChange={(next) => {
          setOrder(next);
          setConfirming(false);
        }}
        renderItem={(id) => (
          <span className="block truncate font-semibold text-(--parchment) text-sm">
            {byId.get(id)?.name ?? '…'}
          </span>
        )}
      />
      {confirming ? (
        <div className={`${panelGold} flex flex-col gap-4 p-5`}>
          <p className="text-(--parchment)">
            ¿Seguro? Una vez enviado, tu voto queda sellado y no se puede
            cambiar.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className={btn.primary}
              disabled={submit.isPending}
              onClick={() => submit.mutate({ tournamentId, order: current })}
              type="button"
            >
              {submit.isPending ? 'Sellando…' : 'Sí, sellar mi voto'}
            </button>
            <button
              className={btn.ghost}
              disabled={submit.isPending}
              onClick={() => setConfirming(false)}
              type="button"
            >
              Seguir ordenando
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={btn.primary}
            onClick={() => setConfirming(true)}
            type="button"
          >
            Enviar mi voto
          </button>
          <span className="text-(--faded) text-xs">
            El mejor arriba. Arrastra o usa las flechas.
          </span>
        </div>
      )}
      {submit.error ? (
        <p className="text-(--ember) text-sm">{submit.error.message}</p>
      ) : null}
    </div>
  );
};

export { BallotForm };
