'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSessionUser } from '@/components/layout/auth-slot';
import {
  btn,
  input,
  label,
  PlayerBlazon,
  panelGold,
} from '@/components/theme/primitives';
import type {
  ConfirmedPlayer,
  getEditionDetail,
} from '@/server/api/routers/edition';
import { api } from '@/trpc/react';

type EditionDetail = NonNullable<Awaited<ReturnType<typeof getEditionDetail>>>;

type PlayerOption = { id: string; name: string };

/** A team as edited: seats in order (null = unknown member), captain, placement. */
type TeamDraft = {
  id: string | null;
  playerIds: (string | null)[];
  captainPlayerId: string | null;
  finalPosition: 1 | 2 | null;
};

const POT_NAMES = [
  'Bombo 1 · Cabezas de serie',
  'Bombo 2',
  'Bombo 3',
  'Bombo 4',
  'Bombo 5',
  'Bombo 6',
];

const sectionTitle =
  'font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl';

const quiet =
  'cursor-pointer rounded-full border border-(--hair) px-3 py-1 font-mono text-(--faded) text-2xs uppercase tracking-2xl transition-colors hover:border-(--hair-gold) hover:text-(--gold-hi) disabled:cursor-not-allowed disabled:opacity-40';

const select = `${input} appearance-none`;

/** One player from the catalogue, by id, for chips and captains. */
const nameOf = (players: PlayerOption[], id: string | null) =>
  id === null ? 'Desconocido' : (players.find((p) => p.id === id)?.name ?? '…');

/**
 * Admin-only editor of an edition's record, unfolded by a quiet Editar
 * button (the page itself stays static; the mutations re-check the
 * role). Sections: the edition's data; attendance while it hasn't been
 * played; the pots and the teams of the team tournament, with captains
 * and final placements; and the individual championship. Each section
 * saves on its own and the page refreshes behind it.
 */
const EditionEditor = ({ edition }: { edition: EditionDetail }) => {
  const { user } = useSessionUser();
  const [editing, setEditing] = useState(false);
  const players = api.player.list.useQuery(undefined, { enabled: editing });

  if (user?.role !== 'admin') {
    return null;
  }
  if (!editing) {
    return (
      <div className="flex justify-end">
        <button
          className={`${btn.secondary} px-4 py-1.5 text-sm`}
          onClick={() => setEditing(true)}
          type="button"
        >
          Editar
        </button>
      </div>
    );
  }
  const catalogue = players.data ?? [];
  return (
    <div className={`${panelGold} flex flex-col gap-8 p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <span className={sectionTitle}>Edición {edition.label} · edición</span>
        <button
          className={`${btn.ghost} px-4 py-1.5 text-sm`}
          onClick={() => setEditing(false)}
          type="button"
        >
          Cerrar
        </button>
      </div>
      <BasicsSection edition={edition} />
      {!edition.teamTournament ? (
        <AttendanceSection
          confirmedPlayers={edition.confirmedPlayers}
          editionId={edition.id}
          players={catalogue}
        />
      ) : null}
      <TeamTournamentSection edition={edition} players={catalogue} />
      <IndividualSection edition={edition} players={catalogue} />
    </div>
  );
};

/** Year, number in the year, venue and dates. Renumbering moves the page. */
const BasicsSection = ({ edition }: { edition: EditionDetail }) => {
  const router = useRouter();
  const [year, setYear] = useState(String(edition.year));
  const [order, setOrder] = useState(String(edition.order));
  const [venueId, setVenueId] = useState(edition.venueId ?? '');
  const [startsAt, setStartsAt] = useState(edition.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(edition.endsAt ?? '');
  const venues = api.venue.list.useQuery();
  const update = api.edition.update.useMutation({
    onSuccess: ({ slug }) => {
      const current =
        edition.order > 1
          ? `${edition.year}-${edition.order}`
          : String(edition.year);
      if (slug !== current) {
        router.replace(`/editions/${slug}`);
        return;
      }
      router.refresh();
    },
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({
          id: edition.id,
          year: Number(year),
          order: Number(order),
          venueId: venueId || null,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        });
      }}
    >
      <span className={sectionTitle}>Datos</span>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className={label} htmlFor="edition-year">
            Año
          </label>
          <input
            className={input}
            id="edition-year"
            max={2100}
            min={2000}
            onChange={(event) => setYear(event.target.value)}
            required
            type="number"
            value={year}
          />
        </div>
        <div>
          <label className={label} htmlFor="edition-order">
            Número en el año
          </label>
          <input
            className={input}
            id="edition-order"
            max={5}
            min={1}
            onChange={(event) => setOrder(event.target.value)}
            required
            type="number"
            value={order}
          />
        </div>
        <div>
          <label className={label} htmlFor="edition-starts">
            Empieza
          </label>
          <input
            className={input}
            id="edition-starts"
            onChange={(event) => setStartsAt(event.target.value)}
            type="date"
            value={startsAt}
          />
        </div>
        <div>
          <label className={label} htmlFor="edition-ends">
            Termina
          </label>
          <input
            className={input}
            id="edition-ends"
            onChange={(event) => setEndsAt(event.target.value)}
            type="date"
            value={endsAt}
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="edition-venue">
          Sede
        </label>
        <select
          className={select}
          id="edition-venue"
          onChange={(event) => setVenueId(event.target.value)}
          value={venueId}
        >
          <option value="">Sin sede</option>
          {venues.data?.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>
      {update.error ? (
        <p className="text-(--ember) text-sm" role="alert">
          {update.error.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          className={`${btn.primary} px-5 py-1.5 text-sm`}
          disabled={update.isPending}
          type="submit"
        >
          {update.isPending ? 'Guardando…' : 'Guardar datos'}
        </button>
      </div>
    </form>
  );
};

/** Who has confirmed, live from its query; the list on /council follows. */
const AttendanceSection = ({
  confirmedPlayers: initial,
  editionId,
  players,
}: {
  confirmedPlayers: ConfirmedPlayer[];
  editionId: string;
  players: PlayerOption[];
}) => {
  const router = useRouter();
  const utils = api.useUtils();
  const [playerId, setPlayerId] = useState('');
  const { data: confirmed } = api.edition.confirmedPlayers.useQuery(
    { editionId },
    { initialData: initial, staleTime: 60 * 1000 },
  );
  const confirmedIds = new Set(confirmed.map((p) => p.id));
  const candidates = players.filter((p) => !confirmedIds.has(p.id));
  const settle = () => {
    utils.edition.confirmedPlayers.invalidate({ editionId });
    router.refresh();
  };
  const confirm = api.edition.confirmPlayer.useMutation({
    onSuccess: () => {
      setPlayerId('');
      settle();
    },
  });
  const unconfirm = api.edition.unconfirmPlayer.useMutation({
    onSuccess: settle,
  });
  const busy = confirm.isPending || unconfirm.isPending;
  const error = confirm.error ?? unconfirm.error;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className={sectionTitle}>Asistencia confirmada</span>
        <p className="text-(--faded) text-sm">
          Quien aparece aquí se muestra en El Concilio, en orden de ranking.
        </p>
      </div>
      {confirmed.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {confirmed.map((player, index) => (
            <li
              className="flex items-center gap-2.5 rounded-lg border border-(--hair) bg-(--night-2) py-1.5 pr-2 pl-2.5"
              key={player.id}
            >
              <span className="w-5 text-right font-mono text-(--faded) text-2xs">
                {index + 1}
              </span>
              <PlayerBlazon name={player.name} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold text-sm">
                {player.name}
              </span>
              <button
                className={`${btn.ghost} px-2.5 py-1 text-xs hover:text-(--ember)`}
                disabled={busy}
                onClick={() =>
                  unconfirm.mutate({ editionId, playerId: player.id })
                }
                type="button"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-(--faded) text-sm italic">
          Nadie ha confirmado todavía.
        </p>
      )}
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (playerId) {
            confirm.mutate({ editionId, playerId });
          }
        }}
      >
        <div className="flex-1">
          <label className={label} htmlFor="edition-confirm-player">
            Añadir jugador
          </label>
          <select
            className={select}
            disabled={candidates.length === 0}
            id="edition-confirm-player"
            onChange={(event) => setPlayerId(event.target.value)}
            value={playerId}
          >
            <option value="">
              {candidates.length === 0
                ? 'Todos los jugadores han confirmado'
                : 'Elige un jugador…'}
            </option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`${btn.primary} px-5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-55`}
          disabled={busy || !playerId}
          type="submit"
        >
          {confirm.isPending ? 'Confirmando…' : 'Confirmar asistencia'}
        </button>
      </form>
      {error ? (
        <p className="text-(--ember) text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
};

/** A select of players not yet used elsewhere in the section, plus an "unknown" seat when allowed. */
const PlayerPicker = ({
  allowUnknown = false,
  disabled,
  id,
  onPick,
  players,
  taken,
}: {
  allowUnknown?: boolean;
  disabled?: boolean;
  id: string;
  onPick: (playerId: string | null) => void;
  players: PlayerOption[];
  taken: Set<string>;
}) => (
  <select
    className={`${select} py-1 text-sm`}
    disabled={disabled}
    id={id}
    onChange={(event) => {
      const value = event.target.value;
      if (value === '') return;
      onPick(value === '?' ? null : value);
      event.target.value = '';
    }}
    value=""
  >
    <option value="">Añadir…</option>
    {allowUnknown ? <option value="?">Desconocido (sin nombre)</option> : null}
    {players
      .filter((p) => !taken.has(p.id))
      .map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
  </select>
);

/**
 * Pots and teams of the team tournament, saved together: the pots as
 * drawn, each team in seat order with its captain and, for the two that
 * played the final, its placement. Everything is replaced on save; teams
 * keep their ids so recorded matches survive.
 */
const TeamTournamentSection = ({
  edition,
  players,
}: {
  edition: EditionDetail;
  players: PlayerOption[];
}) => {
  const router = useRouter();
  const [pots, setPots] = useState<string[][]>(() =>
    edition.pots.map((pot) => pot.players.map((p) => p.id)),
  );
  const [teams, setTeams] = useState<TeamDraft[]>(() =>
    (edition.teamTournament?.teams ?? []).map((team) => ({
      id: team.id,
      playerIds: team.players.map((p) => p.id),
      captainPlayerId: team.players.find((p) => p.isCaptain)?.id ?? null,
      finalPosition:
        team.finalPosition === 1 || team.finalPosition === 2
          ? team.finalPosition
          : null,
    })),
  );
  const save = api.edition.saveTeamTournament.useMutation({
    onSuccess: () => router.refresh(),
  });
  const inPots = new Set(pots.flat());
  const inTeams = new Set(
    teams.flatMap((t) => t.playerIds.filter((id): id is string => !!id)),
  );

  const patchTeam = (index: number, changes: Partial<TeamDraft>) =>
    setTeams((current) =>
      current.map((t, i) => (i === index ? { ...t, ...changes } : t)),
    );
  const moveSeat = (teamIndex: number, seat: number, delta: number) =>
    setTeams((current) =>
      current.map((t, i) => {
        if (i !== teamIndex) return t;
        const ids = [...t.playerIds];
        const target = seat + delta;
        if (target < 0 || target >= ids.length) return t;
        [ids[seat], ids[target]] = [
          ids[target] as string | null,
          ids[seat] as string | null,
        ];
        return { ...t, playerIds: ids };
      }),
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className={sectionTitle}>Torneo por equipos</span>
        <p className="text-(--faded) text-sm">
          Los bombos del sorteo y los equipos en orden de elección, con su
          capitán. Campeones y finalistas marcan quién jugó la final; los
          anillos salen de ahí.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className={label}>Bombos</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pots.map((pot, potIndex) => (
            <div
              className="flex flex-col gap-2 rounded-lg border border-(--hair) bg-(--night-2) p-3"
              // biome-ignore lint/suspicious/noArrayIndexKey: pots are positional
              key={potIndex}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold font-mono text-(--gold) text-2xs uppercase tracking-2xl">
                  {POT_NAMES[potIndex] ?? `Bombo ${potIndex + 1}`}
                </span>
                <button
                  className={quiet}
                  onClick={() =>
                    setPots((current) =>
                      current.filter((_, i) => i !== potIndex),
                    )
                  }
                  type="button"
                >
                  Quitar bombo
                </button>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {pot.map((playerId) => (
                  <li
                    className="inline-flex items-center gap-1 rounded-full border border-(--hair-gold) py-0.5 pr-1 pl-2.5 font-mono text-(--gold) text-2xs uppercase tracking-xl"
                    key={playerId}
                  >
                    {nameOf(players, playerId)}
                    <button
                      aria-label={`Quitar ${nameOf(players, playerId)} del bombo`}
                      className="cursor-pointer rounded-full px-1 text-(--faded) hover:text-(--ember)"
                      onClick={() =>
                        setPots((current) =>
                          current.map((p, i) =>
                            i === potIndex
                              ? p.filter((id) => id !== playerId)
                              : p,
                          ),
                        )
                      }
                      type="button"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <PlayerPicker
                id={`pot-${potIndex}-add`}
                onPick={(playerId) => {
                  if (!playerId) return;
                  setPots((current) =>
                    current.map((p, i) =>
                      i === potIndex ? [...p, playerId] : p,
                    ),
                  );
                }}
                players={players}
                taken={inPots}
              />
            </div>
          ))}
        </div>
        <div>
          <button
            className={quiet}
            disabled={pots.length >= 6}
            onClick={() => setPots((current) => [...current, []])}
            type="button"
          >
            Añadir bombo
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className={label}>Equipos</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, teamIndex) => (
            <div
              className={`flex flex-col gap-2 rounded-lg border p-3 ${
                team.finalPosition === 1
                  ? 'border-(--gold) bg-(--gold)/6'
                  : 'border-(--hair) bg-(--night-2)'
              }`}
              key={team.id ?? `new-${teamIndex}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                  {team.captainPlayerId
                    ? `Equipo de ${nameOf(players, team.captainPlayerId)}`
                    : `Equipo ${teamIndex + 1}`}
                </span>
                <button
                  className={quiet}
                  onClick={() =>
                    setTeams((current) =>
                      current.filter((_, i) => i !== teamIndex),
                    )
                  }
                  type="button"
                >
                  Quitar
                </button>
              </div>
              <ol className="flex flex-col gap-1.5">
                {team.playerIds.map((playerId, seat) => (
                  <li
                    className="flex items-center gap-2"
                    // biome-ignore lint/suspicious/noArrayIndexKey: seats are positional
                    key={`${playerId ?? 'unknown'}-${seat}`}
                  >
                    <PlayerBlazon
                      name={playerId ? nameOf(players, playerId) : null}
                      size="sm"
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        playerId ? 'font-bold' : 'text-(--faded) italic'
                      }`}
                    >
                      {nameOf(players, playerId)}
                    </span>
                    <label className="flex items-center gap-1 font-mono text-(--faded) text-3xs uppercase tracking-xl">
                      <input
                        checked={
                          playerId !== null && team.captainPlayerId === playerId
                        }
                        className="accent-(--gold)"
                        disabled={playerId === null}
                        name={`captain-${teamIndex}`}
                        onChange={() =>
                          patchTeam(teamIndex, { captainPlayerId: playerId })
                        }
                        type="radio"
                      />
                      Cap.
                    </label>
                    <button
                      aria-label="Subir"
                      className={`${quiet} px-2`}
                      disabled={seat === 0}
                      onClick={() => moveSeat(teamIndex, seat, -1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label="Bajar"
                      className={`${quiet} px-2`}
                      disabled={seat === team.playerIds.length - 1}
                      onClick={() => moveSeat(teamIndex, seat, 1)}
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      aria-label="Quitar del equipo"
                      className="cursor-pointer px-1 text-(--faded) hover:text-(--ember)"
                      onClick={() =>
                        patchTeam(teamIndex, {
                          playerIds: team.playerIds.filter(
                            (_, i) => i !== seat,
                          ),
                          captainPlayerId:
                            team.captainPlayerId === playerId
                              ? null
                              : team.captainPlayerId,
                        })
                      }
                      type="button"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ol>
              <PlayerPicker
                allowUnknown
                disabled={team.playerIds.length >= 8}
                id={`team-${teamIndex}-add`}
                onPick={(playerId) =>
                  patchTeam(teamIndex, {
                    playerIds: [...team.playerIds, playerId],
                  })
                }
                players={players}
                taken={inTeams}
              />
              <select
                aria-label="Puesto final"
                className={`${select} py-1 text-sm`}
                onChange={(event) =>
                  patchTeam(teamIndex, {
                    finalPosition:
                      event.target.value === '1'
                        ? 1
                        : event.target.value === '2'
                          ? 2
                          : null,
                  })
                }
                value={team.finalPosition ?? ''}
              >
                <option value="">Sin puesto en la final</option>
                <option value="1">Campeones</option>
                <option value="2">Finalistas (perdieron la final)</option>
              </select>
            </div>
          ))}
        </div>
        <div>
          <button
            className={quiet}
            disabled={teams.length >= 16}
            onClick={() =>
              setTeams((current) => [
                ...current,
                {
                  id: null,
                  playerIds: [],
                  captainPlayerId: null,
                  finalPosition: null,
                },
              ])
            }
            type="button"
          >
            Añadir equipo
          </button>
        </div>
      </div>

      {save.error ? (
        <p className="text-(--ember) text-sm" role="alert">
          {save.error.message}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        {save.isSuccess && !save.isPending ? (
          <span className="text-(--gold-hi) text-xs">Guardado.</span>
        ) : null}
        <button
          className={`${btn.primary} px-5 py-1.5 text-sm`}
          disabled={
            save.isPending || teams.some((t) => t.playerIds.length === 0)
          }
          onClick={() =>
            save.mutate({
              editionId: edition.id,
              pots: pots.filter((pot) => pot.length > 0),
              teams,
            })
          }
          type="button"
        >
          {save.isPending ? 'Guardando…' : 'Guardar torneo por equipos'}
        </button>
      </div>
    </div>
  );
};

/** Champion and runner-up of the individual championship. */
const IndividualSection = ({
  edition,
  players,
}: {
  edition: EditionDetail;
  players: PlayerOption[];
}) => {
  const router = useRouter();
  const current = edition.individualTournament?.teams ?? [];
  const [champion, setChampion] = useState(
    current.find((t) => t.finalPosition === 1)?.players[0]?.id ?? '',
  );
  const [runnerUp, setRunnerUp] = useState(
    current.find((t) => t.finalPosition === 2)?.players[0]?.id ?? '',
  );
  const save = api.edition.saveIndividualTournament.useMutation({
    onSuccess: () => router.refresh(),
  });
  const field = (
    id: string,
    text: string,
    value: string,
    onChange: (value: string) => void,
  ) => (
    <div>
      <label className={label} htmlFor={id}>
        {text}
      </label>
      <select
        className={select}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">—</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <span className={sectionTitle}>Campeonato individual</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field('individual-champion', 'Campeón', champion, setChampion)}
        {field('individual-runner-up', 'Finalista', runnerUp, setRunnerUp)}
      </div>
      {save.error ? (
        <p className="text-(--ember) text-sm" role="alert">
          {save.error.message}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        {save.isSuccess && !save.isPending ? (
          <span className="text-(--gold-hi) text-xs">Guardado.</span>
        ) : null}
        <button
          className={`${btn.primary} px-5 py-1.5 text-sm`}
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              editionId: edition.id,
              championPlayerId: champion || null,
              runnerUpPlayerId: runnerUp || null,
            })
          }
          type="button"
        >
          {save.isPending ? 'Guardando…' : 'Guardar campeonato individual'}
        </button>
      </div>
    </div>
  );
};

export { EditionEditor };
