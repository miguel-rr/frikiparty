'use client';

import Link from 'next/link';

import {
  FactionChip,
  type FactionRef,
} from '@/components/live/match/faction-chip';
import { btn, RingGlyph } from '@/components/theme/primitives';
import { PortraitCard } from '@/components/tournament/portrait-card';
import { gamesToWinFor } from '@/lib/live/games-to-win';
import { matchScore } from '@/lib/live/match-score';
import { teamLabel } from '@/lib/live/team-label';
import { cardSpecFor } from '@/lib/tournament/card-lore';
import type { LiveMatch, LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';

type Kind = 'semi' | 'final';

/** Semifinal or final of a bracket, by round; null for anything else. */
const epicKind = (phase: LivePhase, m: LiveMatch): Kind | null => {
  if (phase.type !== 'bracket' || m.isThirdPlace || m.roundIndex === null)
    return null;
  const last = Math.max(...phase.matches.map((x) => x.roundIndex ?? 0));
  if (m.roundIndex === last) return 'final';
  if (m.roundIndex === last - 1 && last >= 1) return 'semi';
  return null;
};

/** A torch: lit for a game won, cold for one still to win. */
const Torch = ({ lit, delay }: { lit: boolean; delay: number }) => (
  <svg
    aria-hidden="true"
    className="h-10 w-5 shrink-0 sm:h-12 sm:w-6"
    viewBox="0 0 24 48"
  >
    <title>{lit ? 'Partida ganada' : 'Partida por ganar'}</title>
    <path d="M9 22h6l-1.5 24h-3z" fill={lit ? '#a8843c' : '#2a3128'} />
    <path d="M7 20h10l-2 5H9z" fill={lit ? '#c9a557' : '#3a4236'} />
    {lit ? (
      <g
        className="d-flicker"
        style={{ animationDelay: `${delay}ms`, transformOrigin: '12px 20px' }}
      >
        <path
          d="M12 2c3 5 7 8 6 13a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 0-3-1-6 0-9z"
          fill="#f0a84a"
        />
        <path
          d="M12 8c2 3 4 5 3.5 8a3.5 3.5 0 0 1-7 0c0-2 1.5-3 2-5 .5 1 1 1.5 1.5 1.5 0-1.5-.5-3 0-4.5z"
          fill="#ffe08a"
        />
      </g>
    ) : (
      <path
        d="M12 12c2 3 4 5 3 8a3 3 0 0 1-6 0c0-2 1-3 2-5 .5 1 1 1.5 1 1.5 0-1.5 0-3 0-4.5z"
        fill="#3a4236"
      />
    )}
  </svg>
);

/** Golden confetti for the coronation, deterministic so the server and the client agree. */
const Confetti = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden"
  >
    {Array.from({ length: 36 }, (_, i) => {
      const left = (i * 37) % 100;
      const delay = (i * 173) % 2400;
      const duration = 3200 + ((i * 97) % 1800);
      const size = 5 + (i % 4) * 2;
      return (
        <span
          className="absolute top-[-4%] block rounded-sm"
          // biome-ignore lint/suspicious/noArrayIndexKey: the pieces are positional and never reorder.
          key={i}
          style={{
            left: `${left}%`,
            width: size,
            height: size * 1.6,
            background:
              i % 3 === 0 ? '#f0d48a' : i % 3 === 1 ? '#c9a557' : '#fff4d0',
            animation: `epic-confetti ${duration}ms linear ${delay}ms infinite`,
            opacity: 0,
          }}
        />
      );
    })}
  </div>
);

const Army = ({
  state,
  team,
  factionsByPlayer,
  factions,
  mirrored,
  winner,
}: {
  state: LiveState;
  team: LiveState['teams'][number] | undefined;
  factionsByPlayer: Map<string, string>;
  factions: FactionRef[];
  mirrored: boolean;
  winner: boolean | null;
}) => {
  const byId = new Map(state.participants.map((p) => [p.id, p]));
  const leaderId = state.ranking?.[0];
  const members = team
    ? [...team.members].sort(
        (a, b) =>
          Number(b.isCaptain) - Number(a.isCaptain) ||
          (a.seat ?? 99) - (b.seat ?? 99),
      )
    : [];
  return (
    <div
      className={`flex flex-col gap-4 ${mirrored ? 'items-center lg:items-end' : 'items-center lg:items-start'}`}
    >
      <span
        className={`d-display text-center font-black text-2xl uppercase tracking-wide sm:text-3xl ${
          winner === true
            ? 'd-gold-text'
            : winner === false
              ? 'text-(--faded)'
              : 'text-(--parchment)'
        } ${mirrored ? 'lg:text-right' : 'lg:text-left'}`}
      >
        {teamLabel(team)}
      </span>
      <ul
        className={`flex flex-wrap justify-center gap-3 ${mirrored ? 'lg:justify-end' : 'lg:justify-start'}`}
      >
        {members.map((member, index) => {
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
          const faction = factions.find(
            (f) => f.id === factionsByPlayer.get(member.playerId),
          );
          return (
            <li
              className={`flex w-24 flex-col items-center gap-1.5 sm:w-28 ${winner === false ? 'opacity-60 saturate-50' : ''}`}
              key={member.playerId}
              style={{
                animation: 'epic-march 600ms cubic-bezier(.2,.8,.2,1) both',
                animationDelay: `${index * 140 + (mirrored ? 300 : 0)}ms`,
              }}
            >
              <Link className="w-full" href={`/players/${member.slug}`}>
                <PortraitCard card={card} className="w-full" />
              </Link>
              {faction ? <FactionChip faction={faction} size="sm" /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/**
 * The semifinals and the final, staged (plan F7): "los ejércitos se
 * reúnen" for the semis and "la Batalla por el Anillo" for the final.
 * Both armies in formation with their portraits and factions, torches
 * lit per game won, the ring between the finalists leaning towards
 * whoever leads; and the coronation with confetti once the final ends.
 */
const EpicFaceOff = ({
  state,
  phase,
  match: m,
  kind,
  href,
}: {
  state: LiveState;
  phase: LivePhase;
  match: LiveMatch;
  kind: Kind;
  /** Where the sheet lives, when the face-off is shown elsewhere (the Council). */
  href?: string;
}) => {
  const teamA = state.teams.find((t) => t.id === m.teamAId);
  const teamB = state.teams.find((t) => t.id === m.teamBId);
  const score = matchScore(m);
  const toWin = gamesToWinFor(phase, m);
  const done = m.status === 'completed';
  const winnerId = m.winnerTeamId;
  // Factions of the latest game with a line-up (the one being played, or the last).
  const latest = [...m.games].reverse().find((g) => g.lineup.length > 0);
  const factionsByPlayer = new Map(
    (latest?.lineup ?? []).map((l) => [l.playerId, l.factionId]),
  );
  const lean = score.a === score.b ? 0 : score.a > score.b ? -1 : 1;
  const intensity = Math.min(1, Math.abs(score.a - score.b) / toWin);
  const champion = done ? (winnerId === teamA?.id ? teamA : teamB) : null;
  const runnerUp = done ? (winnerId === teamA?.id ? teamB : teamA) : null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-(--hair-gold) bg-[radial-gradient(ellipse_at_center,#1a2118_0%,#0b100d_70%)] p-5 shadow-[0_0_60px_rgba(201,165,87,0.12)] sm:p-8"
      style={{ animation: 'epic-fade 800ms ease-out both' }}
    >
      <style>{`
        @keyframes epic-march { 0% { opacity: 0; transform: translateY(24px) scale(.94); } 100% { opacity: 1; transform: none; } }
        @keyframes epic-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes epic-confetti { 0% { transform: translateY(0) rotate(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes epic-pulse { 0%,100% { filter: drop-shadow(0 0 14px rgba(201,165,87,.35)); } 50% { filter: drop-shadow(0 0 34px rgba(240,212,138,.8)); } }
      `}</style>
      {done && kind === 'final' ? <Confetti /> : null}

      <div className="relative flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-(--gold) text-2xs uppercase tracking-5xl">
          {kind === 'final' ? 'La final' : 'Semifinal'}
        </span>
        <h2 className="d-display d-gold-text font-black text-2xl uppercase tracking-wide sm:text-4xl">
          {kind === 'final'
            ? 'La Batalla por el Anillo'
            : 'Los ejércitos se reúnen'}
        </h2>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {toWin === 1 ? 'Partida única' : `Primero a ${toWin}`}
        </span>
        {href ? (
          <Link className={`${btn.outline} mt-1`} href={href}>
            Ver el partido
          </Link>
        ) : null}
      </div>

      <div className="relative mt-8 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
        <Army
          factions={state.factions}
          factionsByPlayer={factionsByPlayer}
          mirrored={false}
          state={state}
          team={teamA}
          winner={done ? winnerId === teamA?.id : null}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-end gap-1.5">
            {Array.from({ length: toWin }, (_, i) => (
              <Torch delay={i * 300} key={`a-${String(i)}`} lit={i < score.a} />
            ))}
          </div>
          {kind === 'final' ? (
            <div
              className="transition-transform duration-700"
              style={{
                transform: `translateX(${lean * intensity * 28}px)`,
                animation: done
                  ? 'epic-pulse 2.4s ease-in-out infinite'
                  : undefined,
              }}
            >
              <div
                className="inline-block"
                style={{ animation: 'd-spin 60s linear infinite' }}
              >
                <RingGlyph size={96} tone="solitaire" />
              </div>
            </div>
          ) : null}
          <span className="d-display font-black text-(--gold-hi) text-6xl tabular-nums sm:text-7xl">
            {score.a}–{score.b}
          </span>
          <div className="flex items-end gap-1.5">
            {Array.from({ length: toWin }, (_, i) => (
              <Torch
                delay={i * 300 + 150}
                key={`b-${String(i)}`}
                lit={i < score.b}
              />
            ))}
          </div>
        </div>

        <Army
          factions={state.factions}
          factionsByPlayer={factionsByPlayer}
          mirrored
          state={state}
          team={teamB}
          winner={done ? winnerId === teamB?.id : null}
        />
      </div>

      {done && kind === 'final' && champion ? (
        <div className="relative mt-10 flex flex-col items-center gap-6">
          <div className="flex items-end gap-3">
            <div className="flex w-32 flex-col items-center gap-2 sm:w-40">
              <span className="text-center font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                Subcampeones
              </span>
              <span className="d-display text-center font-bold text-(--parchment) text-sm uppercase">
                {teamLabel(runnerUp)}
              </span>
              <div className="h-10 w-full rounded-t-md border border-(--hair-gold) bg-(--night-2)" />
            </div>
            <div className="flex w-40 flex-col items-center gap-2 sm:w-52">
              <span className="flex items-center gap-2 font-mono text-(--gold) text-2xs uppercase tracking-2xl">
                <RingGlyph size={12} tone="solitaire" /> Campeones de la edición{' '}
                {state.editionYear}
              </span>
              <span className="d-display d-gold-text text-center font-black text-xl uppercase sm:text-2xl">
                {teamLabel(champion)}
              </span>
              <div className="h-20 w-full rounded-t-md border border-(--gold) bg-linear-to-b from-(--gold)/30 to-(--night-2) shadow-[0_0_30px_rgba(201,165,87,0.35)]" />
            </div>
          </div>
          <p className="max-w-[48ch] text-center text-(--parchment)/85 text-sm">
            El Anillo ya tiene dueño. Los nombres quedan grabados en la edición{' '}
            {state.editionYear} y los anillos suben al ranking.
          </p>
        </div>
      ) : null}
    </section>
  );
};

export { EpicFaceOff, epicKind };
