import type { ReactNode } from 'react';

import { panel } from '@/components/theme/primitives';
import { RANK_MOTIFS } from '@/components/tournament/honor-podium';
import { FACTIONS, type FactionId } from '@/lib/tournament/factions';

/**
 * Partida-by-partida breakdown of one match. Each game is a row with both
 * sides: the winning side burns gold with a laurel, the losing side dims
 * out; a partida has no score, so victory speaks visually. Factions are
 * optional per player — historical games where nobody remembers them just
 * list the players.
 */

/** A null name is a player we never recorded (old editions). */
type GameSidePlayer = { name: string | null; faction?: FactionId };

type GameView = {
  sideA: GameSidePlayer[];
  sideB: GameSidePlayer[];
  winner: 'A' | 'B' | null;
};

const FactionEmblem = ({ id, size = 44 }: { id: FactionId; size?: number }) => (
  <svg
    aria-hidden="true"
    className="flex-none"
    height={size}
    viewBox="0 0 512 512"
    width={size}
  >
    <path d={FACTIONS[id].emblem} fill="url(#dsn-blazon-emblem)" />
  </svg>
);

/** Victory laurels (the podium's laurel motif, struck in gold). */
const VictoryLaurel = ({ mirrored }: { mirrored: boolean }) => (
  <svg
    aria-hidden="true"
    className={`absolute -top-2.5 size-7 drop-shadow-[0_0_8px_rgba(201,165,87,0.6)] ${
      mirrored ? '-left-2.5' : '-right-2.5'
    }`}
    viewBox="0 0 512 512"
  >
    <title>Vencedor de la partida</title>
    <path d={RANK_MOTIFS.bronze} fill="url(#dsn-blazon-rim)" />
  </svg>
);

/**
 * One team's side of a partida: every player with the faction THEY fielded
 * (factions belong to players, not teams — see .claude/core-logic.md),
 * when it's known.
 */
const GameSide = ({
  mirrored = false,
  players,
  winner,
}: {
  mirrored?: boolean;
  players: GameSidePlayer[];
  winner: boolean;
}) => (
  <div
    className={`relative rounded-lg border p-4 ${
      winner
        ? `border-(--gold) shadow-[0_0_16px_rgba(201,165,87,0.14)] ${
            mirrored
              ? 'bg-linear-to-l from-[#c9a55724] to-transparent'
              : 'bg-linear-to-r from-[#c9a55724] to-transparent'
          }`
        : 'border-(--hair) bg-(--night-2) opacity-55 saturate-50'
    }`}
  >
    {winner ? <VictoryLaurel mirrored={mirrored} /> : null}
    <ul className="flex flex-col gap-2">
      {players.map((player, index) => (
        <li
          className={`flex items-center justify-between gap-3 ${
            mirrored ? '' : 'sm:flex-row-reverse'
          }`}
          key={player.name ?? `unknown-${index}`}
        >
          <span
            className={`font-bold text-sm ${
              player.name ? '' : 'text-(--faded) italic'
            }`}
          >
            {player.name ?? 'Desconocido'}
          </span>
          {player.faction ? (
            <span
              className={`flex items-center gap-1.5 ${
                mirrored ? '' : 'sm:flex-row-reverse'
              }`}
            >
              <span className="font-bold font-mono text-(--gold) text-[0.58rem] uppercase tracking-[0.15em]">
                {FACTIONS[player.faction].name}
              </span>
              <FactionEmblem id={player.faction} size={20} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  </div>
);

const MatchGames = ({ games }: { games: GameView[] }) => (
  <ol className="flex flex-col gap-8 p-5 sm:gap-4">
    {games.map((game, index) => (
      <li
        className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-4"
        key={`partida-${String(index)}`}
      >
        <GameSide players={game.sideA} winner={game.winner === 'A'} />
        {/* Mobile: header of the pair (rules either side); sm+: center column */}
        <div className="order-first flex items-center justify-center gap-3 font-bold font-mono text-(--faded) text-[0.6rem] uppercase tracking-[0.2em] sm:order-none sm:w-16 sm:flex-col sm:gap-1">
          <span aria-hidden className="h-px flex-1 bg-(--hair) sm:hidden" />
          <span>Partida</span>
          <span className="text-(--gold) text-sm">{index + 1}</span>
          <span aria-hidden className="h-px flex-1 bg-(--hair) sm:hidden" />
        </div>
        <GameSide mirrored players={game.sideB} winner={game.winner === 'B'} />
      </li>
    ))}
  </ol>
);

/**
 * Panel wrapper for a match: a dynamic header slot (each page composes its
 * own — champions banner, stage tag, meeple pips…), the partidas (dropped
 * when none are known) and an optional footer note.
 */
const MatchPanel = ({
  footer,
  games,
  header,
}: {
  footer?: ReactNode;
  games: GameView[];
  header: ReactNode;
}) => (
  <div className={`${panel} flex flex-col`}>
    <div className="border-(--hair) border-b px-5 py-4">{header}</div>
    {/* Historical matches may have a known winner but no partida record. */}
    {games.length > 0 ? <MatchGames games={games} /> : null}
    {footer ? (
      <p className="border-(--hair) border-t px-5 py-3.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]">
        {footer}
      </p>
    ) : null}
  </div>
);

export { type GameSidePlayer, type GameView, MatchGames, MatchPanel };
