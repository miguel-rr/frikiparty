'use client';

import { type ReactNode, useState } from 'react';
import { CRITERION_TEXT, potLabels } from '@/components/live/setup/pot-labels';
import { btn, label, panel } from '@/components/theme/primitives';
import type {
  FormationConfig,
  RankingMeta,
} from '@/lib/tournament/formation-config';
import {
  needsQuotaFormation,
  type PotGroup,
} from '@/lib/tournament/pot-groups';
import { sharedPlaces } from '@/lib/tournament/ranking';
import type { LiveState } from '@/server/live/state';
import { api, type RouterOutputs } from '@/trpc/react';

type Preview = RouterOutputs['tournament']['rankingPreview'];
type VoteCount = FormationConfig['voteCount'];
type PotTiebreak = FormationConfig['potTiebreak'];
type PotLayout = FormationConfig['potLayout'];
type PotCriterion = FormationConfig['potCriterion'];
type CriterionSurplus = FormationConfig['criterionSurplus'];
type CriterionShortage = FormationConfig['criterionShortage'];

const LAYOUT_INFO: Record<PotLayout, { title: string; summary: string }> = {
  ranking: {
    title: 'Bombos por ranking',
    summary:
      'El ranking se corta en trozos seguidos, uno por bombo, y cada equipo se lleva uno de cada bombo. Lo de siempre.',
  },
  criterion_ranking: {
    title: 'Bombo por regla y bombos',
    summary:
      'Los que cumplen la regla forman su propio bombo, que garantiza uno por equipo. Los capitanes son los mejores del resto, y lo demás se corta en bombos.',
  },
  criterion_market: {
    title: 'Bombo por regla y mercado',
    summary:
      'El bombo de la regla garantiza uno por equipo. Los capitanes son los mejores del resto, y todos los demás van al mercado libre.',
  },
  market: {
    title: 'Sin bombos',
    summary:
      'Solo hay capitanes, los mejores del ranking. Todos los demás van a un único mercado, y cada capitán completa su equipo desde ahí.',
  },
};

const CRITERION_INFO: Record<PotCriterion, string> = {
  no_team_ring:
    'Nunca ha ganado el torneo por equipos. Los anillos individuales no cuentan.',
  no_ring: 'Nunca ha ganado nada: ni por equipos ni individual.',
};

const SURPLUS_INFO: Record<
  CriterionSurplus,
  { title: string; summary: string }
> = {
  best_out: {
    title: 'Salen los mejor situados',
    summary:
      'Los que sobran, empezando por el mejor del ranking, pasan al resto.',
  },
  worst_out: {
    title: 'Salen los peor situados',
    summary:
      'Los que sobran, empezando por el último del ranking, pasan al resto.',
  },
  draw_out: {
    title: 'Sorteo',
    summary:
      'Se sortea quién sale al confirmar el ranking. Lo de abajo es solo un ejemplo.',
  },
  double: {
    title: 'Equipos con dos',
    summary:
      'No sale nadie: algunos equipos se llevan dos de este bombo, nunca tres.',
  },
};

const SHORTAGE_INFO: Record<
  CriterionShortage,
  { title: string; summary: string }
> = {
  fill_worst: {
    title: 'Se completa con los últimos',
    summary:
      'Los peor situados del resto entran en el bombo hasta que haya uno por equipo.',
  },
  leave_short: {
    title: 'Se queda corto',
    summary:
      'Algunos equipos no tendrán a nadie de este bombo y completarán con el resto.',
  },
};

const VOTE_COUNT_INFO: Record<
  VoteCount,
  { title: string; summary: string; detail: string }
> = {
  borda: {
    title: 'Puntos',
    summary:
      'Cada papeleta da puntos por puesto: el 1.º se lleva tantos como jugadores hay, el último uno. Gana quien más suma.',
    detail:
      'Es el recuento de siempre. Una papeleta extrema mueve bastante a un jugador, porque los puntos se suman tal cual.',
  },
  median: {
    title: 'Mediana',
    summary:
      'Cada jugador queda en el puesto del medio de todos los que le han dado. Si dos tienen la misma mediana, decide la media.',
    detail:
      'Una o dos papeletas extremas casi no mueven la mediana: hace falta que muchos coincidan para subir o bajar a alguien.',
  },
  duels: {
    title: 'Duelos',
    summary:
      'Para cada pareja, ¿quién va por delante en más papeletas? En ese duelo no votan los dos implicados: decide la opinión de los demás.',
    detail:
      'Nadie puede bajarse a sí mismo ni hundir a su rival directo. Se ordena por duelos ganados; los empates se deshacen con los duelos entre los empatados.',
  },
};

const POT_TIEBREAK_INFO: Record<
  PotTiebreak,
  { title: string; summary: string }
> = {
  alphabetical: {
    title: 'Orden alfabético',
    summary:
      'Lo que hacía la web hasta ahora. Fijo y sin azar, pero no tiene nada que ver con el nivel.',
  },
  latest_ring: {
    title: 'Anillo más reciente',
    summary:
      'Va arriba quien ganó un anillo por equipos más recientemente. Quien siga empatado se sortea.',
  },
  draw: {
    title: 'Sorteo',
    summary:
      'Se sortea en directo al confirmar el ranking, y el sorteo queda registrado para todos.',
  },
};

const OUTLIER_HELP =
  'Cada papeleta se compara con lo que dicen las demás: 0 es idéntica al consenso y 100 justo al revés. Las que pasen del umbral no cuentan. Es anónimo: se ve cuántas se descartan, nunca de quién son.';

/** One choice among several, with what it does underneath. */
const OptionCard = ({
  active,
  disabled,
  onSelect,
  title,
  badge,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  title: string;
  badge?: string;
  children: ReactNode;
}) => (
  <button
    aria-pressed={active}
    className={`flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors disabled:cursor-default ${
      active
        ? 'border-(--gold) bg-(--gold)/8'
        : 'border-(--hair) enabled:hover:border-(--hair-gold)'
    }`}
    disabled={disabled}
    onClick={onSelect}
    type="button"
  >
    <span className="flex flex-wrap items-baseline justify-between gap-2">
      <span
        className={`font-bold text-sm ${active ? 'text-(--gold-hi)' : 'text-(--parchment)'}`}
      >
        {active ? '● ' : '○ '}
        {title}
      </span>
      {badge ? (
        <span className="font-mono text-(--gold) text-2xs uppercase tracking-wider">
          {badge}
        </span>
      ) : null}
    </span>
    <span className="flex flex-col gap-1.5 text-(--faded) text-xs">
      {children}
    </span>
  </button>
);

/** Which pot each player of a broken tie lands in. */
const seatsByPot = (
  ordered: string[],
  pots: number[],
  seats: number[],
): { pot: number; players: string[] }[] => {
  let start = 0;
  return pots.map((pot, index) => {
    const count = seats[index] ?? 0;
    const players = ordered.slice(start, start + count);
    start += count;
    return { pot, players };
  });
};

const nameList = (ids: string[], names: Map<string, string>) =>
  ids.map((id) => names.get(id) ?? '…').join(', ');

/**
 * The ties a pot cut runs through, and where each tie-break would put
 * every tied player. Without such ties the choice changes nothing, and
 * the panel says so.
 */
const CutTiesPreview = ({
  preview,
  names,
  selected,
  onSelect,
  disabled,
}: {
  preview: Preview;
  names: Map<string, string>;
  selected: PotTiebreak;
  onSelect?: (method: PotTiebreak) => void;
  disabled?: boolean;
}) => {
  const source =
    preview.cutSource === 'historical'
      ? 'el ranking histórico (el definitivo puede cambiar con la votación)'
      : 'el ranking tal como está ahora';
  return (
    <div className="flex flex-col gap-3">
      <p className="text-(--faded) text-xs">
        Bombos de {preview.potSize} jugadores, cortando {source}.
        {preview.cutTies.length === 0
          ? ' Ningún empate cae en un corte: el desempate no cambia nada.'
          : ''}
      </p>
      {preview.cutTies.map((tie) => (
        <div className="flex flex-col gap-2" key={tie.players.join('-')}>
          <p className="text-(--parchment) text-sm">
            Empatados en el corte entre los bombos{' '}
            {tie.pots.map((pot) => pot + 1).join(' y ')}:{' '}
            {nameList(tie.players, names)}.{' '}
            <span className="text-(--faded)">
              Caben{' '}
              {tie.pots
                .map((pot, index) => `${tie.seats[index]} en el ${pot + 1}`)
                .join(' y ')}
              .
            </span>
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {tie.options.map((option) => (
              <OptionCard
                active={selected === option.method}
                disabled={disabled || !onSelect}
                key={option.method}
                onSelect={() => onSelect?.(option.method)}
                title={POT_TIEBREAK_INFO[option.method].title}
              >
                <span>{POT_TIEBREAK_INFO[option.method].summary}</span>
                {option.method === 'draw' ? (
                  <span className="text-(--parchment)">
                    Cualquiera de los {tie.players.length} puede caer en
                    cualquiera de los bombos.
                  </span>
                ) : (
                  seatsByPot(option.ordered, tie.pots, tie.seats).map(
                    (group) => (
                      <span className="text-(--parchment)" key={group.pot}>
                        Bombo {group.pot + 1}:{' '}
                        {group.players
                          .map((id) =>
                            option.method === 'latest_ring'
                              ? `${names.get(id) ?? '…'} (${tie.latestRingYear[id] ?? 'sin anillo'})`
                              : (names.get(id) ?? '…'),
                          )
                          .join(', ')}
                      </span>
                    ),
                  )
                )}
                {option.method === 'latest_ring' && option.drawn ? (
                  <span>Siguen empatados algunos: esa parte se sortea.</span>
                ) : null}
              </OptionCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/** Plain choice of tie-break, for when there are no ties to preview. */
const TiebreakChoices = ({
  selected,
  onSelect,
  disabled,
}: {
  selected: PotTiebreak;
  onSelect: (method: PotTiebreak) => void;
  disabled?: boolean;
}) => (
  <div className="grid gap-2 sm:grid-cols-3">
    {(Object.keys(POT_TIEBREAK_INFO) as PotTiebreak[]).map((method) => (
      <OptionCard
        active={selected === method}
        disabled={disabled}
        key={method}
        onSelect={() => onSelect(method)}
        title={POT_TIEBREAK_INFO[method].title}
      >
        {POT_TIEBREAK_INFO[method].summary}
      </OptionCard>
    ))}
  </div>
);

const useConfigUpdate = (tournamentId: string) => {
  const utils = api.useUtils();
  return api.tournament.updateFormationConfig.useMutation({
    onSuccess: () => {
      utils.tournament.setup.invalidate({ tournamentId });
      utils.tournament.rankingPreview.invalidate();
    },
  });
};

/** Pot tie-break: the options side by side, previewed when possible. */
const PotTiebreakSection = ({
  state,
  editable,
}: {
  state: LiveState;
  editable: boolean;
}) => {
  const update = useConfigUpdate(state.id);
  const preview = api.tournament.rankingPreview.useQuery({
    tournamentId: state.id,
    voteOutlierThreshold: state.formationConfig.voteOutlierThreshold,
    historicalWeightPercent: state.historicalWeightPercent,
  });
  const names = new Map(state.participants.map((p) => [p.id, p.name]));
  const select = (method: PotTiebreak) =>
    update.mutate({ tournamentId: state.id, patch: { potTiebreak: method } });
  const selected = state.formationConfig.potTiebreak;
  return (
    <div className="flex flex-col gap-2">
      <span className={label}>Empates en el corte de los bombos</span>
      <p className="text-(--faded) text-xs">
        Los jugadores empatados comparten puesto. Sólo hace falta desempatar
        cuando un empate queda partido entre dos bombos.
      </p>
      {preview.data && preview.data.cutTies.length > 0 ? (
        <CutTiesPreview
          disabled={!editable || update.isPending}
          names={names}
          onSelect={select}
          preview={preview.data}
          selected={selected}
        />
      ) : (
        <>
          {preview.data ? (
            <CutTiesPreview
              names={names}
              preview={preview.data}
              selected={selected}
            />
          ) : null}
          <TiebreakChoices
            disabled={!editable || update.isPending}
            onSelect={select}
            selected={selected}
          />
        </>
      )}
      {update.error ? (
        <p className="text-(--ember) text-sm">{update.error.message}</p>
      ) : null}
    </div>
  );
};

/** Outlier threshold: off, or a 0–100 distance. */
const ThresholdControl = ({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-2">
    <label className="flex items-center gap-2 text-(--parchment) text-sm">
      <input
        checked={value !== null}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked ? 60 : null)}
        type="checkbox"
      />
      Descartar papeletas muy alejadas del resto
    </label>
    {value !== null ? (
      <label className="flex items-center gap-3 text-(--faded) text-xs">
        <input
          className="w-full max-w-72"
          disabled={disabled}
          max={100}
          min={0}
          onChange={(e) => onChange(Number(e.target.value))}
          step={5}
          type="range"
          value={value}
        />
        <span className="w-24 shrink-0 font-mono text-(--gold)">
          umbral {value}
        </span>
      </label>
    ) : null}
    <span className="text-(--faded) text-xs">{OUTLIER_HELP}</span>
  </div>
);

/**
 * Setup and voting: how the vote will be counted and how cut ties are
 * broken. The vote's effect can't be previewed before it closes; the
 * review then compares every option on the real ballots.
 */
const FormationOptionsSection = ({ state }: { state: LiveState }) => {
  const update = useConfigUpdate(state.id);
  const config = state.formationConfig;
  const hasVote = (state.rankingSource ?? 'historical') !== 'historical';
  const editable = state.stage === 'setup' || state.stage === 'voting';
  const patch = (value: Partial<FormationConfig>) =>
    update.mutate({ tournamentId: state.id, patch: value });
  return (
    <section className={`${panel} flex flex-col gap-6 p-5 sm:p-7`}>
      <div className="flex flex-col gap-1">
        <h3 className="d-display font-bold text-(--parchment) text-xl uppercase">
          Recuento, bombos y desempates
        </h3>
        <p className="text-(--faded) text-sm">
          Se puede cambiar hasta la revisión del ranking, donde se ve el efecto
          de cada opción sobre las papeletas reales antes de confirmar.
        </p>
      </div>
      {hasVote ? (
        <>
          <div className="flex flex-col gap-2">
            <span className={label}>Cómo se cuentan los votos</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(VOTE_COUNT_INFO) as VoteCount[]).map((method) => (
                <OptionCard
                  active={config.voteCount === method}
                  disabled={!editable || update.isPending}
                  key={method}
                  onSelect={() => patch({ voteCount: method })}
                  title={VOTE_COUNT_INFO[method].title}
                >
                  <span>{VOTE_COUNT_INFO[method].summary}</span>
                  <span>{VOTE_COUNT_INFO[method].detail}</span>
                </OptionCard>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className={label}>Papeletas raras</span>
            <ThresholdControl
              disabled={!editable || update.isPending}
              onChange={(value) => patch({ voteOutlierThreshold: value })}
              value={config.voteOutlierThreshold}
            />
          </div>
        </>
      ) : null}
      <PotLayoutSection editable state={state} />
      <PotTiebreakSection editable state={state} />
      {update.error ? (
        <p className="text-(--ember) text-sm">{update.error.message}</p>
      ) : null}
    </section>
  );
};

type BuiltPreview = {
  pots: string[][];
  groups: PotGroup[];
  movedOut: string[];
  filledIn: string[];
};

/** Every group of a layout with its players, as one compact list. */
const GroupsPreview = ({
  built,
  names,
  criterion,
}: {
  built: BuiltPreview;
  names: Map<string, string>;
  criterion: PotCriterion;
}) => {
  const labels = potLabels(built.pots, built.groups, criterion, 0);
  return (
    <span className="flex flex-col gap-1">
      {built.pots.map((pot, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional pots.
        <span className="text-(--parchment)" key={index}>
          <span className="text-(--gold)">
            {labels[index]?.title} ({pot.length})
          </span>
          : {nameList(pot, names)}
        </span>
      ))}
      {built.movedOut.length > 0 ? (
        <span>Salen de la regla: {nameList(built.movedOut, names)}.</span>
      ) : null}
      {built.filledIn.length > 0 ? (
        <span>Entran sin cumplirla: {nameList(built.filledIn, names)}.</span>
      ) : null}
      {needsQuotaFormation(built.groups) ? (
        <span>
          Sirve el reparto aleatorio; el draft por bombos y la subasta abierta
          no.
        </span>
      ) : null}
    </span>
  );
};

/**
 * How the pots are made: the layout, and for a rule's pot the rule and
 * what happens with too many or too few. Every option shows the pots it
 * would give with the current ranking.
 */
const PotLayoutSection = ({
  state,
  editable,
}: {
  state: LiveState;
  editable: boolean;
}) => {
  const update = useConfigUpdate(state.id);
  const config = state.formationConfig;
  const preview = api.tournament.rankingPreview.useQuery({
    tournamentId: state.id,
    voteOutlierThreshold: config.voteOutlierThreshold,
    historicalWeightPercent: state.historicalWeightPercent,
  });
  const names = new Map(state.participants.map((p) => [p.id, p.name]));
  const patch = (value: Partial<FormationConfig>) =>
    update.mutate({ tournamentId: state.id, patch: value });
  const disabled = !editable || update.isPending;
  const data = preview.data?.pots;
  const meeting =
    data?.criteria.find((entry) => entry.criterion === config.potCriterion)
      ?.meeting.length ?? 0;
  const withRule = config.potLayout.startsWith('criterion');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className={label}>Cómo se forman los bombos</span>
        <p className="text-(--faded) text-xs">
          Cada opción muestra los bombos que saldrían con{' '}
          {preview.data?.cutSource === 'historical'
            ? 'el ranking histórico (el definitivo puede cambiar)'
            : 'el ranking actual'}
          {data ? ` y ${data.teamCount} equipos` : ''}. Los bombos se pueden
          retocar a mano en su revisión.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(LAYOUT_INFO) as PotLayout[]).map((layout) => {
            const built = data?.layouts.find(
              (entry) => entry.layout === layout,
            );
            return (
              <OptionCard
                active={config.potLayout === layout}
                disabled={disabled}
                key={layout}
                onSelect={() => patch({ potLayout: layout })}
                title={LAYOUT_INFO[layout].title}
              >
                <span>{LAYOUT_INFO[layout].summary}</span>
                {built ? (
                  <GroupsPreview
                    built={built}
                    criterion={config.potCriterion}
                    names={names}
                  />
                ) : null}
              </OptionCard>
            );
          })}
        </div>
      </div>
      {withRule ? (
        <>
          <div className="flex flex-col gap-2">
            <span className={label}>La regla del bombo</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(CRITERION_INFO) as PotCriterion[]).map(
                (criterion) => {
                  const who =
                    data?.criteria.find(
                      (entry) => entry.criterion === criterion,
                    )?.meeting ?? [];
                  return (
                    <OptionCard
                      active={config.potCriterion === criterion}
                      disabled={disabled}
                      key={criterion}
                      onSelect={() => patch({ potCriterion: criterion })}
                      title={CRITERION_TEXT[criterion]}
                    >
                      <span>{CRITERION_INFO[criterion]}</span>
                      {data ? (
                        <span className="text-(--parchment)">
                          {who.length} jugadores para {data.teamCount} equipos:{' '}
                          {nameList(who, names) || 'nadie'}.
                        </span>
                      ) : null}
                    </OptionCard>
                  );
                },
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className={label}>
              Si cumplen la regla más que equipos hay
            </span>
            {data ? (
              <p className="text-(--faded) text-xs">
                {meeting > data.teamCount
                  ? `Ahora sobran ${meeting - data.teamCount}: esta opción se aplica.`
                  : 'Ahora no sobra nadie: esta opción no cambia nada, salvo que el ranking o la regla cambien.'}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(SURPLUS_INFO) as CriterionSurplus[]).map(
                (surplus) => {
                  const built = data?.surpluses.find(
                    (entry) => entry.surplus === surplus,
                  );
                  return (
                    <OptionCard
                      active={config.criterionSurplus === surplus}
                      disabled={disabled}
                      key={surplus}
                      onSelect={() => patch({ criterionSurplus: surplus })}
                      title={SURPLUS_INFO[surplus].title}
                    >
                      <span>{SURPLUS_INFO[surplus].summary}</span>
                      {built && meeting > (data?.teamCount ?? 0) ? (
                        <GroupsPreview
                          built={built}
                          criterion={config.potCriterion}
                          names={names}
                        />
                      ) : null}
                    </OptionCard>
                  );
                },
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className={label}>
              Si cumplen la regla menos que equipos hay
            </span>
            {data ? (
              <p className="text-(--faded) text-xs">
                {meeting < data.teamCount
                  ? `Ahora faltan ${data.teamCount - meeting}: esta opción se aplica.`
                  : 'Ahora no falta nadie: esta opción no cambia nada, salvo que el ranking o la regla cambien.'}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(SHORTAGE_INFO) as CriterionShortage[]).map(
                (shortage) => {
                  const built = data?.shortages.find(
                    (entry) => entry.shortage === shortage,
                  );
                  return (
                    <OptionCard
                      active={config.criterionShortage === shortage}
                      disabled={disabled}
                      key={shortage}
                      onSelect={() => patch({ criterionShortage: shortage })}
                      title={SHORTAGE_INFO[shortage].title}
                    >
                      <span>{SHORTAGE_INFO[shortage].summary}</span>
                      {built && meeting < (data?.teamCount ?? 0) ? (
                        <GroupsPreview
                          built={built}
                          criterion={config.potCriterion}
                          names={names}
                        />
                      ) : null}
                    </OptionCard>
                  );
                },
              )}
            </div>
          </div>
        </>
      ) : null}
      {update.error ? (
        <p className="text-(--ember) text-sm">{update.error.message}</p>
      ) : null}
    </div>
  );
};

/** Anonymous distances of the ballots to the rest, with the threshold. */
const DistanceStrip = ({
  distances,
  threshold,
}: {
  distances: number[];
  threshold: number | null;
}) => (
  <div className="flex flex-col gap-1">
    <div className="relative h-7 rounded border border-(--hair) bg-(--night-2)">
      {threshold !== null ? (
        <span
          className="absolute inset-y-0 border-(--ember) border-l-2"
          style={{ left: `${threshold}%` }}
        />
      ) : null}
      {distances.map((distance, index) => (
        <span
          className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            threshold !== null && distance > threshold
              ? 'bg-(--ember)'
              : 'bg-(--gold)'
          }`}
          // biome-ignore lint/suspicious/noArrayIndexKey: anonymous dots.
          key={index}
          style={{
            left: `${distance}%`,
            marginTop: `${((index % 3) - 1) * 6}px`,
          }}
          title={`Distancia ${distance}`}
        />
      ))}
    </div>
    <div className="flex justify-between font-mono text-(--faded) text-2xs">
      <span>0 · igual que el resto</span>
      <span>100 · al revés</span>
    </div>
  </div>
);

/** Places moved by each player between two orders. */
const movesBetween = (from: string[], to: string[]) => {
  const before = new Map(from.map((id, index) => [id, index]));
  return new Map(
    to.map((id, index) => [id, (before.get(id) ?? index) - index]),
  );
};

/** A counted order, cut into pots, with what moved against the current. */
const MethodOrder = ({
  order,
  tieGroups,
  current,
  potSize,
  names,
}: {
  order: string[];
  tieGroups: string[][];
  current: string[];
  potSize: number;
  names: Map<string, string>;
}) => {
  const places = sharedPlaces(order, tieGroups);
  const moves = movesBetween(current, order);
  return (
    <ol className="flex flex-col text-xs">
      {order.map((id, index) => {
        const move = moves.get(id) ?? 0;
        const tied = tieGroups.some((group) => group.includes(id));
        return (
          <li
            className={`flex items-baseline gap-2 py-0.5 ${
              index > 0 && index % potSize === 0
                ? 'mt-1 border-(--hair-gold) border-t pt-1'
                : ''
            }`}
            key={id}
          >
            <span className="w-7 shrink-0 text-right font-mono text-(--faded)">
              {tied ? '=' : ''}
              {places.get(id) ?? index + 1}
            </span>
            <span className="truncate text-(--parchment)">
              {names.get(id) ?? '…'}
            </span>
            {move !== 0 ? (
              <span
                className={`ml-auto shrink-0 font-mono ${move > 0 ? 'text-(--gold)' : 'text-(--ember)'}`}
              >
                {move > 0 ? `↑${move}` : `↓${-move}`}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};

/**
 * Ranking review with a vote: every counting method on the real ballots,
 * with the discard threshold and the historical weight live, so the
 * admin sees each option's effect before making one the ranking.
 */
const RecountPanel = ({
  state,
  current,
}: {
  state: LiveState;
  current: string[];
}) => {
  const utils = api.useUtils();
  const config = state.formationConfig;
  const combined = state.rankingSource === 'combined';
  const [threshold, setThreshold] = useState(config.voteOutlierThreshold);
  const [weight, setWeight] = useState(state.historicalWeightPercent ?? 50);
  const preview = api.tournament.rankingPreview.useQuery(
    {
      tournamentId: state.id,
      voteOutlierThreshold: threshold,
      historicalWeightPercent: combined ? weight : null,
    },
    { placeholderData: (previous) => previous },
  );
  const apply = api.tournament.applyRankingOptions.useMutation({
    onSuccess: () => {
      utils.tournament.setup.invalidate({ tournamentId: state.id });
      utils.tournament.rankingPreview.invalidate();
    },
  });
  const names = new Map(state.participants.map((p) => [p.id, p.name]));
  const data = preview.data;
  const discarded = data?.methods[0]?.ballotsDiscarded ?? 0;
  const sameOptions =
    threshold === config.voteOutlierThreshold &&
    (!combined || weight === (state.historicalWeightPercent ?? 50));
  return (
    <div className={`${panel} flex flex-col gap-5 p-4 sm:p-5`}>
      <div className="flex flex-col gap-1">
        <span className={label}>Comparar recuentos</span>
        <p className="text-(--faded) text-xs">
          Los tres métodos sobre las mismas papeletas. Las flechas comparan con
          el ranking actual. Usar uno sustituye el ranking, cambios a mano
          incluidos.
        </p>
      </div>
      {data ? (
        <div className="flex flex-col gap-2">
          <span className={label}>
            Papeletas · {data.ballots} en total
            {threshold !== null ? ` · ${discarded} descartadas` : ''}
          </span>
          <DistanceStrip distances={data.distances} threshold={threshold} />
        </div>
      ) : null}
      <ThresholdControl
        disabled={apply.isPending}
        onChange={setThreshold}
        value={threshold}
      />
      {combined ? (
        <label className="flex flex-col gap-1 text-(--faded) text-xs">
          <span className={label}>Peso del histórico · {weight}%</span>
          <input
            className="w-full max-w-72"
            max={100}
            min={0}
            onChange={(e) => setWeight(Number(e.target.value))}
            step={5}
            type="range"
            value={weight}
          />
          <span>
            Cada jugador queda en la media ponderada de sus dos puestos:{' '}
            {weight}% el histórico y {100 - weight}% la votación.
          </span>
        </label>
      ) : null}
      {data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {data.methods.map((method) => {
            const inUse = sameOptions && method.voteCount === config.voteCount;
            return (
              <div
                className={`flex flex-col gap-2 rounded-lg border p-3 ${inUse ? 'border-(--gold)' : 'border-(--hair)'}`}
                key={method.voteCount}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-(--parchment) text-sm">
                    {VOTE_COUNT_INFO[method.voteCount].title}
                  </span>
                  {inUse ? (
                    <span className="font-mono text-(--gold) text-2xs uppercase">
                      en uso
                    </span>
                  ) : null}
                </span>
                <span className="text-(--faded) text-xs">
                  {VOTE_COUNT_INFO[method.voteCount].summary}
                </span>
                <MethodOrder
                  current={current}
                  names={names}
                  order={method.order}
                  potSize={data.potSize}
                  tieGroups={method.tieGroups}
                />
                <button
                  className={`${btn.secondary} mt-auto px-4 py-2 text-xs`}
                  disabled={apply.isPending || inUse}
                  onClick={() =>
                    apply.mutate({
                      tournamentId: state.id,
                      voteCount: method.voteCount,
                      voteOutlierThreshold: threshold,
                      historicalWeightPercent: combined ? weight : null,
                    })
                  }
                  type="button"
                >
                  {inUse ? 'Es el ranking actual' : 'Usar este recuento'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-(--faded) text-sm">Contando…</p>
      )}
      {apply.error ? (
        <p className="text-(--ember) text-sm">{apply.error.message}</p>
      ) : null}
    </div>
  );
};

const describeResolution = (
  resolution: NonNullable<RankingMeta['cutTies']>[number],
  names: Map<string, string>,
) =>
  seatsByPot(resolution.ordered, resolution.pots, resolution.seats)
    .map((group) => `bombo ${group.pot + 1}: ${nameList(group.players, names)}`)
    .join(' · ');

/**
 * How the ties at the pot cuts were settled, for the pots review and the
 * public reveal: method, outcome and whether chance decided it.
 */
const CutTiesNotice = ({ state }: { state: LiveState }) => {
  const resolutions = state.rankingMeta?.cutTies ?? [];
  if (resolutions.length === 0) return null;
  const names = new Map(state.participants.map((p) => [p.id, p.name]));
  return (
    <div className="flex flex-col gap-2 text-sm">
      {resolutions.map((resolution) => (
        <p className="text-(--faded)" key={resolution.players.join('-')}>
          <span className="text-(--parchment)">
            Empate entre {nameList(resolution.players, names)}
          </span>
          , resuelto por{' '}
          {POT_TIEBREAK_INFO[resolution.method].title.toLowerCase()}
          {resolution.drawn ? ' (con sorteo)' : ''}:{' '}
          {describeResolution(resolution, names)}.
        </p>
      ))}
    </div>
  );
};

/** Who left the rule's pot or was added to it, said in the open. */
const CriterionMovesNotice = ({ state }: { state: LiveState }) => {
  const moves = state.rankingMeta?.criterionMoves;
  if (!moves || (moves.movedOut.length === 0 && moves.filledIn.length === 0)) {
    return null;
  }
  const names = new Map(state.participants.map((p) => [p.id, p.name]));
  const rule = CRITERION_TEXT[state.formationConfig.potCriterion].toLowerCase();
  return (
    <div className="flex flex-col gap-1 text-(--faded) text-sm">
      {moves.movedOut.length > 0 ? (
        <p>
          Cumplen la regla ({rule}) pero no caben en su bombo, y pasan al resto
          {moves.drawn ? ' por sorteo' : ''}:{' '}
          <span className="text-(--parchment)">
            {nameList(moves.movedOut, names)}
          </span>
          .
        </p>
      ) : null}
      {moves.filledIn.length > 0 ? (
        <p>
          Faltaban jugadores {rule}, y completan el bombo los últimos del
          ranking:{' '}
          <span className="text-(--parchment)">
            {nameList(moves.filledIn, names)}
          </span>
          .
        </p>
      ) : null}
    </div>
  );
};

export {
  CriterionMovesNotice,
  CutTiesNotice,
  FormationOptionsSection,
  PotLayoutSection,
  PotTiebreakSection,
  RecountPanel,
};
