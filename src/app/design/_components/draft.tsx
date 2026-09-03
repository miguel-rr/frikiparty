'use client';

import { useState } from 'react';
import { DRAFT } from '@/app/design/fixtures';
import {
  btn,
  PlayerBlazon,
  panel,
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';

/**
 * Draft with its two real views (see core-logic, "Realizar un draft"):
 *
 * - Captain view: what the captain on the clock sees — which bombos they can
 *   still pick from (one player per bombo, any order, no repeats), plus the
 *   definitive tournament ranking used to build the pots, as a guide.
 * - Spectator view: the same bombo boards (free players marked, no actions)
 *   and the round order.
 *
 * Both views close with the same team summary: every captain and the players
 * drafted so far, bombo by bombo.
 */

const CAPTAINS = DRAFT.pots[0]?.players.map((player) => player.name) ?? [];

/** Pots a captain already drafted from (pot 0 holds the captains). */
const pickedPotIndices = (captain: string) =>
  DRAFT.pots.flatMap((pot, index) =>
    index > 0 && pot.players.some((player) => player.pickedBy === captain)
      ? [index]
      : [],
  );

/** Team summary: picks by pot index, or null while that slot is pending. */
const teamPicks = (captain: string) =>
  DRAFT.pots.slice(1).map((pot, index) => {
    const pick = pot.players.find((player) => player.pickedBy === captain);
    return { potNumber: index + 2, player: pick?.name ?? null };
  });

/** First pot boundary lookup for the ranking guide separators. */
const POT_STARTS = new Map(
  DRAFT.pots.map((pot, index) => [index * 5, pot.label]),
);

/**
 * The bombo boards, shared by both views. With `forCaptain`, pots the
 * captain already used lock down and free players get pick actions;
 * without it, free players simply read as "libre".
 */
const PotsGrid = ({ forCaptain }: { forCaptain?: string }) => {
  const usedPots = forCaptain ? pickedPotIndices(forCaptain) : [];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {DRAFT.pots.slice(1).map((pot, index) => {
        const potIndex = index + 1;
        const locked = usedPots.includes(potIndex);
        const highlight = forCaptain !== undefined && !locked;
        const ownPick = forCaptain
          ? pot.players.find((player) => player.pickedBy === forCaptain)
          : undefined;
        const freeCount = pot.players.filter(
          (player) => player.pickedBy === null,
        ).length;
        return (
          <div
            className={`flex flex-col gap-3 rounded-lg border bg-(--night-2) p-4 ${
              locked
                ? 'border-(--hair) opacity-55'
                : highlight
                  ? 'border-(--gold) shadow-[0_0_14px_rgba(201,165,87,0.12)]'
                  : 'border-(--hair)'
            }`}
            key={pot.label}
          >
            <div className="flex flex-col gap-1">
              <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
                {pot.label}
              </span>
              <span
                className={`font-mono text-3xs uppercase tracking-xl ${
                  forCaptain
                    ? locked
                      ? 'text-(--ember)'
                      : 'text-(--moss)'
                    : 'text-(--faded)'
                }`}
              >
                {forCaptain
                  ? locked
                    ? `Ya elegiste a ${ownPick?.name}`
                    : 'Puedes elegir'
                  : `${freeCount} por elegir`}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {pot.players.map((player) => {
                const taken = player.pickedBy !== null;
                return (
                  <li
                    className="flex min-h-8 items-center justify-between gap-2"
                    key={player.name}
                  >
                    <span
                      className={`text-sm ${
                        taken
                          ? 'text-(--faded) line-through decoration-(--ember)/60'
                          : 'font-bold'
                      }`}
                    >
                      {player.name}
                    </span>
                    {taken ? (
                      <span className="font-mono text-(--faded) text-3xs uppercase tracking-widest">
                        → {player.pickedBy}
                      </span>
                    ) : highlight ? (
                      <button
                        className={`${btn.primary} px-3 py-1 text-xs`}
                        type="button"
                      >
                        Elegir
                      </button>
                    ) : locked ? null : (
                      <span className="rounded-full border border-(--moss)/40 px-2 py-0.5 font-mono text-(--moss) text-3xs uppercase tracking-xl">
                        Libre
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

/** How the five teams are shaping up — closes both views. */
const TeamsSummary = () => (
  <div className="flex flex-col gap-3">
    <span className="font-bold font-mono text-(--faded) text-2xs uppercase tracking-2xl">
      Así van los equipos
    </span>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {CAPTAINS.map((captain) => (
        <div
          className={`flex flex-col gap-3 rounded-lg border p-4 ${
            captain === DRAFT.onClock
              ? 'border-(--gold) bg-(--night-2) shadow-[0_0_14px_rgba(201,165,87,0.12)]'
              : 'border-(--hair) bg-(--night-2)'
          }`}
          key={captain}
        >
          <div className="flex items-center gap-2.5">
            <PlayerBlazon name={captain} size="sm" />
            <div className="flex flex-col">
              <span className="font-bold text-sm">{captain}</span>
              <span className="font-mono text-(--gold) text-3xs uppercase tracking-2xl">
                Capitán
              </span>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5">
            {teamPicks(captain).map(({ player, potNumber }) => (
              <li
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                  player
                    ? 'border-(--hair) bg-(--panel-2)'
                    : 'border-(--hair) border-dashed text-(--faded)'
                }`}
                key={potNumber}
              >
                <span className="font-bold font-mono text-(--gold) text-3xs tracking-widest">
                  B{potNumber}
                </span>
                {player ? (
                  <span className="font-bold">{player}</span>
                ) : (
                  <span className="font-mono text-2xs uppercase tracking-widest">
                    Pendiente
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

/** Round order strip: past turns show the player each captain took. */
const RoundOrder = () => (
  <div className="flex flex-col gap-3">
    <span className="font-bold font-mono text-(--faded) text-2xs uppercase tracking-2xl">
      Orden de la ronda {DRAFT.round} · {DRAFT.methodLabel}
    </span>
    {/* Mobile: numbered vertical list (a wrapped arrow-chain reads broken);
        sm+: the horizontal snake chain. */}
    <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {DRAFT.roundOrder.map((captain, index) => {
        const pick = DRAFT.picksThisRound[captain];
        const onClock = captain === DRAFT.onClock;
        return (
          <li className="flex items-center gap-2" key={captain}>
            {index > 0 ? (
              <span aria-hidden className="hidden text-(--faded) sm:inline">
                →
              </span>
            ) : null}
            <span className="w-4 text-right font-bold font-mono text-(--faded) text-xs sm:hidden">
              {index + 1}
            </span>
            <span
              className={`flex flex-1 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 sm:flex-none ${
                onClock
                  ? 'border-(--gold) bg-(--gold)/15 font-extrabold text-(--gold-hi)'
                  : pick
                    ? 'border-(--hair) bg-(--panel-2) opacity-70'
                    : 'border-(--hair) bg-(--panel-2)'
              }`}
            >
              <PlayerBlazon name={captain} size="sm" />
              <span className="flex flex-col leading-tight">
                <span>{captain}</span>
                {pick ? (
                  <span className="font-mono text-(--moss) text-3xs tracking-widest">
                    ✓ {pick}
                  </span>
                ) : (
                  <span className="font-mono text-(--faded) text-3xs uppercase tracking-widest">
                    {onClock ? 'Al reloj' : 'Espera'}
                  </span>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  </div>
);

const CaptainView = () => {
  const captain = DRAFT.captainView;
  return (
    <div className={`${panelGold} flex flex-col`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-(--hair-gold) border-b px-5 py-4">
        <h3 className="d-display font-bold text-lg uppercase">
          Turno de <span className="d-gold-text">{captain}</span>
        </h3>
        <span className={tag}>
          Ronda {DRAFT.round} de {DRAFT.totalRounds} · {DRAFT.methodLabel}
        </span>
      </div>
      <div className="border-(--hair) border-b p-5">
        <RoundOrder />
      </div>
      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_280px]">
        <PotsGrid forCaptain={captain} />
        <aside className="flex h-fit flex-col gap-3 rounded-lg border border-(--hair) bg-(--night-2) p-4">
          <div className="flex flex-col gap-1">
            <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
              Ranking del torneo
            </span>
            <span className="font-mono text-(--faded) text-3xs uppercase tracking-widest">
              Definitivo — con él se formaron los bombos
            </span>
          </div>
          <ol className="max-sm:columns-2 max-sm:gap-5">
            {DRAFT.ranking.map((name, index) => (
              <li className="break-inside-avoid" key={name}>
                {POT_STARTS.has(index) ? (
                  <div className="mt-2 mb-1 border-(--hair) border-t pt-1.5 font-mono text-(--faded) text-3xs uppercase tracking-2xl first:mt-0 first:border-t-0 first:pt-0">
                    {POT_STARTS.get(index)}
                  </div>
                ) : null}
                <div
                  className={`flex items-center gap-2 py-0.5 text-sm ${
                    name === DRAFT.captainView
                      ? 'font-bold text-(--gold-hi)'
                      : ''
                  }`}
                >
                  <span className="w-5 text-right font-mono text-(--faded) text-xs">
                    {index + 1}
                  </span>
                  {name}
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
      <div className="border-(--hair) border-t p-5">
        <TeamsSummary />
      </div>
    </div>
  );
};

const SpectatorView = () => (
  <div className={`${panel} flex flex-col gap-6 p-5 sm:p-6`}>
    <RoundOrder />
    <PotsGrid />
    <TeamsSummary />
  </div>
);

const VIEWS = [
  { id: 'captain', label: 'Vista de capitán' },
  { id: 'spectator', label: 'Vista de espectador' },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

const Draft = () => {
  const [view, setView] = useState<ViewId>('captain');
  return (
    <Section id="draft">
      <SectionHeader
        eyebrowText="Formación de equipos · Elección"
        lead="Dos vistas en directo: el capitán al reloj ve de qué bombos puede elegir aún — un jugador por bombo, en el orden que prefiera — con el ranking definitivo del torneo como guía; el resto sigue los bombos, el orden y cómo van quedando los equipos."
        title="El Draft"
      />
      <div className="flex flex-col items-center gap-2.5">
        <fieldset
          aria-label="Cambiar de vista"
          className="inline-flex gap-0.5 rounded-full border border-(--hair) bg-(--night-2) p-0.75"
        >
          {VIEWS.map(({ id, label }) => (
            <button
              className={`rounded-full px-4 py-1.5 font-bold text-sm transition-colors ${
                view === id
                  ? 'bg-linear-to-b from-(--gold-hi) to-(--gold) text-[#211803]'
                  : 'text-(--faded) hover:text-(--parchment)'
              }`}
              key={id}
              onClick={() => setView(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </fieldset>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-xl">
          {view === 'captain'
            ? `Lo que ve ${DRAFT.captainView} en su turno`
            : 'Lo que ve el resto del grupo'}
        </span>
      </div>
      {view === 'captain' ? <CaptainView /> : <SpectatorView />}
    </Section>
  );
};

export { Draft };
