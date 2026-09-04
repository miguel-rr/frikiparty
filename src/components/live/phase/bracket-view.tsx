'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import { btn } from '@/components/theme/primitives';
import { matchScore } from '@/lib/live/match-score';
import { teamLabel } from '@/lib/live/team-label';
import type { LivePhase } from '@/server/live/phases';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

/**
 * The bracket. Desktop: the whole tree, rounds as columns with sticky
 * headers, connectors drawn between feeders and the matches they feed,
 * scrolling sideways inside its own frame. Phone: one round per screen,
 * swiped (snap), no connectors — the classic scroll problem solved by not
 * fighting it. "Mi partido" jumps to the viewer's team.
 */
const BracketView = ({
  state,
  phase,
  compact,
}: {
  state: LiveState;
  phase: LivePhase;
  compact?: boolean;
}) => {
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  const rounds = [...new Set(phase.matches.map((m) => m.roundIndex ?? 0))].sort(
    (a, b) => a - b,
  );
  const last = Math.max(...rounds);
  const { user } = useSessionUser();
  const mine = api.player.mine.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
  const myTeamId = mine.data
    ? state.teams.find((t) =>
        t.members.some((m) => m.playerId === mine.data?.id),
      )?.id
    : undefined;
  const frame = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<
    { x1: number; y1: number; x2: number; y2: number; done: boolean }[]
  >([]);

  // Connectors: from each feeder's right edge to its target's left edge,
  // measured after layout and again on resize/scroll of the frame.
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const next: typeof lines = [];
      for (const m of phase.matches) {
        const target = cardRefs.current.get(m.id);
        if (!target) continue;
        for (const feederId of [m.feederMatchAId, m.feederMatchBId]) {
          if (!feederId) continue;
          const source = cardRefs.current.get(feederId);
          if (!source) continue;
          const a = source.getBoundingClientRect();
          const b = target.getBoundingClientRect();
          next.push({
            x1: a.right - base.left + el.scrollLeft,
            y1: a.top + a.height / 2 - base.top + el.scrollTop,
            x2: b.left - base.left + el.scrollLeft,
            y2: b.top + b.height / 2 - base.top + el.scrollTop,
            done:
              phase.matches.find((x) => x.id === feederId)?.status ===
              'completed',
          });
        }
      }
      setLines(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [phase.matches]);

  const jumpToMine = () => {
    const target =
      phase.matches.find(
        (m) =>
          (m.teamAId === myTeamId || m.teamBId === myTeamId) &&
          m.status !== 'completed',
      ) ??
      [...phase.matches]
        .reverse()
        .find((m) => m.teamAId === myTeamId || m.teamBId === myTeamId);
    const el = target ? cardRefs.current.get(target.id) : undefined;
    el?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  };

  // The phone list renders the same matches: only the tree registers refs.
  const renderCard = (m: LivePhase['matches'][number], register = true) => {
    const a = teamById.get(m.teamAId ?? '');
    const b = teamById.get(m.teamBId ?? '');
    const score = matchScore(m);
    const isMine =
      myTeamId !== undefined &&
      (m.teamAId === myTeamId || m.teamBId === myTeamId);
    return (
      <Link
        className={`block w-56 rounded-xl border bg-(--panel-2) p-2 transition-colors hover:border-(--hair-gold) ${
          m.status === 'in_progress'
            ? 'border-(--gold) shadow-[0_0_22px_rgba(240,212,138,0.35)]'
            : isMine
              ? 'border-(--gold)/50'
              : 'border-(--hair)'
        }`}
        href={`/matches/${m.id}`}
        key={m.id}
        ref={(node) => {
          if (!register) return;
          if (node) cardRefs.current.set(m.id, node);
          else cardRefs.current.delete(m.id);
        }}
      >
        {m.isThirdPlace ? (
          <span className="mb-1 block font-mono text-(--faded) text-3xs uppercase tracking-wider">
            3er puesto
          </span>
        ) : null}
        <TeamRow
          known={Boolean(a)}
          label={a ? teamLabel(a) : placeholder(m.feederMatchAId, phase)}
          score={score.a}
          winner={m.winnerTeamId !== null && m.winnerTeamId === m.teamAId}
        />
        <TeamRow
          known={Boolean(b)}
          label={b ? teamLabel(b) : placeholder(m.feederMatchBId, phase)}
          score={score.b}
          winner={m.winnerTeamId !== null && m.winnerTeamId === m.teamBId}
        />
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {myTeamId && !compact ? (
        <button
          className={`${btn.outline} self-end`}
          onClick={jumpToMine}
          type="button"
        >
          Mi partido
        </button>
      ) : null}
      {/* Desktop tree */}
      <div
        className="relative hidden overflow-x-auto rounded-xl border border-(--hair) bg-(--panel)/40 md:block"
        ref={frame}
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 h-full w-full"
          style={{ minWidth: '100%' }}
        >
          <title>Cruces del cuadro</title>
          {lines.map((l, i) => (
            <path
              d={`M${l.x1},${l.y1} C${(l.x1 + l.x2) / 2},${l.y1} ${(l.x1 + l.x2) / 2},${l.y2} ${l.x2},${l.y2}`}
              fill="none"
              // biome-ignore lint/suspicious/noArrayIndexKey: connectors are positional.
              key={i}
              stroke={l.done ? 'var(--gold)' : 'var(--hair-gold)'}
              strokeOpacity={l.done ? 0.9 : 0.5}
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="flex min-w-max gap-10 p-6">
          {rounds.map((round) => {
            const roundMatches = phase.matches.filter(
              (m) => m.roundIndex === round,
            );
            return (
              <div className="flex flex-col" key={round}>
                <span className="sticky top-0 mb-4 font-mono text-(--gold) text-2xs uppercase tracking-2xl">
                  {bracketRoundName(round, last)}
                </span>
                <div className="flex flex-1 flex-col justify-around gap-6">
                  {roundMatches.map((m) => renderCard(m))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Phone: one round per screen */}
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:hidden">
        {rounds.map((round) => (
          <div
            className="flex w-[86vw] shrink-0 snap-center flex-col gap-3"
            key={round}
          >
            <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
              {bracketRoundName(round, last)}
            </span>
            {phase.matches
              .filter((m) => m.roundIndex === round)
              .map((m) => renderCard(m, false))}
          </div>
        ))}
      </div>
      <span className="font-mono text-(--faded) text-3xs uppercase tracking-wider md:hidden">
        Desliza para ver cada ronda
      </span>
    </div>
  );
};

const TeamRow = ({
  label,
  score,
  winner,
  known,
}: {
  label: string;
  score: number;
  winner: boolean;
  known: boolean;
}) => (
  <span
    className={`flex items-center justify-between gap-2 px-1.5 py-1 ${winner ? 'text-(--gold-hi)' : known ? 'text-(--parchment)' : 'text-(--faded) italic'}`}
  >
    <span className="truncate text-sm">{label}</span>
    <span className="font-bold font-mono tabular-nums">
      {known ? score : ''}
    </span>
  </span>
);

const placeholder = (feederId: string | null, phase: LivePhase) => {
  if (!feederId) return 'Por decidir';
  const feeder = phase.matches.find((m) => m.id === feederId);
  if (!feeder) return 'Por decidir';
  return `Ganador ${bracketRoundName(feeder.roundIndex ?? 0, Math.max(...phase.matches.map((m) => m.roundIndex ?? 0))).toLowerCase()} ${feeder.order ?? ''}`.trim();
};

const bracketRoundName = (round: number, last: number) =>
  round === 0
    ? 'Play-in'
    : round === last
      ? 'Final'
      : round === last - 1
        ? 'Semifinales'
        : round === last - 2
          ? 'Cuartos'
          : `Ronda ${round}`;

export { BracketView, bracketRoundName };
