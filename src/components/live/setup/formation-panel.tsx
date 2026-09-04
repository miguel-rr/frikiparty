'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ReorderList } from '@/components/live/reorder-list';
import { btn, input, label, panelGold } from '@/components/theme/primitives';
import {
  type AuctionConfig,
  DEFAULT_AUCTION_CONFIG,
} from '@/lib/tournament/auction-live';
import { isDraftComplete } from '@/lib/tournament/draft-live';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

type Method = 'random' | 'pots_random' | 'draft' | 'auction';

const select =
  'w-full appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3.5 py-2 text-(--parchment) transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';

const METHOD_LABELS: Record<Method, string> = {
  random: 'Aleatorio total',
  pots_random: 'Aleatorio por bombos',
  draft: 'Draft',
  auction: 'Subasta',
};

/**
 * The organiser's formation desk: pick the method, configure it, open the
 * room, and drive it — next lot, skipped lot, raffle, pause, undo, timers
 * — until the room closes and the teams are published.
 */
const FormationPanel = ({
  state,
  onDone,
}: {
  state: LiveState;
  onDone: () => void;
}) => {
  const utils = api.useUtils();
  const refresh = () => {
    utils.tournament.setup.invalidate({ tournamentId: state.id });
    utils.live.state.invalidate({ tournamentId: state.id });
  };
  const setMethod = api.formation.setMethod.useMutation({ onSuccess: refresh });
  const method = state.formationMethod;
  const room = state.room;

  return (
    <section className={`${panelGold} flex flex-col gap-5 p-5 sm:p-7`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          Formación de equipos
        </h3>
        <Link className={btn.outline} href="/live/formation">
          Abrir la sala
        </Link>
      </div>

      {!room ? (
        <div className="flex flex-col gap-1">
          <span className={label}>Método</span>
          <select
            className={select}
            disabled={setMethod.isPending}
            onChange={(e) =>
              setMethod.mutate({
                tournamentId: state.id,
                method: e.target.value as Method,
              })
            }
            value={method ?? ''}
          >
            <option value="">Elegir…</option>
            {(Object.keys(METHOD_LABELS) as Method[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!room && (method === 'random' || method === 'pots_random') ? (
        <RandomStart onDone={onDone} state={state} />
      ) : null}
      {!room && method === 'draft' ? (
        <DraftStart onStarted={refresh} state={state} />
      ) : null}
      {!room && method === 'auction' ? (
        <AuctionStart onStarted={refresh} state={state} />
      ) : null}

      {room?.kind === 'auction' ? (
        <AuctionControls onDone={onDone} state={state} />
      ) : null}
      {room?.kind === 'draft' ? (
        <DraftControls onDone={onDone} state={state} />
      ) : null}

      {setMethod.error ? (
        <p className="text-(--ember) text-sm">{setMethod.error.message}</p>
      ) : null}
    </section>
  );
};

const RandomStart = ({
  state,
  onDone,
}: {
  state: LiveState;
  onDone: () => void;
}) => {
  const start = api.formation.startRandom.useMutation({ onSuccess: onDone });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className={btn.primary}
        disabled={start.isPending}
        onClick={() => start.mutate({ tournamentId: state.id })}
        type="button"
      >
        {start.isPending ? 'Sorteando…' : 'Sortear y revelar los equipos'}
      </button>
      <span className="text-(--faded) text-xs">
        {state.formationMethod === 'pots_random'
          ? 'Un jugador de cada bombo por equipo, al azar dentro del bombo.'
          : 'Todos menos los capitanes, repartidos al azar.'}
      </span>
      {start.error ? (
        <span className="text-(--ember) text-xs">{start.error.message}</span>
      ) : null}
    </div>
  );
};

const captainsOf = (state: LiveState) =>
  state.teams
    .map((t) => t.members.find((m) => m.isCaptain)?.playerId)
    .filter((id): id is string => id !== undefined);

const DraftStart = ({
  state,
  onStarted,
}: {
  state: LiveState;
  onStarted: () => void;
}) => {
  const byId = new Map(state.participants.map((p) => [p.id, p.name]));
  const captains = captainsOf(state);
  const ranking = state.ranking ?? [];
  const [orderMethod, setOrderMethod] = useState<
    'ranking' | 'inverse-ranking' | 'fixed-random' | 'full-random'
  >('inverse-ranking');
  const [draftMethod, setDraftMethod] = useState<'snake' | 'linear'>('snake');
  const [order, setOrder] = useState<string[] | null>(null);
  const start = api.formation.startDraft.useMutation({ onSuccess: onStarted });
  const suggested =
    orderMethod === 'ranking'
      ? [...captains].sort((a, b) => ranking.indexOf(a) - ranking.indexOf(b))
      : orderMethod === 'inverse-ranking'
        ? [...captains].sort((a, b) => ranking.indexOf(b) - ranking.indexOf(a))
        : captains;
  const shown = order ?? suggested;
  const editable = orderMethod !== 'full-random';
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className={label}>Orden de los capitanes</span>
          <select
            className={select}
            onChange={(e) => {
              setOrderMethod(e.target.value as typeof orderMethod);
              setOrder(null);
            }}
            value={orderMethod}
          >
            <option value="inverse-ranking">
              Ranking inverso (el peor elige primero)
            </option>
            <option value="ranking">Ranking</option>
            <option value="fixed-random">Aleatorio fijo</option>
            <option value="full-random">Aleatorio en cada ronda</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className={label}>Modo</span>
          <select
            className={select}
            onChange={(e) =>
              setDraftMethod(e.target.value as 'snake' | 'linear')
            }
            value={draftMethod}
          >
            <option value="snake">
              Serpiente (las rondas pares van al revés)
            </option>
            <option value="linear">Lineal</option>
          </select>
        </div>
      </div>
      {editable ? (
        <div className="flex flex-col gap-2">
          <span className={label}>
            Primera ronda{' '}
            {orderMethod === 'fixed-random'
              ? '(se sortea al iniciar; edítalo aquí si quieres fijarlo)'
              : '(editable)'}
          </span>
          <ReorderList
            ids={shown}
            onChange={setOrder}
            renderItem={(id) => (
              <span className="text-(--parchment) text-sm">
                {byId.get(id) ?? id}
              </span>
            )}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.primary}
          disabled={start.isPending || captains.length < 2}
          onClick={() =>
            start.mutate({
              tournamentId: state.id,
              method: draftMethod,
              captainOrderMethod: orderMethod,
              baseOrder:
                editable && (order || orderMethod !== 'fixed-random')
                  ? shown
                  : undefined,
            })
          }
          type="button"
        >
          {start.isPending ? 'Abriendo…' : 'Iniciar el draft'}
        </button>
        {start.error ? (
          <span className="text-(--ember) text-xs">{start.error.message}</span>
        ) : null}
      </div>
    </div>
  );
};

const TIMER_FIELDS: {
  key: keyof AuctionConfig;
  text: string;
  seconds: boolean;
}[] = [
  { key: 'initialTimerMs', text: 'Salida (s)', seconds: true },
  { key: 'countdownMs', text: 'Cuenta atrás (s)', seconds: true },
  { key: 'countdownShortMs', text: 'Cuenta atrás corta (s)', seconds: true },
  {
    key: 'countdownShortAfterBids',
    text: 'Corta a partir de la puja nº',
    seconds: false,
  },
  { key: 'lockoutMs', text: 'Bloqueo tras puja (s)', seconds: true },
];

const TimerFields = ({
  config,
  onChange,
}: {
  config: AuctionConfig;
  onChange: (next: AuctionConfig) => void;
}) => (
  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {TIMER_FIELDS.map((field) => (
      <div className="flex flex-col gap-1" key={field.key}>
        <span className={label}>{field.text}</span>
        <input
          className={input}
          min={0}
          onChange={(e) => {
            const value = Number(e.target.value);
            onChange({
              ...config,
              [field.key]: field.seconds
                ? Math.round(value * 1000)
                : Math.round(value),
            });
          }}
          step={field.seconds ? 0.5 : 1}
          type="number"
          value={field.seconds ? config[field.key] / 1000 : config[field.key]}
        />
      </div>
    ))}
  </div>
);

const AuctionStart = ({
  state,
  onStarted,
}: {
  state: LiveState;
  onStarted: () => void;
}) => {
  const [config, setConfig] = useState<AuctionConfig>(DEFAULT_AUCTION_CONFIG);
  const start = api.formation.startAuction.useMutation({
    onSuccess: onStarted,
  });
  return (
    <div className="flex flex-col gap-4">
      <TimerFields config={config} onChange={setConfig} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.primary}
          disabled={start.isPending}
          onClick={() => start.mutate({ tournamentId: state.id, config })}
          type="button"
        >
          {start.isPending ? 'Abriendo…' : 'Iniciar la subasta'}
        </button>
        <span className="text-(--faded) text-xs">
          Los tiempos se pueden ajustar también con la subasta en marcha.
        </span>
        {start.error ? (
          <span className="text-(--ember) text-xs">{start.error.message}</span>
        ) : null}
      </div>
    </div>
  );
};

const AuctionControls = ({
  state,
  onDone,
}: {
  state: LiveState;
  onDone: () => void;
}) => {
  const room = state.room;
  const auction = room?.kind === 'auction' ? room.state : null;
  const utils = api.useUtils();
  const refresh = () => utils.live.state.invalidate({ tournamentId: state.id });
  const next = api.formation.confirmNext.useMutation({ onSuccess: refresh });
  const skip = api.formation.confirmSkip.useMutation({ onSuccess: refresh });
  const raffle = api.formation.raffle.useMutation({ onSuccess: refresh });
  const pause = api.formation.pause.useMutation({ onSuccess: refresh });
  const resume = api.formation.resume.useMutation({ onSuccess: refresh });
  const undo = api.formation.undo.useMutation({ onSuccess: refresh });
  const finish = api.formation.finish.useMutation({ onSuccess: onDone });
  const updateConfig = api.formation.updateAuctionConfig.useMutation({
    onSuccess: refresh,
  });
  const [config, setConfig] = useState<AuctionConfig | null>(null);
  if (!auction) return null;
  const arg = { tournamentId: state.id };
  const error =
    next.error ??
    skip.error ??
    raffle.error ??
    pause.error ??
    resume.error ??
    undo.error ??
    finish.error ??
    updateConfig.error;
  const byId = new Map(state.participants.map((p) => [p.id, p.name]));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-(--faded) text-sm">
        Fase: <strong className="text-(--parchment)">{auction.phase}</strong>
        {auction.currentLot
          ? ` · en el atril: ${byId.get(auction.currentLot.playerId) ?? '…'}`
          : ''}
        {' · '}
        {auction.sales.length} ventas
      </p>
      <div className="flex flex-wrap gap-2">
        {auction.phase === 'idle' ? (
          <button
            className={btn.primary}
            disabled={next.isPending}
            onClick={() => next.mutate(arg)}
            type="button"
          >
            {auction.startedAt &&
            auction.sales.length === 0 &&
            !auction.currentLot
              ? 'Abrir el primer lote'
              : 'Siguiente lote'}
          </button>
        ) : null}
        {auction.phase === 'unsold_wait' ? (
          <button
            className={btn.primary}
            disabled={skip.isPending}
            onClick={() => skip.mutate(arg)}
            type="button"
          >
            Pasar (desierto)
          </button>
        ) : null}
        {auction.phase === 'raffle_wait' ? (
          <button
            className={btn.primary}
            disabled={raffle.isPending}
            onClick={() => raffle.mutate(arg)}
            type="button"
          >
            Sortear los que quedan
          </button>
        ) : null}
        {auction.phase !== 'paused' && auction.phase !== 'closed' ? (
          <button
            className={btn.secondary}
            disabled={pause.isPending}
            onClick={() => pause.mutate({ ...arg, kind: 'auction' })}
            type="button"
          >
            Pausa
          </button>
        ) : null}
        {auction.phase === 'paused' ? (
          <button
            className={btn.primary}
            disabled={resume.isPending}
            onClick={() => resume.mutate({ ...arg, kind: 'auction' })}
            type="button"
          >
            Reanudar
          </button>
        ) : null}
        {auction.phase !== 'closed' ? (
          <button
            className={btn.danger}
            disabled={undo.isPending}
            onClick={() => undo.mutate({ ...arg, kind: 'auction' })}
            type="button"
          >
            Deshacer el lote
          </button>
        ) : null}
        {auction.phase === 'closed' ? (
          <button
            className={btn.primary}
            disabled={finish.isPending}
            onClick={() => finish.mutate(arg)}
            type="button"
          >
            {finish.isPending ? 'Publicando…' : 'Publicar los equipos'}
          </button>
        ) : null}
      </div>
      {auction.phase !== 'closed' ? (
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer font-mono text-(--gold) text-2xs uppercase tracking-2xl">
            Tiempos
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <TimerFields
              config={config ?? auction.config}
              onChange={setConfig}
            />
            <button
              className={`${btn.secondary} self-start`}
              disabled={!config || updateConfig.isPending}
              onClick={() =>
                config &&
                updateConfig.mutate({ tournamentId: state.id, config })
              }
              type="button"
            >
              Aplicar tiempos
            </button>
          </div>
        </details>
      ) : null}
      {error ? <p className="text-(--ember) text-sm">{error.message}</p> : null}
    </div>
  );
};

const DraftControls = ({
  state,
  onDone,
}: {
  state: LiveState;
  onDone: () => void;
}) => {
  const room = state.room;
  const draft = room?.kind === 'draft' ? room.state : null;
  const utils = api.useUtils();
  const refresh = () => utils.live.state.invalidate({ tournamentId: state.id });
  const pause = api.formation.pause.useMutation({ onSuccess: refresh });
  const resume = api.formation.resume.useMutation({ onSuccess: refresh });
  const undo = api.formation.undo.useMutation({ onSuccess: refresh });
  const finish = api.formation.finish.useMutation({ onSuccess: onDone });
  if (!draft) return null;
  const arg = { tournamentId: state.id, kind: 'draft' as const };
  const error = pause.error ?? resume.error ?? undo.error ?? finish.error;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-(--faded) text-sm">
        {draft.phase === 'closed'
          ? 'Draft completado.'
          : `${draft.picks.length} de ${draft.turnQueue.length} elecciones.`}
        {isDraftComplete(draft) ? ' Todos han elegido.' : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        {draft.phase === 'open' ? (
          <button
            className={btn.secondary}
            disabled={pause.isPending}
            onClick={() => pause.mutate(arg)}
            type="button"
          >
            Pausa
          </button>
        ) : null}
        {draft.phase === 'paused' ? (
          <button
            className={btn.primary}
            disabled={resume.isPending}
            onClick={() => resume.mutate(arg)}
            type="button"
          >
            Reanudar
          </button>
        ) : null}
        {draft.phase !== 'closed' && draft.picks.length > 0 ? (
          <button
            className={btn.danger}
            disabled={undo.isPending}
            onClick={() => undo.mutate(arg)}
            type="button"
          >
            Deshacer la última elección
          </button>
        ) : null}
        {draft.phase === 'closed' ? (
          <button
            className={btn.primary}
            disabled={finish.isPending}
            onClick={() => finish.mutate({ tournamentId: state.id })}
            type="button"
          >
            {finish.isPending ? 'Publicando…' : 'Publicar los equipos'}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-(--ember) text-sm">{error.message}</p> : null}
    </div>
  );
};

export { FormationPanel };
