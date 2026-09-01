import { TRPCError } from '@trpc/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  PlayerBlazon,
  panel,
  panelGold,
  RingGlyph,
  Section,
  tag,
} from '@/components/theme/primitives';
import { BracketBoard } from '@/components/tournament/bracket-board';
import { RANK_MOTIFS } from '@/components/tournament/honor-podium';
import { type GameView, MatchPanel } from '@/components/tournament/match-games';
import { formatDateRange } from '@/lib/dates';
import { siteFlags } from '@/lib/site-flags';
import { sceneForIndex, sceneStyle } from '@/lib/tournament/edition-scenes';
import { api } from '@/trpc/server';

type EditionDetail = Awaited<ReturnType<typeof api.edition.bySlug>>;
type EditionTeam = NonNullable<
  EditionDetail['teamTournament']
>['teams'][number];
type EditionTournament = NonNullable<EditionDetail['teamTournament']>;
type EditionRound = EditionTournament['rounds'][number];
type EditionFinal = EditionRound['matches'][number];
type EditionPlayer = EditionTeam['players'][number];

/** The final is the only match of the last recorded round. */
const finalOf = (rounds: EditionRound[]): EditionFinal | null =>
  rounds.at(-1)?.matches[0] ?? null;

/**
 * A single recorded round is just a final and reads better as the faceoff
 * panel; from two rounds up it's a real bracket.
 */
const isBracket = (rounds: EditionRound[]) => rounds.length > 1;

const bracketRounds = (rounds: EditionRound[]) =>
  rounds.map((round) => ({
    matches: round.matches.map((bracketMatch) => {
      const wins = (teamId: string | null) =>
        bracketMatch.games.filter((game) => game.winnerTeamId === teamId)
          .length;
      const played = bracketMatch.games.length > 0;
      return {
        id: bracketMatch.id,
        teamAId: bracketMatch.teamAId,
        teamBId: bracketMatch.teamBId,
        winnerTeamId: bracketMatch.winnerTeamId,
        scoreA: played ? wins(bracketMatch.teamAId) : null,
        scoreB: played ? wins(bracketMatch.teamBId) : null,
      };
    }),
  }));

const bracketTeams = (teams: EditionTeam[]) =>
  teams.map((team) => ({
    id: team.id,
    players: team.players.map((player) => player.name),
  }));

/** "Al mejor de 3" when every recorded round shares the same format. */
const bracketFormat = (rounds: EditionRound[]) => {
  const formats = new Set(
    rounds
      .map((round) => round.gamesToWinMatch)
      .filter((games): games is number => games !== null),
  );
  const [only] = [...formats];
  return formats.size === 1 && only ? `Al mejor de ${only * 2 - 1}` : undefined;
};

type PageProps = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  return { title: `Edición ${slug.replace('-', ' · ')} — Frikiparty` };
};

const label =
  'flex items-center gap-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]';

/** Only a captain we can name is useful as a team handle. */
const captainOf = (team: EditionTeam | undefined) =>
  team?.players.find((player) => player.isCaptain && player.name);

/**
 * "Equipo de <capitán>" — teams have no names, their players ARE the team.
 * Without a recorded captain (old editions) we don't invent one.
 */
const teamHandle = (team: EditionTeam | undefined) => {
  const captain = captainOf(team);
  if (captain) {
    return `Equipo de ${captain.name}`;
  }
  return team?.finalPosition === 1 ? 'El equipo campeón' : 'El equipo';
};

/**
 * One member of a team. Members we never recorded keep their seat as an
 * anonymous blazon — the team was that big even if we can't name everyone.
 */
const PlayerRow = ({ player }: { player: EditionPlayer }) => (
  <li className="flex items-center gap-2.5">
    <PlayerBlazon
      name={player.name && player.slug ? player.name : null}
      size="sm"
    />
    {player.name && player.slug ? (
      <Link
        className="font-bold text-sm transition-colors hover:text-(--gold-hi)"
        href={`/players/${player.slug}`}
      >
        {player.name}
      </Link>
    ) : (
      <span
        className="font-bold text-(--faded) text-sm italic"
        title="Jugador no registrado"
      >
        Desconocido
      </span>
    )}
    {player.isCaptain ? (
      <span className="font-bold font-mono text-(--gold) text-[0.55rem] uppercase tracking-[0.2em]">
        Capitán
      </span>
    ) : null}
  </li>
);

const VictoryLaurel = ({ mirrored }: { mirrored: boolean }) => (
  <svg
    aria-hidden="true"
    className={`absolute -top-2.5 size-7 drop-shadow-[0_0_8px_rgba(201,165,87,0.6)] ${
      mirrored ? '-left-2.5' : '-right-2.5'
    }`}
    viewBox="0 0 512 512"
  >
    <path d={RANK_MOTIFS.bronze} fill="url(#dsn-blazon-rim)" />
  </svg>
);

const FinalSide = ({
  mirrored = false,
  team,
  winner,
}: {
  mirrored?: boolean;
  team: EditionTeam | undefined;
  winner: boolean;
}) => (
  <div
    className={`relative flex-1 rounded-lg border p-4 ${
      winner
        ? `border-(--gold) shadow-[0_0_16px_rgba(201,165,87,0.14)] ${
            mirrored
              ? 'bg-linear-to-l from-[#c9a55724] to-transparent'
              : 'bg-linear-to-r from-[#c9a55724] to-transparent'
          }`
        : 'border-(--hair) bg-(--night-2) opacity-60 saturate-50'
    }`}
  >
    {winner ? <VictoryLaurel mirrored={mirrored} /> : null}
    <ul className="flex flex-col gap-2">
      {team?.players.map((player, index) => (
        <PlayerRow key={player.slug ?? `unknown-${index}`} player={player} />
      ))}
    </ul>
  </div>
);

const FinalFaceoff = ({
  final,
  individual = false,
  teams,
}: {
  final: EditionFinal;
  individual?: boolean;
  teams: EditionTeam[];
}) => {
  const teamA = teams.find((team) => team.id === final.teamAId);
  const teamB = teams.find((team) => team.id === final.teamBId);
  const winsA = final.games.filter(
    (game) => game.winnerTeamId === final.teamAId,
  ).length;
  const winsB = final.games.filter(
    (game) => game.winnerTeamId === final.teamBId,
  ).length;
  const sideName = (teamId: string | null) => {
    const team = teams.find((candidate) => candidate.id === teamId);
    if (!team) return '—';
    if (individual) {
      return `de ${team.players[0]?.name ?? '—'}`;
    }
    const captain = captainOf(team);
    return captain ? `del equipo de ${captain.name}` : 'del equipo rival';
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
        <FinalSide
          mirrored
          team={teamA}
          winner={final.winnerTeamId === final.teamAId}
        />
        <div className="d-display d-gold-text text-center font-black text-4xl tracking-wide">
          {final.games.length > 0 ? (
            `${winsA} – ${winsB}`
          ) : (
            <span className="font-mono text-(--faded) text-xs uppercase tracking-[0.2em]">
              vs
            </span>
          )}
        </div>
        <FinalSide team={teamB} winner={final.winnerTeamId === final.teamBId} />
      </div>
      {final.games.length > 1 ? (
        <ul className="flex flex-col items-center gap-1.5">
          {final.games.map((game) => (
            <li
              className="font-mono text-(--faded) text-[0.65rem] uppercase tracking-[0.18em]"
              key={game.gameNumber}
            >
              Partida {game.gameNumber} · victoria {sideName(game.winnerTeamId)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** The team final rendered partida a partida with the shared MatchGames. */
const TeamFinalPanel = ({
  final,
  teams,
}: {
  final: EditionFinal;
  teams: EditionTeam[];
}) => {
  const teamA = teams.find((team) => team.id === final.teamAId);
  const teamB = teams.find((team) => team.id === final.teamBId);
  const winsA = final.games.filter(
    (game) => game.winnerTeamId === final.teamAId,
  ).length;
  const winsB = final.games.filter(
    (game) => game.winnerTeamId === final.teamBId,
  ).length;
  const games: GameView[] = final.games.map((game) => ({
    sideA: (teamA?.players ?? []).map((player) => ({ name: player.name })),
    sideB: (teamB?.players ?? []).map((player) => ({ name: player.name })),
    winner:
      game.winnerTeamId === final.teamAId
        ? 'A'
        : game.winnerTeamId === final.teamBId
          ? 'B'
          : null,
  }));
  const winnerIsA = final.winnerTeamId === final.teamAId;
  const winner = winnerIsA ? teamA : teamB;
  const loser = winnerIsA ? teamB : teamA;
  const winnerWins = winnerIsA ? winsA : winsB;
  const loserWins = winnerIsA ? winsB : winsA;
  return (
    <MatchPanel
      games={games}
      header={
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:gap-x-6 sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <svg
              aria-hidden="true"
              className="size-11 flex-none drop-shadow-[0_0_10px_rgba(201,165,87,0.5)]"
              viewBox="0 0 512 512"
            >
              <path d={RANK_MOTIFS.bronze} fill="url(#dsn-blazon-rim)" />
            </svg>
            <div className="flex flex-col items-center gap-0.5 sm:items-start">
              <span className="font-bold font-mono text-(--gold) text-[0.6rem] uppercase tracking-[0.22em]">
                Campeones de la edición
              </span>
              <span className="d-display d-gold-text font-black text-2xl tracking-wide sm:text-3xl">
                {teamHandle(winner)}
              </span>
              <span className="text-(--faded) text-sm">
                venció en la final al{' '}
                {captainOf(loser)
                  ? `equipo de ${captainOf(loser)?.name}`
                  : 'equipo rival'}
              </span>
            </div>
          </div>
          {/* The score is the count of partidas won: with no partida record
              (older editions) there's nothing to show. */}
          {final.games.length > 0 ? (
            <div className="d-display d-gold-text font-black text-5xl tracking-wide">
              {winnerWins} – {loserWins}
            </div>
          ) : null}
        </div>
      }
    />
  );
};

/**
 * Individual placements when there's no match record: for most editions we
 * remember who won the individual tournament and little else.
 */
const SoloHonour = ({
  champion = false,
  player,
  title,
}: {
  champion?: boolean;
  player: EditionPlayer | undefined;
  title: string;
}) => (
  <div className="flex flex-col items-center gap-2">
    <span className="flex items-center gap-1.5 font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em]">
      <RingGlyph size={11} tone={champion ? 'solitaire' : 'gold'} /> {title}
    </span>
    <PlayerBlazon
      champion={champion}
      name={player?.name && player.slug ? player.name : null}
      size="lg"
    />
    {player?.name && player.slug ? (
      <Link
        className={`font-bold text-sm transition-colors hover:text-(--gold) ${
          champion ? 'text-(--gold-hi)' : ''
        }`}
        href={`/players/${player.slug}`}
      >
        {player.name}
      </Link>
    ) : (
      <span className="font-bold text-(--faded) text-sm italic">
        Desconocido
      </span>
    )}
  </div>
);

const SoloHonours = ({
  championTeam,
  runnerUpTeam,
}: {
  championTeam: EditionTeam | undefined;
  runnerUpTeam: EditionTeam | undefined;
}) => (
  <div
    className={`${panelGold} mx-auto flex w-full max-w-md flex-wrap items-start justify-center gap-10 p-5`}
  >
    <SoloHonour champion player={championTeam?.players[0]} title="Campeón" />
    {runnerUpTeam ? (
      <SoloHonour player={runnerUpTeam.players[0]} title="Finalista" />
    ) : null}
  </div>
);

const TeamPanel = ({ team }: { team: EditionTeam }) => {
  const champions = team.finalPosition === 1;
  const finalists = team.finalPosition === 2;
  return (
    <div className={`${champions ? panelGold : panel} flex flex-col gap-3 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.22em]">
          {teamHandle(team)}
        </span>
        {champions ? <span className={tag}>Campeones</span> : null}
        {finalists ? <span className={tag}>Finalistas</span> : null}
      </div>
      <ul className="flex flex-col gap-2.5">
        {team.players.map((player, index) => (
          <PlayerRow key={player.slug ?? `unknown-${index}`} player={player} />
        ))}
      </ul>
    </div>
  );
};

const POT_NAMES = [
  'Bombo 1 · Cabezas de serie',
  'Bombo 2',
  'Bombo 3',
  'Bombo 4',
  'Bombo 5',
];

const EditionPage = async ({ params }: PageProps) => {
  if (!siteFlags.editionsPage) {
    notFound();
  }
  const { slug } = await params;
  const edition = await api.edition.bySlug({ slug }).catch((error) => {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      notFound();
    }
    throw error;
  });

  const teamTournament = edition.teamTournament;
  const individualTournament = edition.individualTournament;
  const hasRoster = (teamTournament?.teams.length ?? 0) > 1;
  const teamRounds = teamTournament?.rounds ?? [];
  const teamFinal = finalOf(teamRounds);
  const individualRounds = individualTournament?.rounds ?? [];
  const individualFinal = finalOf(individualRounds);
  const individualChampionTeam = individualTournament?.teams.find(
    (team) => team.finalPosition === 1,
  );
  const individualRunnerUpTeam = individualTournament?.teams.find(
    (team) => team.finalPosition === 2,
  );

  return (
    <SiteShell>
      <main>
        <Section id="edition">
          <div
            className={`${panel} flex flex-col gap-3 p-6 sm:p-8`}
            style={sceneStyle(sceneForIndex(edition.sceneIndex))}
          >
            <Link
              className="font-mono text-(--faded) text-[0.62rem] uppercase tracking-[0.18em] transition-colors hover:text-(--gold)"
              href="/editions"
            >
              ← Todas las ediciones
            </Link>
            <h1 className="d-display d-gold-text font-black text-5xl tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-6xl">
              {edition.label}
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {edition.venueName && edition.venueSlug ? (
                <Link
                  className="font-bold font-mono text-(--parchment) text-[0.68rem] uppercase tracking-[0.22em] transition-colors hover:text-(--gold-hi)"
                  href={`/venues/${edition.venueSlug}`}
                >
                  {edition.venueName}
                </Link>
              ) : null}
              {edition.startsAt && edition.endsAt ? (
                <span className="font-bold font-mono text-(--faded) text-[0.68rem] uppercase tracking-[0.22em]">
                  {formatDateRange(edition.startsAt, edition.endsAt)}
                </span>
              ) : null}
            </div>
          </div>

          {teamTournament && hasRoster && teamFinal ? (
            <div className="flex flex-col gap-5">
              <span className={label}>
                <RingGlyph size={13} />{' '}
                {isBracket(teamRounds)
                  ? 'Las eliminatorias'
                  : 'La final por equipos'}
              </span>
              {isBracket(teamRounds) ? (
                <BracketBoard
                  rounds={bracketRounds(teamRounds)}
                  tagText={bracketFormat(teamRounds)}
                  teams={bracketTeams(teamTournament.teams)}
                />
              ) : (
                <TeamFinalPanel
                  final={teamFinal}
                  teams={teamTournament.teams}
                />
              )}
            </div>
          ) : null}

          {hasRoster && teamTournament ? (
            <div className="flex flex-col gap-5">
              <span className={label}>
                <RingGlyph size={13} /> Los equipos
              </span>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {teamTournament.teams.map((team) => (
                  <TeamPanel key={team.id} team={team} />
                ))}
              </div>
            </div>
          ) : null}

          {edition.pots.length > 0 ? (
            <div className="flex flex-col gap-5">
              <span className={label}>
                <RingGlyph size={13} /> Los bombos del sorteo
              </span>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {edition.pots.map((pot) => (
                  <div
                    className={`${panel} flex flex-col gap-3 p-5`}
                    key={pot.potIndex}
                  >
                    <span className="font-bold font-mono text-(--gold) text-[0.62rem] uppercase tracking-[0.22em]">
                      {POT_NAMES[pot.potIndex] ?? `Bombo ${pot.potIndex + 1}`}
                    </span>
                    <ul className="flex flex-col gap-2">
                      {pot.players.map((player) => (
                        <li
                          className="flex items-center gap-2.5"
                          key={player.slug}
                        >
                          <PlayerBlazon name={player.name} size="sm" />
                          <Link
                            className="font-bold text-sm transition-colors hover:text-(--gold-hi)"
                            href={`/players/${player.slug}`}
                          >
                            {player.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!hasRoster && teamTournament?.teams[0] ? (
            <div className="mx-auto w-full max-w-md">
              <TeamPanel team={teamTournament.teams[0]} />
            </div>
          ) : null}

          {individualTournament && individualChampionTeam ? (
            <div className="flex flex-col gap-5">
              <span className={label}>
                <RingGlyph size={11} tone="solitaire" />{' '}
                {isBracket(individualRounds)
                  ? 'Las eliminatorias individuales'
                  : individualFinal
                    ? 'La final individual'
                    : 'El torneo individual'}
              </span>
              {isBracket(individualRounds) ? (
                <BracketBoard
                  rounds={bracketRounds(individualRounds)}
                  tagText={bracketFormat(individualRounds)}
                  teams={bracketTeams(individualTournament.teams)}
                />
              ) : individualFinal ? (
                <div className="mx-auto w-full max-w-xl">
                  <FinalFaceoff
                    final={individualFinal}
                    individual
                    teams={individualTournament.teams}
                  />
                </div>
              ) : (
                <SoloHonours
                  championTeam={individualChampionTeam}
                  runnerUpTeam={individualRunnerUpTeam}
                />
              )}
            </div>
          ) : null}

          {!hasRoster ? (
            <p className="mx-auto max-w-[52ch] text-center text-(--faded) text-sm italic">
              De esta edición solo los campeones quedaron escritos en los
              anales. El resto se perdió en la Cuenta Larga.
            </p>
          ) : null}
        </Section>
      </main>
    </SiteShell>
  );
};

export default EditionPage;
