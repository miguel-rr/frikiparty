'use client';

import { useEffect, useState } from 'react';

import { potLabels } from '@/components/live/setup/pot-labels';
import {
  btn,
  input,
  label,
  panel,
  panelGold,
} from '@/components/theme/primitives';
import {
  canTake,
  currentGroup,
  eligibleFor,
  floorFor,
  type MarketSale,
  type MarketState,
  maxBidFor,
  unsoldIn,
} from '@/lib/tournament/market-auction';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

/** Ticks a clock for countdown displays. */
const useNow = (active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [active]);
  return now;
};

const seconds = (ms: number) => `${Math.ceil(ms / 1000)} s`;

const PRICE_TEXT = {
  own: 'paga lo que ha pujado',
  second_plus_one: 'paga la segunda puja más 1',
} as const;

/** One finished lot, told as much as the reveal option allows. */
const SaleLine = ({
  sale,
  name,
}: {
  sale: MarketSale;
  name: (id: string) => string;
}) => (
  <span className="flex flex-col gap-0.5">
    <span className="text-(--parchment)">
      {name(sale.playerId)} → {name(sale.captainId)}
      {sale.amount >= 0 ? ` por ${sale.amount}` : ''}
      {sale.kind === 'auto'
        ? ' (era el único que podía llevárselo)'
        : sale.kind === 'raffle'
          ? ' (sorteo: nadie pujó)'
          : ''}
    </span>
    {sale.bids.length > 0 ? (
      <span className="text-(--faded) text-xs">
        Pujas:{' '}
        {sale.bids
          .map((bid) => `${name(bid.captainId)} ${bid.amount}`)
          .join(' · ')}
        {sale.tieBreak === 'money'
          ? '. Empate: gana quien tenía más dinero.'
          : sale.tieBreak === 'draw'
            ? '. Empate total: se sorteó.'
            : ''}
      </span>
    ) : null}
  </span>
);

/**
 * The general auction for everyone: the group on the table, the lot with
 * its clock, who has sent a sealed envelope (never how much), the last
 * result, the captains' money and teams. The captain whose turn or lot it
 * is gets the controls under it.
 */
const MarketStage = ({
  live,
  market,
  captainId,
  tv,
}: {
  live: LiveState;
  market: MarketState;
  captainId: string | null;
  tv?: boolean;
}) => {
  const utils = api.useUtils();
  const refresh = () => utils.live.state.invalidate({ tournamentId: live.id });
  const byId = new Map(live.participants.map((p) => [p.id, p]));
  const name = (id: string) => byId.get(id)?.name ?? '…';
  const labels = potLabels(
    market.pots,
    market.groups,
    live.formationConfig.potCriterion,
    market.captainPotIndex,
  );
  const group = currentGroup(market);
  const lot = market.lot;
  const sealed = market.config.bidding === 'sealed';
  const running = market.phase === 'lot';
  const now = useNow(running);
  const base = lot ? Math.max(0, lot.deadlineAt - now) : null;
  const overall =
    market.deadlineAt === null ? null : Math.max(0, market.deadlineAt - now);
  const bidders = lot ? eligibleFor(market, lot.groupIndex) : [];
  const submitted = new Set(lot?.bids.map((bid) => bid.captainId) ?? []);
  const high = lot && !sealed ? lot.bids[lot.bids.length - 1] : undefined;
  const mine = api.formation.myMarketBid.useQuery(
    { tournamentId: live.id },
    {
      enabled: captainId !== null && !tv,
      refetchInterval: running ? 2000 : false,
    },
  );
  const [amount, setAmount] = useState('');
  const [nominee, setNominee] = useState<string | null>(null);
  const bid = api.formation.marketBid.useMutation({
    onSuccess: () => {
      setAmount('');
      refresh();
      mine.refetch();
    },
  });
  const nominate = api.formation.marketNominate.useMutation({
    onSuccess: () => {
      setAmount('');
      setNominee(null);
      refresh();
    },
  });
  const myTurn =
    captainId !== null &&
    market.phase === 'nominating' &&
    market.nominatorId === captainId;
  const canBid =
    captainId !== null &&
    lot !== null &&
    canTake(market, captainId, lot.groupIndex);
  const myMax = captainId ? maxBidFor(market, captainId) : 0;
  const myFloor =
    captainId && group !== null
      ? Math.max(1, floorFor(market, captainId, group))
      : 1;
  const big = tv ? 'text-6xl' : 'text-4xl';

  return (
    <div className="flex flex-col gap-5">
      <section className={`${panelGold} flex flex-col gap-4 p-5 sm:p-7`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
            {group !== null
              ? `${labels[group]?.title ?? 'Grupo'} · ${labels[group]?.detail ?? ''}`
              : 'Subasta general'}
          </span>
          <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
            {sealed ? 'Sobre cerrado' : 'Puja abierta'}
            {sealed ? ` · ${PRICE_TEXT[market.config.sealedPrice]}` : ''}
          </span>
        </div>

        {market.phase === 'closed' ? (
          <p className="d-display text-(--parchment) text-2xl uppercase">
            Subasta terminada
          </p>
        ) : market.phase === 'paused' ? (
          <p className="d-display text-(--parchment) text-2xl uppercase">
            En pausa
          </p>
        ) : market.phase === 'nominating' ? (
          <p className="text-(--parchment) text-lg">
            Turno de <strong>{name(market.nominatorId ?? '')}</strong>: elige a
            quién subasta y abre con su puja.
          </p>
        ) : lot ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <span
              className={`d-display font-bold text-(--parchment) uppercase ${big}`}
            >
              {name(lot.playerId)}
            </span>
            {lot.nominatorId ? (
              <span className="text-(--faded) text-sm">
                Lo nomina {name(lot.nominatorId)}
              </span>
            ) : null}
            {high ? (
              <span className="font-mono text-(--gold-hi) text-3xl">
                {high.amount} · {name(high.captainId)}
              </span>
            ) : null}
            {base !== null ? (
              <span className="font-mono text-(--gold) text-xl">
                {base > 0
                  ? seconds(base)
                  : overall && overall > 0
                    ? `Tiempo de banco · ${seconds(overall)}`
                    : 'Cerrando…'}
              </span>
            ) : null}
            {sealed ? (
              <span className="flex flex-wrap justify-center gap-2 text-xs">
                {bidders.map((id) => (
                  <span
                    className={`rounded-full border px-2.5 py-1 ${
                      submitted.has(id)
                        ? 'border-(--gold) text-(--gold-hi)'
                        : 'border-(--hair) text-(--faded)'
                    }`}
                    key={id}
                  >
                    {submitted.has(id) ? '✉ ' : '… '}
                    {name(id)}
                  </span>
                ))}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-(--faded) text-sm">
            Esperando al organizador para el siguiente lote.
          </p>
        )}

        {market.lastSale ? (
          <div className="border-(--hair) border-t pt-3 text-sm">
            <SaleLine name={name} sale={market.lastSale} />
          </div>
        ) : market.lastUnsold ? (
          <p className="border-(--hair) border-t pt-3 text-(--faded) text-sm">
            {name(market.lastUnsold)} se queda sin pujas: vuelve a salir más
            tarde.
          </p>
        ) : null}
      </section>

      {myTurn && group !== null ? (
        <section className={`${panel} flex flex-col gap-3 p-5`}>
          <span className={label}>Tu turno: elige jugador y puja inicial</span>
          <div className="flex flex-wrap gap-2">
            {unsoldIn(market, group).map((id) => (
              <button
                aria-pressed={nominee === id}
                className={`rounded-full border px-3 py-1 text-sm ${
                  nominee === id
                    ? 'border-(--gold) text-(--gold-hi)'
                    : 'border-(--hair) text-(--parchment)'
                }`}
                key={id}
                onClick={() => setNominee(id)}
                type="button"
              >
                {name(id)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${input} w-32`}
              inputMode="numeric"
              min={myFloor}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(myFloor)}
              type="number"
              value={amount}
            />
            <button
              className={btn.primary}
              disabled={!nominee || nominate.isPending}
              onClick={() =>
                nominee &&
                nominate.mutate({
                  tournamentId: live.id,
                  playerId: nominee,
                  amount: Number(amount || myFloor),
                })
              }
              type="button"
            >
              Nominar
            </button>
          </div>
          <span className="text-(--faded) text-xs">
            Pujas al menos {myFloor} y como mucho {myMax}
            {sealed ? '. Tu puja va en sobre cerrado, como las demás.' : '.'}
          </span>
          {nominate.error ? (
            <span className="text-(--ember) text-xs">
              {nominate.error.message}
            </span>
          ) : null}
        </section>
      ) : null}

      {canBid && lot && captainId ? (
        <section className={`${panel} flex flex-col gap-3 p-5`}>
          <span className={label}>
            {sealed ? 'Tu sobre' : 'Tu puja'} · tienes{' '}
            {market.budgets[captainId]} · como mucho {myMax}
            {sealed && market.config.timeBankMs > 0
              ? ` · banco ${seconds(mine.data?.bank ?? market.banks[captainId] ?? 0)}`
              : ''}
          </span>
          {sealed && mine.data?.amount != null ? (
            <span className="text-(--gold-hi) text-sm">
              Has enviado{' '}
              {mine.data.amount === 0 ? 'que no pujas' : mine.data.amount}.
              Puedes cambiarlo mientras el lote siga abierto.
            </span>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${input} w-32`}
              inputMode="numeric"
              min={0}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(high ? high.amount + 1 : myFloor)}
              type="number"
              value={amount}
            />
            <button
              className={btn.primary}
              disabled={bid.isPending || amount === ''}
              onClick={() =>
                bid.mutate({ tournamentId: live.id, amount: Number(amount) })
              }
              type="button"
            >
              {sealed ? 'Enviar sobre' : 'Pujar'}
            </button>
            {sealed && lot.nominatorId !== captainId ? (
              <button
                className={btn.ghost}
                disabled={bid.isPending}
                onClick={() => bid.mutate({ tournamentId: live.id, amount: 0 })}
                type="button"
              >
                No pujo
              </button>
            ) : null}
          </div>
          {bid.error ? (
            <span className="text-(--ember) text-xs">{bid.error.message}</span>
          ) : null}
        </section>
      ) : null}

      <section
        className={`${panel} grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3`}
      >
        {market.captainIds.map((id) => (
          <div className="flex flex-col gap-1 text-sm" key={id}>
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-(--parchment)">{name(id)}</span>
              <span className="font-mono text-(--gold)">
                {(market.budgets[id] ?? 0) >= 0 ? market.budgets[id] : '?'}
              </span>
            </span>
            <span className="text-(--faded) text-xs">
              {(market.rosters[id] ?? []).map(name).join(', ') ||
                'Sin jugadores'}
            </span>
          </div>
        ))}
      </section>

      <section className={`${panel} flex flex-col gap-2 p-5 text-sm`}>
        {market.walk.map((index) => {
          const left = unsoldIn(market, index);
          if (left.length === 0) return null;
          return (
            <span key={index}>
              <span className="text-(--gold)">{labels[index]?.title}</span>:{' '}
              <span className="text-(--faded)">
                {left.map(name).join(', ')}
              </span>
            </span>
          );
        })}
      </section>
    </div>
  );
};

export { MarketStage };
