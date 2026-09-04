'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  btn,
  input,
  label,
  panel,
  panelGold,
  tag,
} from '@/components/theme/primitives';
import { STAGE_META } from '@/lib/live/stages';
import {
  TOURNAMENT_STAGES,
  type TournamentStage,
} from '@/lib/tournament/stages';
import { describeTeamsLayout } from '@/lib/tournament/teams-layout';
import { api } from '@/trpc/react';

type NextEdition = { id: string; year: number };

const select =
  'w-full appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3.5 py-2 text-(--parchment) transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';

const fieldset = 'flex flex-col gap-1';

/**
 * Creates the tournament of the coming edition, or manages the one that
 * exists: roster, size, start, and the emergency levers (stage override,
 * delete) that make test runs cheap.
 */
const SetupWizard = ({
  nextEdition,
  tournamentId,
}: {
  nextEdition: NextEdition;
  tournamentId: string | null;
}) =>
  tournamentId ? (
    <SetupPanel tournamentId={tournamentId} />
  ) : (
    <CreateTournamentForm nextEdition={nextEdition} />
  );

const CreateTournamentForm = ({
  nextEdition,
}: {
  nextEdition: NextEdition;
}) => {
  const router = useRouter();
  const catalog = api.tournament.catalog.useQuery();
  const candidates = api.tournament.candidates.useQuery({
    editionId: nextEdition.id,
  });
  const [kind, setKind] = useState<'team' | 'individual'>('team');
  const [isOfficial, setIsOfficial] = useState(true);
  const [gameId, setGameId] = useState('');
  const [gameVersionId, setGameVersionId] = useState('');
  const [model, setModel] = useState<'classic' | 'swiss'>('classic');
  const [teamSize, setTeamSize] = useState(4);
  const [rankingSource, setRankingSource] = useState<
    'historical' | 'vote' | 'combined'
  >('historical');
  const [weight, setWeight] = useState(50);
  const [selected, setSelected] = useState<Set<string> | null>(null);

  // Age of the Ring and its latest version come preselected.
  useEffect(() => {
    if (!catalog.data || gameId) return;
    const aotr =
      catalog.data.games.find((game) => game.name === 'Age of the Ring') ??
      catalog.data.games[0];
    if (aotr) setGameId(aotr.id);
  }, [catalog.data, gameId]);
  const versions = useMemo(
    () => catalog.data?.versions.filter((v) => v.gameId === gameId) ?? [],
    [catalog.data, gameId],
  );
  useEffect(() => {
    const latest = versions.at(-1);
    setGameVersionId(latest?.id ?? '');
  }, [versions]);
  // The confirmed players come preselected.
  useEffect(() => {
    if (!candidates.data || selected) return;
    setSelected(
      new Set(candidates.data.filter((c) => c.confirmed).map((c) => c.id)),
    );
  }, [candidates.data, selected]);

  const create = api.tournament.create.useMutation({
    onSuccess: () => router.refresh(),
  });

  const chosen = selected ?? new Set<string>();
  const effectiveTeamSize = kind === 'individual' ? 1 : teamSize;
  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          editionId: nextEdition.id,
          kind,
          isOfficial,
          gameId,
          gameVersionId: gameVersionId || null,
          model,
          teamSize: effectiveTeamSize,
          rankingSource,
          historicalWeightPercent: rankingSource === 'combined' ? weight : null,
          participantPlayerIds: [...chosen],
        });
      }}
    >
      <section className={`${panelGold} grid gap-5 p-5 sm:grid-cols-2 sm:p-7`}>
        <div className={fieldset}>
          <span className={label}>Tipo</span>
          <select
            className={select}
            onChange={(e) => setKind(e.target.value as 'team' | 'individual')}
            value={kind}
          >
            <option value="team">Por equipos</option>
            <option value="individual">Individual</option>
          </select>
        </div>
        <div className={fieldset}>
          <span className={label}>Modelo</span>
          <select
            className={select}
            onChange={(e) => setModel(e.target.value as 'classic' | 'swiss')}
            value={model}
          >
            <option value="classic">Clásico (grupos y eliminatorias)</option>
            <option value="swiss">Suizo</option>
          </select>
        </div>
        <div className={fieldset}>
          <span className={label}>Juego</span>
          <select
            className={select}
            onChange={(e) => setGameId(e.target.value)}
            value={gameId}
          >
            {catalog.data?.games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>
        <div className={fieldset}>
          <span className={label}>Versión</span>
          <select
            className={select}
            disabled={versions.length === 0}
            onChange={(e) => setGameVersionId(e.target.value)}
            value={gameVersionId}
          >
            {versions.length === 0 ? <option value="">—</option> : null}
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.version}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-(--parchment) text-sm">
          <input
            checked={isOfficial}
            onChange={(e) => setIsOfficial(e.target.checked)}
            type="checkbox"
          />
          Torneo oficial (reparte anillos)
        </label>
        {kind === 'team' ? (
          <div className={fieldset}>
            <span className={label}>Jugadores por equipo (máximo)</span>
            <input
              className={input}
              max={10}
              min={2}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              type="number"
              value={teamSize}
            />
          </div>
        ) : null}
        <div className={fieldset}>
          <span className={label}>Ranking del torneo</span>
          <select
            className={select}
            onChange={(e) =>
              setRankingSource(
                e.target.value as 'historical' | 'vote' | 'combined',
              )
            }
            value={rankingSource}
          >
            <option value="historical">Histórico</option>
            <option value="vote">Votación</option>
            <option value="combined">Combinado (histórico + votación)</option>
          </select>
        </div>
        {rankingSource === 'combined' ? (
          <div className={fieldset}>
            <span className={label}>Peso del histórico (%)</span>
            <input
              className={input}
              max={100}
              min={0}
              onChange={(e) => setWeight(Number(e.target.value))}
              type="number"
              value={weight}
            />
          </div>
        ) : null}
      </section>

      <section className={`${panel} flex flex-col gap-4 p-5 sm:p-7`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
            Participantes
          </h3>
          <span className="font-mono text-(--faded) text-xs uppercase tracking-2xl">
            {chosen.size} elegidos ·{' '}
            {describeTeamsLayout(chosen.size, effectiveTeamSize)}
          </span>
        </div>
        <p className="text-(--faded) text-sm">
          Los confirmados de la edición vienen marcados. Se puede añadir a
          cualquiera, por lo que pueda pasar.
        </p>
        <CandidateList
          candidates={candidates.data ?? []}
          chosen={chosen}
          onToggle={toggle}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btn.primary}
          disabled={create.isPending || chosen.size < 2 || !gameId}
          type="submit"
        >
          {create.isPending ? 'Creando…' : 'Crear el torneo'}
        </button>
        {create.error ? (
          <span className="text-(--ember) text-sm">{create.error.message}</span>
        ) : null}
      </div>
    </form>
  );
};

const CandidateList = ({
  candidates,
  chosen,
  onToggle,
}: {
  candidates: {
    id: string;
    name: string;
    confirmed: boolean;
    hasAccount: boolean;
  }[];
  chosen: Set<string>;
  onToggle: (id: string) => void;
}) => (
  <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
    {candidates.map((candidate) => (
      <li key={candidate.id}>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            checked={chosen.has(candidate.id)}
            onChange={() => onToggle(candidate.id)}
            type="checkbox"
          />
          <span
            className={
              chosen.has(candidate.id) ? 'text-(--parchment)' : 'text-(--faded)'
            }
          >
            {candidate.name}
          </span>
          {candidate.confirmed ? (
            <span className="text-(--moss) text-2xs" title="Confirmado">
              ✓
            </span>
          ) : null}
          {!candidate.hasAccount ? (
            <span
              className="size-1.5 rounded-full bg-(--ember)"
              title="Sin cuenta vinculada"
            />
          ) : null}
        </label>
      </li>
    ))}
  </ul>
);

const SetupPanel = ({ tournamentId }: { tournamentId: string }) => {
  const router = useRouter();
  const utils = api.useUtils();
  const setup = api.tournament.setup.useQuery({ tournamentId });
  const refresh = () => {
    utils.tournament.setup.invalidate({ tournamentId });
    router.refresh();
  };
  const setParticipants = api.tournament.setParticipants.useMutation({
    onSuccess: refresh,
  });
  const updateConfig = api.tournament.updateConfig.useMutation({
    onSuccess: refresh,
  });
  const start = api.tournament.start.useMutation({ onSuccess: refresh });
  const setStage = api.tournament.setStage.useMutation({ onSuccess: refresh });
  const remove = api.tournament.delete.useMutation({
    onSuccess: () => router.refresh(),
  });
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [teamSize, setTeamSize] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!setup.data) {
    return <p className="text-(--faded) text-sm">Cargando el torneo…</p>;
  }
  const { state, candidates, staffWithoutPlayer } = setup.data;
  const chosen = draft ?? new Set(state.participants.map((p) => p.id));
  const size = teamSize ?? state.teamSize ?? 1;
  const rosterEditable = [
    'setup',
    'voting',
    'ranking_review',
    'pots_review',
  ].includes(state.stage);
  const dirtyRoster =
    draft !== null &&
    (draft.size !== state.participants.length ||
      state.participants.some((p) => !draft.has(p.id)));
  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDraft(next);
  };
  const error =
    setParticipants.error ??
    updateConfig.error ??
    start.error ??
    setStage.error ??
    remove.error;

  return (
    <div className="flex flex-col gap-8">
      <section className={`${panelGold} flex flex-col gap-4 p-5 sm:p-7`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className={tag}>
              {state.kind === 'individual' ? 'Individual' : 'Por equipos'} ·{' '}
              {state.gameName ?? 'Juego'}
              {state.gameVersion ? ` ${state.gameVersion}` : ''} ·{' '}
              {state.model === 'swiss' ? 'Suizo' : 'Clásico'}
            </span>
            <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
              {STAGE_META[state.stage].title}
            </h3>
            <p className="text-(--faded) text-sm">
              {STAGE_META[state.stage].next}
            </p>
          </div>
          <Link className={btn.outline} href="/live">
            Ver en vivo
          </Link>
        </div>

        {state.stage === 'setup' ? (
          <div className="flex flex-wrap items-center gap-3 border-(--hair) border-t pt-4">
            <button
              className={btn.primary}
              disabled={start.isPending || state.participants.length < 2}
              onClick={() => start.mutate({ tournamentId })}
              type="button"
            >
              {start.isPending ? 'Comenzando…' : 'Dar comienzo al torneo'}
            </button>
            <span className="text-(--faded) text-xs">
              Desde ese momento el torneo es público y El Concilio lo muestra en
              lugar de la puerta.
            </span>
          </div>
        ) : null}
      </section>

      <section className={`${panel} grid gap-5 p-5 sm:grid-cols-2 sm:p-7`}>
        {state.kind === 'team' ? (
          <div className={fieldset}>
            <span className={label}>Jugadores por equipo (máximo)</span>
            <div className="flex items-center gap-2">
              <input
                className={input}
                disabled={!rosterEditable}
                max={10}
                min={2}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                type="number"
                value={size}
              />
              {teamSize !== null && teamSize !== state.teamSize ? (
                <button
                  className={`${btn.secondary} whitespace-nowrap px-4 py-2 text-xs`}
                  disabled={updateConfig.isPending}
                  onClick={() =>
                    updateConfig.mutate({ tournamentId, teamSize: size })
                  }
                  type="button"
                >
                  Aplicar
                </button>
              ) : null}
            </div>
            <span className="text-(--faded) text-xs">
              {describeTeamsLayout(state.participants.length, size)}
            </span>
          </div>
        ) : null}
        <div className={fieldset}>
          <span className={label}>Ranking del torneo</span>
          <select
            className={select}
            disabled={state.stage !== 'setup'}
            onChange={(e) =>
              updateConfig.mutate({
                tournamentId,
                rankingSource: e.target.value as
                  | 'historical'
                  | 'vote'
                  | 'combined',
              })
            }
            value={state.rankingSource ?? 'historical'}
          >
            <option value="historical">Histórico</option>
            <option value="vote">Votación</option>
            <option value="combined">Combinado (histórico + votación)</option>
          </select>
        </div>
      </section>

      <section className={`${panel} flex flex-col gap-4 p-5 sm:p-7`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
            Participantes
          </h3>
          <span className="font-mono text-(--faded) text-xs uppercase tracking-2xl">
            {chosen.size} · {describeTeamsLayout(chosen.size, size)}
          </span>
        </div>
        {rosterEditable ? (
          <>
            <CandidateList
              candidates={candidates}
              chosen={chosen}
              onToggle={toggle}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                className={btn.secondary}
                disabled={!dirtyRoster || setParticipants.isPending}
                onClick={() =>
                  setParticipants.mutate({
                    tournamentId,
                    playerIds: [...chosen],
                  })
                }
                type="button"
              >
                {setParticipants.isPending ? 'Guardando…' : 'Guardar la lista'}
              </button>
              {dirtyRoster ? (
                <button
                  className={btn.ghost}
                  onClick={() => setDraft(null)}
                  type="button"
                >
                  Descartar cambios
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-(--faded) text-sm">
            Los equipos ya están en marcha: la lista queda cerrada.
          </p>
        )}
        {staffWithoutPlayer.length > 0 ? (
          <p className="text-(--faded) text-xs">
            Cuentas de administración sin jugador:{' '}
            {staffWithoutPlayer.map((s) => s.name).join(', ')}.
          </p>
        ) : null}
      </section>

      <section className={`${panel} flex flex-col gap-4 p-5 sm:p-7`}>
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          Palancas
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className={fieldset}>
            <span className={label}>Etapa (a mano)</span>
            <select
              className={select}
              disabled={setStage.isPending}
              onChange={(e) =>
                setStage.mutate({
                  tournamentId,
                  stage: e.target.value as TournamentStage,
                })
              }
              value={state.stage}
            >
              {TOURNAMENT_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_META[stage].label}
                </option>
              ))}
            </select>
            <span className="text-(--faded) text-xs">
              Para pruebas y emergencias: mueve el torneo sin pasar por los
              pasos. Queda registrado.
            </span>
          </div>
          <div className={fieldset}>
            <span className={label}>Borrar el torneo</span>
            <div className="flex flex-wrap items-center gap-2">
              {confirmDelete ? (
                <>
                  <button
                    className={btn.danger}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ tournamentId })}
                    type="button"
                  >
                    {remove.isPending ? 'Borrando…' : 'Sí, borrar todo'}
                  </button>
                  <button
                    className={btn.ghost}
                    onClick={() => setConfirmDelete(false)}
                    type="button"
                  >
                    No
                  </button>
                </>
              ) : (
                <button
                  className={btn.danger}
                  disabled={state.stage === 'completed'}
                  onClick={() => setConfirmDelete(true)}
                  type="button"
                >
                  Borrar
                </button>
              )}
            </div>
            <span className="text-(--faded) text-xs">
              Equipos, votos, eventos y partidos incluidos. Un torneo terminado
              no se borra.
            </span>
          </div>
        </div>
      </section>

      {error ? <p className="text-(--ember) text-sm">{error.message}</p> : null}
    </div>
  );
};

export { SetupWizard };
