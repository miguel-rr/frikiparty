'use client';

import { useState } from 'react';

import { ReorderList } from '@/components/live/reorder-list';
import {
  btn,
  input,
  label,
  panel,
  panelGold,
} from '@/components/theme/primitives';
import { teamLabel } from '@/lib/live/team-label';
import { bracketRounds } from '@/lib/tournament/phase-engine';
import {
  DEFAULT_TIEBREAK_CHAIN,
  GROUP_TIEBREAK_CRITERIA,
  type GroupTiebreakCriterion,
  MANUAL_CRITERIA,
  TIEBREAK_LABELS,
} from '@/lib/tournament/tiebreak';
import type { LiveState } from '@/server/live/state';
import { api } from '@/trpc/react';

type PhasePlan = {
  type: 'group' | 'bracket' | 'swiss';
  name: string | null;
  group: {
    groupCount: number;
    roundsFormat: 'single' | 'double';
    gamesToWinMatch: number;
    tiebreakChain: GroupTiebreakCriterion[];
    qualifiersPerGroup: number;
    groupDistribution: 'random' | 'manual';
  } | null;
  bracket: {
    hasThirdPlaceMatch: boolean;
    seedingSource: 'previous_phase' | 'ranking' | 'manual';
    gamesToWinByRound: Record<string, number>;
    defaultGamesToWin: number;
  } | null;
  swiss: {
    eliminationLosses: number;
    pairingMethod: 'random' | 'ranking_parity' | 'ranking_seed';
  } | null;
  factions: {
    allowRepeatAcrossTeams: boolean;
    poolMode: 'fresh' | 'depleting';
    poolCarriesOver: boolean;
  } | null;
};

const select =
  'w-full appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3.5 py-2 text-(--parchment) transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';
const field = 'flex flex-col gap-1';

const defaultFactions = {
  allowRepeatAcrossTeams: true,
  poolMode: 'fresh' as const,
  poolCarriesOver: false,
};

const blankPhase = (type: PhasePlan['type'], teamCount: number): PhasePlan => ({
  type,
  name: null,
  group:
    type === 'group'
      ? {
          groupCount: 1,
          roundsFormat: 'single',
          gamesToWinMatch: 1,
          tiebreakChain: [...DEFAULT_TIEBREAK_CHAIN],
          qualifiersPerGroup: Math.min(4, Math.max(2, teamCount)),
          groupDistribution: 'random',
        }
      : null,
  bracket:
    type === 'bracket'
      ? {
          hasThirdPlaceMatch: false,
          seedingSource: 'previous_phase',
          gamesToWinByRound: {},
          defaultGamesToWin: 1,
        }
      : null,
  swiss:
    type === 'swiss'
      ? { eliminationLosses: 2, pairingMethod: 'ranking_parity' }
      : null,
  factions: { ...defaultFactions },
});

/** Reads the saved plan back into the editor's shape. */
const planFromState = (state: LiveState): PhasePlan[] =>
  state.phases.map((p) => ({
    type: p.type,
    name: p.name,
    group: p.group ? { ...p.group } : null,
    bracket: p.bracket
      ? {
          hasThirdPlaceMatch: p.bracket.hasThirdPlaceMatch,
          seedingSource: p.bracket.seedingSource,
          gamesToWinByRound: Object.fromEntries(
            p.bracket.rounds.map((r) => [
              String(r.roundIndex),
              r.gamesToWinMatch,
            ]),
          ),
          defaultGamesToWin: p.bracket.rounds[0]?.gamesToWinMatch ?? 1,
        }
      : null,
    swiss: p.swiss ? { ...p.swiss } : null,
    factions: p.factions ? { ...p.factions } : { ...defaultFactions },
  }));

const entrantsBefore = (
  plans: PhasePlan[],
  index: number,
  teamCount: number,
): number => {
  if (index === 0) return teamCount;
  const previous = plans[index - 1];
  if (previous?.group)
    return previous.group.groupCount * previous.group.qualifiersPerGroup;
  return entrantsBefore(plans, index - 1, teamCount);
};

const roundName = (r: number, total: number) =>
  r === 0
    ? 'Play-in'
    : r === total
      ? 'Final'
      : r === total - 1
        ? 'Semifinales'
        : r === total - 2
          ? 'Cuartos'
          : `Ronda ${r}`;

/**
 * The organiser's phase desk: build the plan (groups, bracket, swiss, each
 * with its own rules), save it, generate the first phase, tweak the
 * groups by hand, and start the tournament.
 */
const PhasesPanel = ({
  state,
  onDone,
}: {
  state: LiveState;
  onDone: () => void;
}) => {
  const utils = api.useUtils();
  const refresh = () => {
    utils.tournament.setup.invalidate({ tournamentId: state.id });
    utils.live.state.invalidate({ tournamentId: state.id });
  };
  const [plans, setPlans] = useState<PhasePlan[] | null>(null);
  const save = api.phases.savePlan.useMutation({
    onSuccess: () => {
      setPlans(null);
      refresh();
    },
  });
  const generate = api.phases.generateFirst.useMutation({ onSuccess: refresh });
  const start = api.phases.startPlay.useMutation({ onSuccess: onDone });
  const teamCount = state.teams.length;
  const current =
    plans ??
    (state.phases.length > 0
      ? planFromState(state)
      : [blankPhase('group', teamCount), blankPhase('bracket', teamCount)]);
  const dirty = plans !== null;
  const generated = state.phases.some((p) => p.matches.length > 0);
  const hasFactions = Boolean(state.gameId) && state.isOfficial;
  const error = save.error ?? generate.error ?? start.error;

  const update = (index: number, next: PhasePlan) => {
    const copy = [...current];
    copy[index] = next;
    setPlans(copy);
  };

  return (
    <section className={`${panelGold} flex flex-col gap-6 p-5 sm:p-7`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          Fases del torneo
        </h3>
        <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
          {teamCount} equipos · modelo{' '}
          {state.model === 'swiss' ? 'suizo' : 'clásico'}
        </span>
      </div>

      {generated ? (
        <p className="text-(--faded) text-sm">
          La primera fase ya está generada. Cambiar el plan la borra y la vuelve
          a generar.
        </p>
      ) : null}

      <ol className="flex flex-col gap-4">
        {current.map((plan, index) => (
          <li
            className={`${panel} flex flex-col gap-4 p-4`}
            // biome-ignore lint/suspicious/noArrayIndexKey: phases are positional; their order is their identity.
            key={`${index}-${plan.type}`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold font-mono text-(--gold) text-sm">
                Fase {index + 1}
              </span>
              <select
                className={`${select} w-auto`}
                onChange={(e) =>
                  update(
                    index,
                    blankPhase(e.target.value as PhasePlan['type'], teamCount),
                  )
                }
                value={plan.type}
              >
                <option value="group">Grupos</option>
                <option value="bracket">Eliminatorias</option>
                <option value="swiss">Suizo</option>
              </select>
              <input
                className={`${input} w-56`}
                onChange={(e) =>
                  update(index, { ...plan, name: e.target.value || null })
                }
                placeholder={
                  plan.type === 'group'
                    ? 'Fase de grupos'
                    : plan.type === 'bracket'
                      ? 'Playoffs'
                      : 'Suizo'
                }
                value={plan.name ?? ''}
              />
              <span className="text-(--faded) text-xs">
                entran {entrantsBefore(current, index, teamCount)} equipos
              </span>
              <button
                className={`${btn.ghost} ml-auto px-2 text-xs`}
                disabled={current.length === 1}
                onClick={() => setPlans(current.filter((_, i) => i !== index))}
                type="button"
              >
                Quitar
              </button>
            </div>

            {plan.group ? (
              <GroupFields
                onChange={(next) => update(index, next)}
                plan={plan}
              />
            ) : null}
            {plan.bracket ? (
              <BracketFields
                entrants={entrantsBefore(current, index, teamCount)}
                first={index === 0}
                onChange={(next) => update(index, next)}
                plan={plan}
              />
            ) : null}
            {plan.swiss ? (
              <SwissFields
                onChange={(next) => update(index, next)}
                plan={plan}
              />
            ) : null}
            {hasFactions ? (
              <FactionFields
                onChange={(next) => update(index, next)}
                plan={plan}
              />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`${btn.secondary} px-4 py-1.5 text-xs`}
          onClick={() =>
            setPlans([...current, blankPhase('bracket', teamCount)])
          }
          type="button"
        >
          Añadir fase
        </button>
        <button
          className={btn.primary}
          disabled={save.isPending || (!dirty && state.phases.length > 0)}
          onClick={() =>
            save.mutate({ tournamentId: state.id, phases: current })
          }
          type="button"
        >
          {save.isPending ? 'Guardando…' : 'Guardar el plan'}
        </button>
        {dirty ? (
          <button
            className={btn.ghost}
            onClick={() => setPlans(null)}
            type="button"
          >
            Descartar
          </button>
        ) : null}
      </div>

      {state.phases.length > 0 && !dirty ? (
        <div className="flex flex-wrap items-center gap-3 border-(--hair) border-t pt-4">
          <button
            className={generated ? btn.secondary : btn.primary}
            disabled={generate.isPending}
            onClick={() => generate.mutate({ tournamentId: state.id })}
            type="button"
          >
            {generate.isPending
              ? 'Forjando…'
              : generated
                ? 'Volver a generar la fase 1'
                : 'Generar la fase 1'}
          </button>
          {generated ? (
            <button
              className={btn.primary}
              disabled={start.isPending}
              onClick={() => start.mutate({ tournamentId: state.id })}
              type="button"
            >
              {start.isPending ? 'Arrancando…' : 'Arrancar el torneo'}
            </button>
          ) : null}
          <span className="text-(--faded) text-xs">
            Generar crea los grupos y la primera jornada (o la ronda 1).
            Arrancar abre el marcador.
          </span>
        </div>
      ) : null}

      {generated &&
      state.phases[0]?.group &&
      state.phases[0].groups.length > 1 ? (
        <GroupsEditor onSaved={refresh} state={state} />
      ) : null}

      {error ? <p className="text-(--ember) text-sm">{error.message}</p> : null}
    </section>
  );
};

const GroupFields = ({
  plan,
  onChange,
}: {
  plan: PhasePlan;
  onChange: (next: PhasePlan) => void;
}) => {
  const g = plan.group;
  if (!g) return null;
  const set = (patch: Partial<NonNullable<PhasePlan['group']>>) =>
    onChange({ ...plan, group: { ...g, ...patch } });
  const inactive = GROUP_TIEBREAK_CRITERIA.filter(
    (c) => !g.tiebreakChain.includes(c),
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={field}>
          <span className={label}>Grupos</span>
          <input
            className={input}
            max={8}
            min={1}
            onChange={(e) => set({ groupCount: Number(e.target.value) })}
            type="number"
            value={g.groupCount}
          />
        </div>
        <div className={field}>
          <span className={label}>Vueltas</span>
          <select
            className={select}
            onChange={(e) =>
              set({ roundsFormat: e.target.value as 'single' | 'double' })
            }
            value={g.roundsFormat}
          >
            <option value="single">Solo ida</option>
            <option value="double">Ida y vuelta</option>
          </select>
        </div>
        <div className={field}>
          <span className={label}>Partidas para ganar</span>
          <input
            className={input}
            max={5}
            min={1}
            onChange={(e) => set({ gamesToWinMatch: Number(e.target.value) })}
            type="number"
            value={g.gamesToWinMatch}
          />
        </div>
        <div className={field}>
          <span className={label}>Clasifican por grupo</span>
          <input
            className={input}
            max={32}
            min={1}
            onChange={(e) =>
              set({ qualifiersPerGroup: Number(e.target.value) })
            }
            type="number"
            value={g.qualifiersPerGroup}
          />
        </div>
        {g.groupCount > 1 ? (
          <div className={field}>
            <span className={label}>Reparto en grupos</span>
            <select
              className={select}
              onChange={(e) =>
                set({
                  groupDistribution: e.target.value as 'random' | 'manual',
                })
              }
              value={g.groupDistribution}
            >
              <option value="random">Sorteo</option>
              <option value="manual">Serpiente por ranking (editable)</option>
            </select>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <span className={label}>Desempate, en este orden</span>
        <ReorderList
          ids={g.tiebreakChain}
          onChange={(next) =>
            set({ tiebreakChain: next as GroupTiebreakCriterion[] })
          }
          renderItem={(id) => (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-(--parchment)">
                {TIEBREAK_LABELS[id as GroupTiebreakCriterion]}
              </span>
              {MANUAL_CRITERIA.includes(id as GroupTiebreakCriterion) ? (
                <span className="font-mono text-(--faded) text-2xs uppercase">
                  manual
                </span>
              ) : null}
              <button
                className="ml-auto text-(--faded) text-xs hover:text-(--ember)"
                onClick={() =>
                  set({
                    tiebreakChain: g.tiebreakChain.filter((c) => c !== id),
                  })
                }
                type="button"
              >
                quitar
              </button>
            </span>
          )}
        />
        {inactive.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {inactive.map((c) => (
              <button
                className={`${btn.ghost} px-2 text-xs`}
                key={c}
                onClick={() => set({ tiebreakChain: [...g.tiebreakChain, c] })}
                type="button"
              >
                + {TIEBREAK_LABELS[c]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const BracketFields = ({
  plan,
  entrants,
  first,
  onChange,
}: {
  plan: PhasePlan;
  entrants: number;
  first: boolean;
  onChange: (next: PhasePlan) => void;
}) => {
  const b = plan.bracket;
  if (!b) return null;
  const set = (patch: Partial<NonNullable<PhasePlan['bracket']>>) =>
    onChange({ ...plan, bracket: { ...b, ...patch } });
  const total = bracketRounds(entrants);
  const hasPlayIn = entrants > 1 && entrants !== 2 ** total;
  const rounds = Array.from({ length: total + (hasPlayIn ? 1 : 0) }, (_, i) =>
    hasPlayIn ? i : i + 1,
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center gap-2 text-(--parchment) text-sm">
          <input
            checked={b.hasThirdPlaceMatch}
            onChange={(e) => set({ hasThirdPlaceMatch: e.target.checked })}
            type="checkbox"
          />
          Partido por el 3er puesto
        </label>
        <div className={field}>
          <span className={label}>Siembra</span>
          <select
            className={select}
            onChange={(e) =>
              set({
                seedingSource: e.target.value as NonNullable<
                  PhasePlan['bracket']
                >['seedingSource'],
              })
            }
            value={first ? 'ranking' : b.seedingSource}
          >
            {first ? (
              <option value="ranking">Por ranking</option>
            ) : (
              <option value="previous_phase">
                Clasificación de la fase anterior
              </option>
            )}
            {first ? null : <option value="manual">A mano</option>}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {rounds.map((r) => (
          <div className={field} key={r}>
            <span className={label}>
              {roundName(r, total)} · partidas para ganar
            </span>
            <input
              className={input}
              max={5}
              min={1}
              onChange={(e) =>
                set({
                  gamesToWinByRound: {
                    ...b.gamesToWinByRound,
                    [String(r)]: Number(e.target.value),
                  },
                })
              }
              type="number"
              value={b.gamesToWinByRound[String(r)] ?? b.defaultGamesToWin}
            />
          </div>
        ))}
      </div>
      <span className="text-(--faded) text-xs">
        {entrants} equipos → {total} ronda{total === 1 ? '' : 's'}
        {hasPlayIn ? ' con play-in previo (nunca hay byes)' : ''}.
      </span>
    </div>
  );
};

const SwissFields = ({
  plan,
  onChange,
}: {
  plan: PhasePlan;
  onChange: (next: PhasePlan) => void;
}) => {
  const s = plan.swiss;
  if (!s) return null;
  const set = (patch: Partial<NonNullable<PhasePlan['swiss']>>) =>
    onChange({ ...plan, swiss: { ...s, ...patch } });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className={field}>
        <span className={label}>Derrotas para quedar eliminado</span>
        <input
          className={input}
          max={10}
          min={1}
          onChange={(e) => set({ eliminationLosses: Number(e.target.value) })}
          type="number"
          value={s.eliminationLosses}
        />
      </div>
      <div className={field}>
        <span className={label}>Emparejamiento a igual marcador</span>
        <select
          className={select}
          onChange={(e) =>
            set({
              pairingMethod: e.target.value as NonNullable<
                PhasePlan['swiss']
              >['pairingMethod'],
            })
          }
          value={s.pairingMethod}
        >
          <option value="random">Aleatorio</option>
          <option value="ranking_parity">
            Ranking por paridad (parecidos entre sí)
          </option>
          <option value="ranking_seed">
            Cabezas de serie (mejor contra peor)
          </option>
        </select>
      </div>
    </div>
  );
};

const FactionFields = ({
  plan,
  onChange,
}: {
  plan: PhasePlan;
  onChange: (next: PhasePlan) => void;
}) => {
  const f = plan.factions ?? defaultFactions;
  const set = (patch: Partial<NonNullable<PhasePlan['factions']>>) =>
    onChange({ ...plan, factions: { ...f, ...patch } });
  return (
    <div className="grid gap-3 border-(--hair) border-t pt-3 sm:grid-cols-3">
      <label className="flex items-center gap-2 text-(--parchment) text-sm">
        <input
          checked={f.allowRepeatAcrossTeams}
          onChange={(e) => set({ allowRepeatAcrossTeams: e.target.checked })}
          type="checkbox"
        />
        Facciones repetibles entre los dos equipos
      </label>
      <div className={field}>
        <span className={label}>Pool de facciones</span>
        <select
          className={select}
          onChange={(e) =>
            set({ poolMode: e.target.value as 'fresh' | 'depleting' })
          }
          value={f.poolMode}
        >
          <option value="fresh">Todas en cada partida</option>
          <option value="depleting">Se van gastando por equipo</option>
        </select>
      </div>
      {f.poolMode === 'depleting' ? (
        <label className="flex items-center gap-2 text-(--parchment) text-sm">
          <input
            checked={f.poolCarriesOver}
            onChange={(e) => set({ poolCarriesOver: e.target.checked })}
            type="checkbox"
          />
          Continúa el pool de la fase anterior
        </label>
      ) : null}
    </div>
  );
};

/** Move teams between the first phase's groups by hand. */
const GroupsEditor = ({
  state,
  onSaved,
}: {
  state: LiveState;
  onSaved: () => void;
}) => {
  const first = state.phases[0];
  const [groups, setGroups] = useState<string[][] | null>(null);
  const save = api.phases.setGroups.useMutation({
    onSuccess: () => {
      setGroups(null);
      onSaved();
    },
  });
  if (!first) return null;
  const current = groups ?? first.groups.map((g) => g.teamIds);
  const teamById = new Map(state.teams.map((t) => [t.id, t]));
  const move = (teamId: string, from: number, to: number) => {
    const next = current.map((g) => [...g]);
    next[from] = (next[from] ?? []).filter((t) => t !== teamId);
    next[to]?.push(teamId);
    setGroups(next);
  };
  return (
    <div className="flex flex-col gap-3 border-(--hair) border-t pt-4">
      <span className={label}>Grupos (mover a mano regenera las jornadas)</span>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {current.map((teamIds, gi) => (
          <div
            className={`${panel} flex flex-col gap-1.5 p-3`}
            key={String.fromCharCode(65 + gi)}
          >
            <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
              Grupo {String.fromCharCode(65 + gi)}
            </span>
            {teamIds.map((teamId) => (
              <div
                className="flex items-center justify-between gap-2 text-sm"
                key={teamId}
              >
                <span className="truncate text-(--parchment)">
                  {teamLabel(teamById.get(teamId))}
                </span>
                <span className="flex gap-1">
                  <button
                    className="grid size-6 place-items-center rounded-full border border-(--hair) text-xs disabled:opacity-30"
                    disabled={gi === 0}
                    onClick={() => move(teamId, gi, gi - 1)}
                    type="button"
                  >
                    ←
                  </button>
                  <button
                    className="grid size-6 place-items-center rounded-full border border-(--hair) text-xs disabled:opacity-30"
                    disabled={gi === current.length - 1}
                    onClick={() => move(teamId, gi, gi + 1)}
                    type="button"
                  >
                    →
                  </button>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          className={btn.secondary}
          disabled={!groups || save.isPending}
          onClick={() =>
            groups && save.mutate({ tournamentId: state.id, groups })
          }
          type="button"
        >
          {save.isPending ? 'Guardando…' : 'Guardar grupos'}
        </button>
        {groups ? (
          <button
            className={btn.ghost}
            onClick={() => setGroups(null)}
            type="button"
          >
            Descartar
          </button>
        ) : null}
      </div>
      {save.error ? (
        <p className="text-(--ember) text-sm">{save.error.message}</p>
      ) : null}
    </div>
  );
};

export { PhasesPanel };
