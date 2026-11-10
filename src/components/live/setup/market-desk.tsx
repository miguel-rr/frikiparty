'use client';

import { useState } from 'react';

import { potLabels } from '@/components/live/setup/pot-labels';
import { OptionCard } from '@/components/live/setup/ranking-options';
import { btn, input, label } from '@/components/theme/primitives';
import {
  DEFAULT_MARKET_CONFIG,
  type MarketConfig,
  startingBudgets,
} from '@/lib/tournament/market-auction';
import { groupsFor } from '@/lib/tournament/pot-groups';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

type Choice<K extends keyof MarketConfig> = {
  value: MarketConfig[K];
  title: string;
  summary: string;
};

const BIDDING: Choice<'bidding'>[] = [
  {
    value: 'sealed',
    title: 'Sobre cerrado',
    summary:
      'Cada capitán escribe en secreto lo máximo que paga, y al abrir los sobres gana el más alto. Nadie ve las pujas de los demás hasta el final del lote.',
  },
  {
    value: 'open',
    title: 'Puja abierta',
    summary:
      'Pujas a la vista, cada una por encima de la anterior. Cada puja da al resto un tiempo para responder.',
  },
];

const PRICE: Choice<'sealedPrice'>[] = [
  {
    value: 'second_plus_one',
    title: 'La segunda más 1',
    summary:
      'El ganador paga la segunda puja más alta más 1. Conviene escribir lo que de verdad vale para ti: pujar de más no te hace pagar más.',
  },
  {
    value: 'own',
    title: 'Lo que ha pujado',
    summary: 'El ganador paga su propia puja. Invita a tantear a la baja.',
  },
];

const LOT_ORDER: Choice<'lotOrder'>[] = [
  {
    value: 'nomination',
    title: 'Nominación por turnos',
    summary:
      'En su turno, cada capitán elige a quién se subasta y abre con al menos el mínimo, así que ningún lote queda desierto. El que tiene el equipo completo se salta el turno.',
  },
  {
    value: 'random',
    title: 'Al azar',
    summary:
      'Los jugadores salen en orden aleatorio dentro de cada grupo. Un lote sin pujas vuelve a salir; si en una vuelta entera no se vende nada, se sortean.',
  },
];

const TURN_ORDER: Choice<'turnOrder'>[] = [
  {
    value: 'draw',
    title: 'Sorteado una vez',
    summary: 'Se sortea al empezar y se repite igual en cada vuelta.',
  },
  {
    value: 'inverse_ranking',
    title: 'Del peor al mejor capitán',
    summary: 'Empieza el capitán peor situado en el ranking.',
  },
  {
    value: 'ranking',
    title: 'Del mejor al peor capitán',
    summary: 'Empieza el capitán mejor situado en el ranking.',
  },
];

const DRAFT_ORDER: Choice<'draftOrder'>[] = [
  {
    value: 'snake',
    title: 'Serpiente',
    summary:
      'El orden se invierte en cada vuelta: quien elige último en una vuelta elige primero en la siguiente. Compensa elegir tarde.',
  },
  {
    value: 'linear',
    title: 'Siempre igual',
    summary:
      'Cada vuelta empieza el mismo capitán. Premia mucho al primero del orden.',
  },
];

const RESERVE: Choice<'reserve'>[] = [
  {
    value: 'one',
    title: 'Guardar 1 por plaza',
    summary:
      'No puedes pujar tanto que te quedes sin 1 moneda por cada plaza que te falte después de esta.',
  },
  {
    value: 'minimum',
    title: 'Guardar el mínimo por plaza',
    summary: 'Igual, pero guardando el precio mínimo más bajo en vez de 1.',
  },
  {
    value: 'none',
    title: 'Sin reserva',
    summary:
      'Puedes gastarlo todo. Quien se queda sin dinero se lleva lo que sobre al final, gratis.',
  },
];

const REVEAL: Choice<'reveal'>[] = [
  {
    value: 'all',
    title: 'Todas las pujas',
    summary: 'Tras cada lote se ven todos los sobres.',
  },
  {
    value: 'winner',
    title: 'Solo el ganador',
    summary: 'Tras cada lote se ve quién gana y cuánto paga.',
  },
  {
    value: 'end',
    title: 'Todo al final',
    summary:
      'Durante la subasta solo se ve quién se lleva a quién; precios, pujas y dinero se revelan al terminar.',
  },
];

const Choices = <K extends keyof MarketConfig>({
  title,
  options,
  value,
  onChange,
  columns = 2,
}: {
  title: string;
  options: Choice<K>[];
  value: MarketConfig[K];
  onChange: (value: MarketConfig[K]) => void;
  columns?: 2 | 3;
}) => (
  <div className="flex flex-col gap-2">
    <span className={label}>{title}</span>
    <div
      className={`grid gap-2 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
    >
      {options.map((option) => (
        <OptionCard
          active={value === option.value}
          key={String(option.value)}
          onSelect={() => onChange(option.value)}
          title={option.title}
        >
          {option.summary}
        </OptionCard>
      ))}
    </div>
  </div>
);

const NumberField = ({
  text,
  value,
  onChange,
  help,
}: {
  text: string;
  value: number;
  onChange: (value: number) => void;
  help?: string;
}) => (
  <label className="flex flex-col gap-1">
    <span className={label}>{text}</span>
    <input
      className={input}
      min={0}
      onChange={(e) =>
        onChange(Math.max(0, Math.round(Number(e.target.value))))
      }
      type="number"
      value={value}
    />
    {help ? <span className="text-(--faded) text-xs">{help}</span> : null}
  </label>
);

/**
 * The general auction's options before it opens, each explained, with
 * the money each captain would start with and what a lot would cost.
 */
const MarketStart = ({
  state,
  onStarted,
}: {
  state: LiveState;
  onStarted: () => void;
}) => {
  const groups = groupsFor(state.pots, state.rankingMeta?.groups);
  const labels = potLabels(
    state.pots,
    state.rankingMeta?.groups,
    state.formationConfig.potCriterion,
    state.captainPotIndex,
  );
  const auctioned = state.pots
    .map((_, index) => index)
    .filter((index) => index !== state.captainPotIndex);
  const [config, setConfig] = useState<MarketConfig>(() => ({
    ...DEFAULT_MARKET_CONFIG,
    minBids: state.pots.map(() => 1),
  }));
  const set = <K extends keyof MarketConfig>(key: K, value: MarketConfig[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));
  const start = api.formation.startMarket.useMutation({ onSuccess: onStarted });
  const captains = state.teams
    .map((t) => t.members.find((m) => m.isCaptain)?.playerId)
    .filter((id): id is string => Boolean(id));
  const names = new Map(state.participants.map((p) => [p.id, p.name]));
  const budgets = startingBudgets(captains, state.ranking ?? [], config);
  const seats = Math.max(0, (state.teamSize ?? state.pots.length) - 1);
  const reserveUnit =
    config.reserve === 'none'
      ? 0
      : config.reserve === 'one'
        ? 1
        : Math.min(...auctioned.map((index) => config.minBids[index] ?? 1));
  const sealed = config.bidding === 'sealed';
  return (
    <div className="flex flex-col gap-5">
      <p className="text-(--faded) text-sm">
        Los grupos se subastan en este orden:{' '}
        {auctioned
          .map((index) => `${labels[index]?.title} (${labels[index]?.detail})`)
          .join(' → ')}
        . Cada equipo se lleva su cupo de cada uno.
      </p>
      <Choices
        onChange={(value) => set('bidding', value)}
        options={BIDDING}
        title="Cómo se puja"
        value={config.bidding}
      />
      {sealed ? (
        <Choices
          onChange={(value) => set('sealedPrice', value)}
          options={PRICE}
          title="Cuánto paga el ganador"
          value={config.sealedPrice}
        />
      ) : null}
      {sealed ? (
        <p className="text-(--faded) text-xs">
          Ejemplo: si los sobres dicen 30, 12 y 5, el de 30 se lo lleva y paga{' '}
          {config.sealedPrice === 'own' ? '30' : '13'}. Si empatan, gana quien
          tiene más dinero; si también empatan, se sortea.
        </p>
      ) : null}
      <Choices
        onChange={(value) => set('lotOrder', value)}
        options={LOT_ORDER}
        title="Quién sale a subasta"
        value={config.lotOrder}
      />
      {config.lotOrder === 'nomination' ? (
        <Choices
          columns={3}
          onChange={(value) => set('turnOrder', value)}
          options={TURN_ORDER}
          title="Orden de turnos"
          value={config.turnOrder}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          help="Lo mismo para todos."
          onChange={(value) => set('budget', Math.max(1, value))}
          text="Presupuesto"
          value={config.budget}
        />
        <NumberField
          help="Opcional: monedas extra por cada puesto que un capitán esté por debajo del mejor capitán. 0 = nada."
          onChange={(value) => set('compensationPerPlace', value)}
          text="Compensación por puesto"
          value={config.compensationPerPlace}
        />
        {auctioned.map((index) => (
          <NumberField
            help={`${state.pots[index]?.length ?? 0} jugadores · ${labels[index]?.detail ?? ''}`}
            key={index}
            onChange={(value) =>
              set(
                'minBids',
                config.minBids.map((min, i) => (i === index ? value : min)),
              )
            }
            text={`Mínimo · ${labels[index]?.title ?? ''}`}
            value={config.minBids[index] ?? 1}
          />
        ))}
      </div>
      <Choices
        columns={3}
        onChange={(value) => set('reserve', value)}
        options={RESERVE}
        title="Dinero de reserva"
        value={config.reserve}
      />
      <div className="flex flex-col gap-1 text-sm">
        <span className={label}>Así empieza cada capitán</span>
        {captains.map((id) => (
          <span className="text-(--parchment)" key={id}>
            {names.get(id) ?? '…'}: {budgets[id]} monedas · primera puja máxima{' '}
            {Math.max(
              0,
              (budgets[id] ?? 0) - reserveUnit * Math.max(0, seats - 1),
            )}
          </span>
        ))}
        <span className="text-(--faded) text-xs">
          {seats} plazas por equipo además del capitán.
          {groups.some((g) => g.quota === 'fill')
            ? ' El mercado se reparte hasta completar los equipos.'
            : ''}
        </span>
      </div>
      <Choices
        columns={3}
        onChange={(value) => set('reveal', value)}
        options={REVEAL}
        title="Qué se ve después de cada lote"
        value={config.reveal}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          help={
            sealed
              ? 'Tiempo para escribir el sobre de cada lote. Si todos envían antes, se abre antes.'
              : 'Tiempo antes de la primera puja.'
          }
          onChange={(value) => set('lotTimeMs', Math.max(5, value) * 1000)}
          text="Tiempo por lote (s)"
          value={config.lotTimeMs / 1000}
        />
        {sealed ? (
          <NumberField
            help="Opcional, como en el ajedrez: si te pasas del tiempo del lote, se gasta de aquí. Sin banco, quien no envía no puja. 0 = sin banco."
            onChange={(value) => set('timeBankMs', value * 1000)}
            text="Banco de tiempo por capitán (s)"
            value={config.timeBankMs / 1000}
          />
        ) : (
          <NumberField
            help="Cada puja deja al menos este tiempo para responder."
            onChange={(value) => set('countdownMs', Math.max(3, value) * 1000)}
            text="Tiempo tras cada puja (s)"
            value={config.countdownMs / 1000}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.primary}
          disabled={start.isPending}
          onClick={() => start.mutate({ tournamentId: state.id, config })}
          type="button"
        >
          {start.isPending ? 'Abriendo…' : 'Iniciar la subasta general'}
        </button>
        {start.error ? (
          <span className="text-(--ember) text-xs">{start.error.message}</span>
        ) : null}
      </div>
    </div>
  );
};

/** Captain ids in ranking order (best first). */
const captainsByRank = (state: LiveState) => {
  const place = new Map((state.ranking ?? []).map((id, index) => [id, index]));
  return state.teams
    .map((t) => t.members.find((m) => m.isCaptain)?.playerId)
    .filter((id): id is string => Boolean(id))
    .sort((a, b) => (place.get(a) ?? 0) - (place.get(b) ?? 0));
};

/**
 * The free draft's options: turn order and snake or linear, with the
 * first rounds of turns shown as they would run.
 */
const DraftMarketStart = ({
  state,
  onStarted,
}: {
  state: LiveState;
  onStarted: () => void;
}) => {
  const labels = potLabels(
    state.pots,
    state.rankingMeta?.groups,
    state.formationConfig.potCriterion,
    state.captainPotIndex,
  );
  const picked = state.pots
    .map((_, index) => index)
    .filter((index) => index !== state.captainPotIndex);
  const [config, setConfig] = useState<MarketConfig>(() => ({
    ...DEFAULT_MARKET_CONFIG,
    mode: 'draft',
    lotOrder: 'nomination',
    turnOrder: 'inverse_ranking',
    minBids: state.pots.map(() => 0),
  }));
  const set = <K extends keyof MarketConfig>(key: K, value: MarketConfig[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));
  const start = api.formation.startMarket.useMutation({ onSuccess: onStarted });
  const names = new Map(state.participants.map((p) => [p.id, p.name]));
  const byRank = captainsByRank(state);
  const order =
    config.turnOrder === 'ranking'
      ? byRank
      : config.turnOrder === 'inverse_ranking'
        ? [...byRank].reverse()
        : null;
  const rounds = [1, 2, 3].map((number) => ({
    number,
    order:
      order && config.draftOrder === 'snake' && number % 2 === 0
        ? [...order].reverse()
        : order,
  }));
  return (
    <div className="flex flex-col gap-5">
      <p className="text-(--faded) text-sm">
        Sin dinero: en su turno cada capitán elige a un jugador del grupo que
        está en la mesa, respetando el cupo de cada grupo. Orden de los grupos:{' '}
        {picked
          .map((index) => `${labels[index]?.title} (${labels[index]?.detail})`)
          .join(' → ')}
        . Quien ya tiene su cupo de un grupo se salta el turno.
      </p>
      <Choices
        columns={3}
        onChange={(value) => set('turnOrder', value)}
        options={TURN_ORDER}
        title="Quién empieza"
        value={config.turnOrder}
      />
      <Choices
        onChange={(value) => set('draftOrder', value)}
        options={DRAFT_ORDER}
        title="Cómo siguen las vueltas"
        value={config.draftOrder}
      />
      <div className="flex flex-col gap-1 text-sm">
        <span className={label}>Así irían las primeras vueltas</span>
        {rounds.map((round) => (
          <span className="text-(--parchment)" key={round.number}>
            Vuelta {round.number}:{' '}
            {round.order
              ? round.order.map((id) => names.get(id) ?? '…').join(' → ')
              : round.number === 1
                ? 'orden sorteado al empezar'
                : config.draftOrder === 'snake'
                  ? 'la anterior al revés'
                  : 'igual que la primera'}
          </span>
        ))}
        <span className="text-(--faded) text-xs">
          Los turnos siguen contando al cambiar de grupo: la serpiente no se
          reinicia.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.primary}
          disabled={start.isPending}
          onClick={() => start.mutate({ tournamentId: state.id, config })}
          type="button"
        >
          {start.isPending ? 'Abriendo…' : 'Iniciar el draft libre'}
        </button>
        {start.error ? (
          <span className="text-(--ember) text-xs">{start.error.message}</span>
        ) : null}
      </div>
    </div>
  );
};

/** The organiser's levers while the general auction runs. */
const MarketControls = ({
  state,
  onDone,
}: {
  state: LiveState;
  onDone: () => void;
}) => {
  const room = state.room;
  const market = room?.kind === 'market' ? room.state : null;
  const utils = api.useUtils();
  const refresh = () => utils.live.state.invalidate({ tournamentId: state.id });
  const next = api.formation.marketNext.useMutation({ onSuccess: refresh });
  const pause = api.formation.pause.useMutation({ onSuccess: refresh });
  const resume = api.formation.resume.useMutation({ onSuccess: refresh });
  const finish = api.formation.finish.useMutation({ onSuccess: onDone });
  if (!market) return null;
  const arg = { tournamentId: state.id };
  const error = next.error ?? pause.error ?? resume.error ?? finish.error;
  const PHASE_TEXT = {
    idle: 'entre lotes',
    nominating:
      market.config.mode === 'draft'
        ? 'un capitán está eligiendo'
        : 'un capitán está nominando',
    lot: 'lote abierto',
    paused: 'en pausa',
    closed: 'terminada',
  } as const;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-(--faded) text-sm">
        {market.config.mode === 'draft' ? 'Draft libre' : 'Subasta general'} ·{' '}
        <strong className="text-(--parchment)">
          {PHASE_TEXT[market.phase]}
        </strong>{' '}
        · {market.sales.length} jugadores asignados
      </p>
      <div className="flex flex-wrap gap-2">
        {market.phase === 'idle' ? (
          <button
            className={btn.primary}
            disabled={next.isPending}
            onClick={() => next.mutate(arg)}
            type="button"
          >
            Siguiente
          </button>
        ) : null}
        {market.phase !== 'paused' && market.phase !== 'closed' ? (
          <button
            className={btn.secondary}
            disabled={pause.isPending}
            onClick={() => pause.mutate({ ...arg, kind: 'market' })}
            type="button"
          >
            Pausa
          </button>
        ) : null}
        {market.phase === 'paused' ? (
          <button
            className={btn.primary}
            disabled={resume.isPending}
            onClick={() => resume.mutate({ ...arg, kind: 'market' })}
            type="button"
          >
            Reanudar
          </button>
        ) : null}
        {market.phase === 'closed' ? (
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
      <span className="text-(--faded) text-xs">
        {market.config.mode === 'draft'
          ? '«Siguiente» abre el grupo o el turno que toque; tras cada elección el siguiente turno se abre solo. Si un capitán no tiene el móvil, puedes elegir por él desde la sala.'
          : '«Siguiente» abre el grupo, el lote o el turno que toque. Si un capitán no tiene el móvil, puedes nominar y pujar por él desde su pantalla de capitán entrando como él.'}
      </span>
      {error ? <p className="text-(--ember) text-sm">{error.message}</p> : null}
    </div>
  );
};

export { DraftMarketStart, MarketControls, MarketStart };
