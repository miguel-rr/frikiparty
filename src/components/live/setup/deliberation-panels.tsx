'use client';

import { useState } from 'react';

import { ReorderList } from '@/components/live/reorder-list';
import { btn, panel, panelGold } from '@/components/theme/primitives';
import { PotBoard } from '@/components/tournament/pot-board';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

type PanelProps = {
  state: LiveState;
  onDone: () => void;
};

/** Voting stage: the tally so far and the lever that closes it. */
const VotingPanel = ({
  state,
  onDone,
  testTools,
}: PanelProps & { testTools: boolean }) => {
  const close = api.tournament.closeVoting.useMutation({ onSuccess: onDone });
  const [showBallots, setShowBallots] = useState(false);
  const submitted = new Set(state.voting.submittedPlayerIds);
  const pending = state.participants.filter((p) => !submitted.has(p.id));
  return (
    <section className={`${panelGold} flex flex-col gap-4 p-5 sm:p-7`}>
      <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
        Votación
      </h3>
      <p className="text-(--faded) text-sm">
        {submitted.size} de {state.participants.length} han votado.
        {pending.length > 0
          ? ` Faltan: ${pending.map((p) => p.name).join(', ')}.`
          : ' No falta nadie.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.primary}
          disabled={close.isPending || submitted.size === 0}
          onClick={() => close.mutate({ tournamentId: state.id })}
          type="button"
        >
          {close.isPending ? 'Cerrando…' : 'Cerrar la votación'}
        </button>
        <span className="text-(--faded) text-xs">
          Se calcula el ranking y pasa a revisión. Quien no haya votado, no
          cuenta.
        </span>
      </div>
      {testTools ? (
        <div className="flex flex-col gap-2 border-(--hair) border-t pt-4">
          <button
            className={`${btn.ghost} self-start px-0`}
            onClick={() => setShowBallots((value) => !value)}
            type="button"
          >
            {showBallots
              ? 'Ocultar papeletas'
              : 'Ver papeletas (sólo en desarrollo)'}
          </button>
          {showBallots ? <BallotViewer state={state} /> : null}
        </div>
      ) : null}
      {close.error ? (
        <p className="text-(--ember) text-sm">{close.error.message}</p>
      ) : null}
    </section>
  );
};

/** Development aid, refused by the server in production. */
const BallotViewer = ({ state }: { state: LiveState }) => {
  const ballots = api.tournament.ballots.useQuery({ tournamentId: state.id });
  const byId = new Map(state.participants.map((p) => [p.id, p.name]));
  if (!ballots.data) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ballots.data.map((ballot) => (
        <div className={`${panel} p-3 text-xs`} key={ballot.voterId}>
          <span className="font-bold text-(--gold)">
            {byId.get(ballot.voterId) ?? ballot.voterId}
          </span>
          <ol className="mt-1 list-inside list-decimal text-(--faded)">
            {ballot.order.map((id) => (
              <li key={id}>{byId.get(id) ?? id}</li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
};

/** Ranking review: the blend, hand-adjustable, then confirmed into pots. */
const RankingReviewPanel = ({ state, onDone }: PanelProps) => {
  const utils = api.useUtils();
  const [order, setOrder] = useState<string[] | null>(null);
  const save = api.tournament.setRanking.useMutation({
    onSuccess: () => {
      setOrder(null);
      utils.tournament.setup.invalidate({ tournamentId: state.id });
    },
  });
  const confirm = api.tournament.confirmRanking.useMutation({
    onSuccess: onDone,
  });
  const byId = new Map(state.participants.map((p) => [p.id, p]));
  const votePos = new Map(
    (state.voteRanking ?? []).map((id, index) => [id, index + 1]),
  );
  const current = order ?? state.ranking ?? [];
  const dirty = order !== null;
  const error = save.error ?? confirm.error;
  return (
    <section className={`${panelGold} flex flex-col gap-4 p-5 sm:p-7`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          Revisión del ranking
        </h3>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {state.rankingSource === 'historical'
            ? 'Histórico'
            : state.rankingSource === 'vote'
              ? 'Por votación'
              : `Combinado · ${state.historicalWeightPercent ?? 50}% histórico`}
        </span>
      </div>
      <ReorderList
        disabled={save.isPending || confirm.isPending}
        ids={current}
        onChange={setOrder}
        renderItem={(id) => {
          const participant = byId.get(id);
          return (
            <span className="flex items-baseline gap-3">
              <span className="truncate font-semibold text-(--parchment) text-sm">
                {participant?.name ?? '…'}
              </span>
              <span className="shrink-0 font-mono text-(--faded) text-2xs uppercase tracking-wider">
                hist. {participant?.position ?? '—'}
                {state.voteRanking ? ` · voto ${votePos.get(id) ?? '—'}` : ''}
              </span>
            </span>
          );
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.secondary}
          disabled={!dirty || save.isPending}
          onClick={() =>
            save.mutate({ tournamentId: state.id, order: current })
          }
          type="button"
        >
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          className={btn.primary}
          disabled={dirty || confirm.isPending || current.length === 0}
          onClick={() => confirm.mutate({ tournamentId: state.id })}
          type="button"
        >
          {confirm.isPending
            ? 'Forjando bombos…'
            : 'Ranking definitivo → bombos'}
        </button>
        {dirty ? (
          <span className="text-(--faded) text-xs">
            Guarda los cambios antes de darlo por definitivo.
          </span>
        ) : null}
      </div>
      {error ? <p className="text-(--ember) text-sm">{error.message}</p> : null}
    </section>
  );
};

/** Pots review: move players between tiers, then publish and crown captains. */
const PotsReviewPanel = ({ state, onDone }: PanelProps) => {
  const utils = api.useUtils();
  const [pots, setPots] = useState<string[][] | null>(null);
  const save = api.tournament.setPots.useMutation({
    onSuccess: () => {
      setPots(null);
      utils.tournament.setup.invalidate({ tournamentId: state.id });
    },
  });
  const confirm = api.tournament.confirmPots.useMutation({ onSuccess: onDone });
  const byId = new Map(state.participants.map((p) => [p.id, p.name]));
  const current = pots ?? state.pots;
  const dirty = pots !== null;
  const captainPot = current[state.captainPotIndex] ?? [];
  const error = save.error ?? confirm.error;
  return (
    <section className={`${panelGold} flex flex-col gap-4 p-5 sm:p-7`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          Revisión de los bombos
        </h3>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {captainPot.length} capitanes · {state.teams.length} equipos
        </span>
      </div>
      <PotBoard
        getPlayerName={(id) => byId.get(id) ?? id}
        onMove={(playerId, from, to) => {
          const next = current.map((pot) => [...pot]);
          const fromPot = next[from];
          const toPot = next[to];
          if (!fromPot || !toPot) return;
          next[from] = fromPot.filter((id) => id !== playerId);
          toPot.push(playerId);
          setPots(next);
        }}
        pots={current}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.secondary}
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate({ tournamentId: state.id, pots: current })}
          type="button"
        >
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          className={btn.primary}
          disabled={
            dirty ||
            confirm.isPending ||
            captainPot.length !== state.teams.length
          }
          onClick={() => confirm.mutate({ tournamentId: state.id })}
          type="button"
        >
          {confirm.isPending ? 'Publicando…' : 'Bombos definitivos → capitanes'}
        </button>
        <span className="text-(--faded) text-xs">
          El bombo {state.captainPotIndex + 1} debe tener exactamente un jugador
          por equipo. Al publicar, El Concilio revela los bombos.
        </span>
      </div>
      {error ? <p className="text-(--ember) text-sm">{error.message}</p> : null}
    </section>
  );
};

export { PotsReviewPanel, RankingReviewPanel, VotingPanel };
