import type { ReactNode } from 'react';

import { panel, RingGlyph, SHIELD_PATH } from '@/components/theme/primitives';
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

/**
 * One team's side of a partida, crowned by an endgame-style VICTORIA /
 * DERROTA banner (the way the game itself calls it); on mobile the running
 * score rides the winner's banner line. The decisive partida — the one
 * that closes the final — gets the loud treatment: bigger VICTORIA and a
 * solid-gold score. Boxed on sm+; flat inside the mobile partida card.
 */
/** The deciding score, borne on the same escutcheon the players carry. */
const ScoreBlazon = ({ score }: { score: string }) => (
  <svg
    aria-label={score}
    className="w-9 flex-none drop-shadow-[0_0_10px_rgba(201,165,87,0.45)]"
    role="img"
    viewBox="0 0 100 116"
  >
    <path
      d={SHIELD_PATH}
      fill="url(#dsn-blazon-field)"
      stroke="url(#dsn-blazon-rim)"
      strokeWidth="5"
    />
    <text
      fill="var(--gold-hi)"
      fontFamily="var(--font-jetbrains), monospace"
      fontSize="34"
      fontWeight="700"
      textAnchor="middle"
      x="50"
      y="70"
    >
      {score.replace(/\s/g, '')}
    </text>
  </svg>
);

const GameSide = ({
  decisive = false,
  mirrored = false,
  players,
  score,
  winner,
}: {
  /** This partida settled the match. */
  decisive?: boolean;
  mirrored?: boolean;
  players: GameSidePlayer[];
  /** Running score chip, shown on this side's banner (mobile only). */
  score?: string;
  winner: boolean;
}) => (
  <div
    className={`relative rounded-md p-3.5 sm:rounded-lg sm:border sm:p-4 ${
      winner
        ? `sm:border-(--gold) sm:shadow-[0_0_16px_rgba(201,165,87,0.14)] ${
            mirrored
              ? 'bg-linear-to-l from-(--gold)/14 to-transparent'
              : 'bg-linear-to-r from-(--gold)/14 to-transparent'
          }`
        : 'opacity-55 saturate-50 sm:border-(--hair) sm:bg-(--night-2)'
    }`}
  >
    <div className="mb-2.5 flex items-center gap-2.5">
      <span
        aria-hidden
        className={`h-px flex-1 ${winner ? 'bg-(--hair-gold)' : 'bg-(--hair)'}`}
      />
      {winner && decisive ? (
        <span className="hidden sm:block">
          <RingGlyph size={15} />
        </span>
      ) : null}
      <span
        className={`d-display font-black uppercase ${
          winner
            ? decisive
              ? 'd-gold-text text-base tracking-5xl drop-shadow-[0_0_12px_rgba(240,212,138,0.5)] sm:text-lg'
              : 'd-gold-text text-sm tracking-5xl drop-shadow-[0_0_10px_rgba(201,165,87,0.4)]'
            : 'text-(--silver) text-sm tracking-5xl'
        }`}
      >
        {winner ? 'Victoria' : 'Derrota'}
      </span>
      {winner && decisive ? (
        <span className="hidden sm:block">
          <RingGlyph size={15} />
        </span>
      ) : null}
      {score ? (
        decisive ? (
          <span className="sm:hidden">
            <ScoreBlazon score={score} />
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-full border border-(--hair-gold) bg-(--night) px-2.5 py-0.5 font-bold font-mono text-(--gold) text-2xs tabular-nums tracking-xl sm:hidden">
            {score}
          </span>
        )
      ) : null}
      <span
        aria-hidden
        className={`h-px flex-1 ${winner ? 'bg-(--hair-gold)' : 'bg-(--hair)'}`}
      />
    </div>
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
              <span className="font-bold font-mono text-(--gold) text-3xs uppercase tracking-xl">
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

const MatchGames = ({ games }: { games: GameView[] }) => {
  // Running score after each partida — it rides the winner's banner on
  // mobile and the centre column on sm+, telling the story ("0–1, 1–1,
  // 2–1") instead of just numbering the games. The last decided partida
  // is the one that closes the match: its VICTORIA and score go loud.
  let winsA = 0;
  let winsB = 0;
  const rows = games.map((game) => {
    winsA += game.winner === 'A' ? 1 : 0;
    winsB += game.winner === 'B' ? 1 : 0;
    return { game, score: `${winsA} – ${winsB}` };
  });
  return (
    <ol className="flex flex-col gap-7 p-5 sm:gap-4">
      {/* Mobile: each partida is its own card. sm+: the classic
          three-column row (side, score, side) with no extra chrome. */}
      {rows.map(({ game, score }, index) => {
        const decisive =
          index === rows.length - 1 && game.winner !== null && rows.length > 1;
        return (
          <li
            className="relative grid grid-cols-1 items-stretch gap-1.5 rounded-lg border border-(--hair) bg-[#0c120e80] px-2.5 py-2.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
            key={`partida-${String(index)}`}
          >
            <GameSide
              decisive={decisive}
              players={game.sideA}
              score={game.winner === 'A' ? score : undefined}
              winner={game.winner === 'A'}
            />
            <div
              className={`hidden tabular-nums sm:flex sm:w-16 sm:items-center sm:justify-center sm:self-stretch ${
                decisive
                  ? 'd-display d-gold-text font-black text-xl tracking-wide drop-shadow-[0_0_10px_rgba(240,212,138,0.45)]'
                  : 'font-bold font-mono text-(--gold) text-sm'
              }`}
            >
              {score}
            </div>
            <GameSide
              decisive={decisive}
              mirrored
              players={game.sideB}
              score={game.winner === 'B' ? score : undefined}
              winner={game.winner === 'B'}
            />
          </li>
        );
      })}
    </ol>
  );
};

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
  /** Optional: pages with their own section label above skip it. */
  header?: ReactNode;
}) => (
  <div className={`${panel} flex flex-col`}>
    {header ? (
      <div className="border-(--hair) border-b px-5 py-4">{header}</div>
    ) : null}
    {/* Historical matches may have a known winner but no partida record. */}
    {games.length > 0 ? <MatchGames games={games} /> : null}
    {footer ? (
      <p className="border-(--hair) border-t px-5 py-3.5 font-mono text-(--faded) text-2xs uppercase tracking-2xl">
        {footer}
      </p>
    ) : null}
  </div>
);

export { type GameSidePlayer, type GameView, MatchGames, MatchPanel };
