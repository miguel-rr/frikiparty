'use client';

import { useEffect, useState } from 'react';
import { btn, panel, panelGold } from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import {
  type AuctionLiveState,
  captainsNeeding,
  countdownFor,
  minNextBid,
  unsoldInPot,
} from '@/lib/tournament/auction-live';
import { cardSpecFor } from '@/lib/tournament/card-lore';
import type { LiveState, Participant } from '@/server/live/state';

const RAISES = [1, 5, 10];

/** Ticks a clock for countdown displays. */
const useNow = (active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [active]);
  return now;
};

/**
 * The auction as a show: the player on the block with a big price and a
 * clock, the captains' gold and growing rosters, the pot's queue; the
 * captain who may bid gets the controls under it. Spectators, captains
 * and the TV share this — only `captainId` and `onBid` differ.
 */
const AuctionStage = ({
  live,
  auction,
  captainId,
  onBid,
  bidPending,
  bidError,
  tv,
}: {
  live: LiveState;
  auction: AuctionLiveState;
  /** The viewer's captain id, when they are one. */
  captainId: string | null;
  onBid?: (amount: number) => void;
  bidPending?: boolean;
  bidError?: string | null;
  tv?: boolean;
}) => {
  const byId = new Map(live.participants.map((p) => [p.id, p]));
  const name = (playerId: string) => byId.get(playerId)?.name ?? '…';
  const lot = auction.currentLot;
  const potIndex = auction.potWalk[auction.potCursor];
  const running = auction.phase !== 'paused' && auction.phase !== 'closed';
  const now = useNow(running && auction.deadlineAt !== null);
  const remaining =
    auction.deadlineAt === null ? null : Math.max(0, auction.deadlineAt - now);
  const timerTotal =
    auction.phase === 'lot_open'
      ? auction.config.initialTimerMs
      : auction.phase === 'countdown' && lot
        ? countdownFor(auction, lot.bidCount)
        : auction.phase === 'lockout'
          ? auction.config.lockoutMs
          : 0;
  const floor = minNextBid(auction);
  const eligible =
    captainId !== null &&
    lot !== null &&
    (auction.phase === 'lot_open' || auction.phase === 'countdown') &&
    captainsNeeding(auction, lot.potIndex).includes(captainId) &&
    (auction.budgets[captainId] ?? 0) >= floor;
  const remainingInPot =
    potIndex === undefined ? [] : unsoldInPot(auction, potIndex);
  const scale = tv ? 'text-7xl' : 'text-5xl';

  return (
    <div className={`flex flex-col gap-6 ${tv ? 'gap-8' : ''}`}>
      <style>{`
        @keyframes live-price-pop { 0% { transform: scale(1.35); color: #f0d48a; } 100% { transform: scale(1); } }
        @keyframes live-stamp { 0% { opacity: 0; transform: scale(2) rotate(-12deg); } 60% { opacity: 1; transform: scale(0.95) rotate(-8deg); } 100% { opacity: 1; transform: scale(1) rotate(-8deg); } }
        @keyframes live-enter { 0% { opacity: 0; transform: translateY(24px) scale(0.96); } 100% { opacity: 1; transform: none; } }
        @keyframes live-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(240,212,138,0.0); } 50% { box-shadow: 0 0 40px 6px rgba(240,212,138,0.35); } }
      `}</style>

      {/* Header: pot, round, phase */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
            {potIndex === undefined ? 'Subasta' : `Bombo ${potIndex + 1}`}
            {auction.round > 1 ? ` · vuelta ${auction.round}` : ''}
            {potIndex !== undefined
              ? ` · mínimo ${auction.minBidByPot[potIndex] ?? 0}`
              : ''}
          </span>
          <span className="d-display font-bold text-(--parchment) text-xl uppercase">
            {phaseTitle(auction)}
          </span>
        </div>
        {remaining !== null && running ? (
          <Clock
            label={clockLabel(auction.phase)}
            remainingMs={remaining}
            totalMs={timerTotal}
          />
        ) : null}
      </div>

      {/* The block */}
      <section
        className={`${panelGold} relative flex flex-col items-center gap-5 overflow-hidden p-6 sm:flex-row sm:items-stretch sm:gap-8 sm:p-8`}
        style={
          auction.phase === 'countdown' &&
          remaining !== null &&
          remaining < 5000
            ? { animation: 'live-pulse 1s ease-in-out infinite' }
            : undefined
        }
      >
        {lot ? (
          <LotCard
            leaderId={live.ranking?.[0]}
            participant={byId.get(lot.playerId)}
          />
        ) : auction.lastSale ? (
          <LotCard
            leaderId={live.ranking?.[0]}
            participant={byId.get(auction.lastSale.playerId)}
          />
        ) : (
          <div className="grid aspect-250/360 w-40 place-items-center rounded-2xl border border-(--hair) border-dashed text-(--faded) text-sm sm:w-48">
            Esperando
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          {lot ? (
            <>
              <span className="d-display font-bold text-(--parchment) text-3xl uppercase sm:text-4xl">
                {name(lot.playerId)}
              </span>
              <span className="font-mono text-(--faded) text-xs uppercase tracking-2xl">
                {lot.highBid ? 'Puja actual' : 'Precio de salida'}
              </span>
              <span
                className={`d-display font-black ${scale} text-(--gold-hi)`}
                key={lot.highBid?.amount ?? -1}
                style={{
                  animation: 'live-price-pop 450ms cubic-bezier(.2,.8,.2,1)',
                }}
              >
                {lot.highBid
                  ? lot.highBid.amount
                  : (auction.minBidByPot[lot.potIndex] ?? 0)}
              </span>
              <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                {lot.bidCount === 0
                  ? 'Sin pujas todavía'
                  : `${lot.bidCount} puja${lot.bidCount === 1 ? '' : 's'}`}
              </span>
            </>
          ) : auction.lastSale ? (
            <>
              <span className="d-display font-bold text-(--parchment) text-3xl uppercase sm:text-4xl">
                {name(auction.lastSale.playerId)}
              </span>
              <span className="font-mono text-(--faded) text-xs uppercase tracking-2xl">
                {auction.lastSale.kind === 'sold'
                  ? 'Se lo lleva'
                  : auction.lastSale.kind === 'raffle'
                    ? 'La suerte lo envía con'
                    : 'Asignado a'}
              </span>
              <span className="d-display font-black text-(--gold-hi) text-3xl uppercase sm:text-4xl">
                {name(auction.lastSale.captainId)}
              </span>
              <span className="font-mono text-(--gold) text-sm uppercase tracking-2xl">
                por {auction.lastSale.amount}
              </span>
            </>
          ) : (
            <span className="text-(--faded)">
              {auction.phase === 'closed'
                ? 'La subasta ha terminado.'
                : 'El organizador abrirá el siguiente lote.'}
            </span>
          )}
        </div>
        {auction.phase === 'unsold_wait' ? (
          <Stamp tone="ember">Desierto</Stamp>
        ) : null}
        {auction.phase === 'idle' && auction.lastSale ? (
          <Stamp tone="gold">
            {auction.lastSale.kind === 'sold' ? '¡Vendido!' : 'Adjudicado'}
          </Stamp>
        ) : null}
        {auction.phase === 'paused' ? <Stamp tone="silver">Pausa</Stamp> : null}
        {auction.phase === 'raffle_wait' ? (
          <Stamp tone="gold">Sorteo</Stamp>
        ) : null}
      </section>

      {/* Captain controls */}
      {captainId && onBid && auction.phase !== 'closed' ? (
        <section className={`${panel} flex flex-col gap-3 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
              Tu oro: {auction.budgets[captainId] ?? 0}
            </span>
            <span className="text-(--faded) text-xs">
              {auction.phase === 'lockout'
                ? 'Un momento…'
                : !lot
                  ? 'Esperando el siguiente lote.'
                  : eligible
                    ? `Puja mínima: ${floor}`
                    : captainsNeeding(auction, lot.potIndex).includes(captainId)
                      ? 'No te llega el oro para este.'
                      : 'Ya tienes jugador de este bombo.'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`${btn.primary} px-5 py-2`}
              disabled={!eligible || bidPending}
              onClick={() => onBid(floor)}
              type="button"
            >
              Pujar {floor}
            </button>
            {RAISES.map((raise) => {
              const amount =
                (lot?.highBid ? lot.highBid.amount : floor) + raise;
              return (
                <button
                  className={`${btn.secondary} px-4 py-2`}
                  disabled={
                    !eligible ||
                    bidPending ||
                    amount > (auction.budgets[captainId] ?? 0)
                  }
                  key={raise}
                  onClick={() => onBid(amount)}
                  type="button"
                >
                  +{raise}
                </button>
              );
            })}
          </div>
          {bidError ? (
            <span className="text-(--ember) text-xs">{bidError}</span>
          ) : null}
        </section>
      ) : null}

      {/* Captains and their gold */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {auction.captainIds.map((cid) => {
          const roster = auction.rosters[cid] ?? [];
          const needs =
            potIndex !== undefined &&
            captainsNeeding(auction, potIndex).includes(cid);
          return (
            <div
              className={`${panel} flex flex-col gap-2 p-3 ${cid === captainId ? 'ring-(--gold) ring-1' : ''}`}
              key={cid}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-(--parchment)">
                  {name(cid)}
                  {needs ? (
                    ''
                  ) : (
                    <span className="ml-1 text-(--moss) text-xs">✓</span>
                  )}
                </span>
                <span className="font-bold font-mono text-(--gold) text-sm">
                  {auction.budgets[cid] ?? 0}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {roster.map((pid) => (
                  <li
                    className="rounded-full border border-(--hair) bg-(--panel-2) px-2 py-0.5 text-(--parchment) text-xs"
                    key={pid}
                    style={{ animation: 'live-enter 500ms ease-out both' }}
                  >
                    {name(pid)}
                  </li>
                ))}
                {roster.length === 0 ? (
                  <li className="text-(--faded)/60 text-xs italic">
                    Sin compras
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </section>

      {/* Queue */}
      {remainingInPot.length > 0 ? (
        <section className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
            En este bombo quedan
          </span>
          {remainingInPot.map((pid) => (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                pid === lot?.playerId
                  ? 'border-(--gold) text-(--gold-hi)'
                  : 'border-(--hair) text-(--faded)'
              }`}
              key={pid}
            >
              {name(pid)}
            </span>
          ))}
        </section>
      ) : null}
    </div>
  );
};

const phaseTitle = (auction: AuctionLiveState) => {
  switch (auction.phase) {
    case 'lot_open':
      return 'Se abre la puja';
    case 'lockout':
      return '¡Puja!';
    case 'countdown':
      return 'A la una… a las dos…';
    case 'unsold_wait':
      return 'Nadie ha pujado';
    case 'raffle_wait':
      return 'La suerte decide';
    case 'paused':
      return 'Subasta en pausa';
    case 'closed':
      return 'Subasta cerrada';
    default:
      return auction.lastSale ? 'Adjudicado' : 'Entre lotes';
  }
};

const clockLabel = (phase: AuctionLiveState['phase']) =>
  phase === 'lot_open' ? 'Salida' : phase === 'lockout' ? 'Bloqueo' : 'Cierre';

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const Clock = ({
  remainingMs,
  totalMs,
  label,
}: {
  remainingMs: number;
  totalMs: number;
  label: string;
}) => {
  const fraction = totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0;
  const urgent = remainingMs < 5000 && label === 'Cierre';
  return (
    <div className="flex items-center gap-3">
      <svg height="64" viewBox="0 0 64 64" width="64">
        <title>{label}</title>
        <circle
          cx="32"
          cy="32"
          fill="none"
          r={RADIUS}
          stroke="var(--hair)"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          fill="none"
          r={RADIUS}
          stroke={urgent ? 'var(--ember)' : 'var(--gold)'}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          strokeLinecap="round"
          strokeWidth="5"
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className="flex flex-col">
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {label}
        </span>
        <span
          className={`font-bold font-mono text-2xl ${urgent ? 'text-(--ember)' : 'text-(--parchment)'}`}
        >
          {(remainingMs / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  );
};

const Stamp = ({
  children,
  tone,
}: {
  children: string;
  tone: 'gold' | 'ember' | 'silver';
}) => (
  <span
    className={`d-display pointer-events-none absolute top-4 right-4 rounded-md border-4 px-4 py-1 font-black text-2xl uppercase tracking-widest sm:text-3xl ${
      tone === 'gold'
        ? 'border-(--gold-hi) text-(--gold-hi)'
        : tone === 'ember'
          ? 'border-(--ember) text-(--ember)'
          : 'border-(--silver) text-(--silver)'
    }`}
    style={{ animation: 'live-stamp 500ms cubic-bezier(.2,.8,.2,1) both' }}
  >
    {children}
  </span>
);

const LotCard = ({
  participant,
  leaderId,
}: {
  participant: Participant | undefined;
  leaderId: string | undefined;
}) => {
  if (!participant) return null;
  const card = cardSpecFor({
    name: participant.name,
    rings: participant.rings,
    individualRings: participant.individualRings,
    cardPortrait: participant.cardPortrait,
    cardAbility: participant.cardAbility,
    cardAbilityText: participant.cardAbilityText,
    isLeader: participant.id === leaderId,
  });
  return (
    <div
      className="w-40 shrink-0 drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)] sm:w-48"
      key={participant.id}
      style={{ animation: 'live-enter 600ms cubic-bezier(.2,.8,.2,1) both' }}
    >
      <PortraitCard card={card} className="w-full" />
    </div>
  );
};

export { AuctionStage };
