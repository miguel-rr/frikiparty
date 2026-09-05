'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  btn,
  input,
  label,
  panel,
  panelGold,
} from '@/components/theme/primitives';
import { api, type RouterOutputs } from '@/trpc/react';

const select =
  'w-full appearance-none rounded-lg border border-(--hair) bg-(--night-2) px-3 py-1.5 text-(--parchment) text-sm transition-colors hover:border-(--hair-gold) focus:border-(--gold) focus:outline-none';
const field = 'flex flex-col gap-1';
const small = `${input} py-1 text-sm`;
const area = `${input} min-h-28 py-2 font-mono text-xs leading-relaxed`;

type Overview = RouterOutputs['wiki']['overview'];

const numberOrNull = (value: string) =>
  value.trim() === '' ? null : Number(value);

/** Games → versions, factions, maps → the revision editor. */
const WikiAdmin = () => {
  const overview = api.wiki.overview.useQuery();
  const [gameId, setGameId] = useState<string | null>(null);
  useEffect(() => {
    if (!gameId && overview.data?.games[0])
      setGameId(overview.data.games[0].id);
  }, [overview.data, gameId]);
  if (!overview.data)
    return <p className="text-(--faded) text-sm">Cargando…</p>;
  const data = overview.data;
  const gameRow = data.games.find((g) => g.id === gameId) ?? null;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className={`${select} w-auto`}
          onChange={(e) => setGameId(e.target.value)}
          value={gameId ?? ''}
        >
          {data.games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <NewGame onDone={() => overview.refetch()} />
        {gameRow?.slug ? (
          <Link className={btn.outline} href={`/games/${gameRow.slug}`}>
            Ver la página
          </Link>
        ) : null}
      </div>
      {gameRow ? (
        <>
          <GameForm game={gameRow} onDone={() => overview.refetch()} />
          <VersionsEditor
            data={data}
            gameId={gameRow.id}
            onDone={() => overview.refetch()}
          />
          <FactionsEditor
            data={data}
            gameId={gameRow.id}
            onDone={() => overview.refetch()}
          />
          <MapsEditor
            data={data}
            gameId={gameRow.id}
            onDone={() => overview.refetch()}
          />
          <RevisionEditor
            data={data}
            gameId={gameRow.id}
            onDone={() => overview.refetch()}
          />
        </>
      ) : null}
    </div>
  );
};

const NewGame = ({ onDone }: { onDone: () => void }) => {
  const [name, setName] = useState('');
  const create = api.wiki.createGame.useMutation({
    onSuccess: () => {
      setName('');
      onDone();
    },
  });
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ name, isOfficial: false });
      }}
    >
      <input
        className={`${small} w-44`}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nuevo juego"
        value={name}
      />
      <button
        className={`${btn.secondary} px-3 py-1 text-xs`}
        disabled={!name.trim() || create.isPending}
        type="submit"
      >
        Añadir
      </button>
    </form>
  );
};

const GameForm = ({
  game,
  onDone,
}: {
  game: Overview['games'][number];
  onDone: () => void;
}) => {
  const [form, setForm] = useState({
    name: game.name,
    slug: game.slug ?? '',
    isOfficial: game.isOfficial,
    description: game.description ?? '',
    websiteUrl: game.websiteUrl ?? '',
  });
  useEffect(() => {
    setForm({
      name: game.name,
      slug: game.slug ?? '',
      isOfficial: game.isOfficial,
      description: game.description ?? '',
      websiteUrl: game.websiteUrl ?? '',
    });
  }, [game]);
  const save = api.wiki.updateGame.useMutation({ onSuccess: onDone });
  return (
    <section className={`${panelGold} flex flex-col gap-3 p-5`}>
      <h3 className="d-display font-bold text-(--parchment) text-lg uppercase">
        El juego
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={field}>
          <span className={label}>Nombre</span>
          <input
            className={small}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            value={form.name}
          />
        </div>
        <div className={field}>
          <span className={label}>Slug</span>
          <input
            className={small}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            value={form.slug}
          />
        </div>
        <div className={field}>
          <span className={label}>Web</span>
          <input
            className={small}
            onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
            value={form.websiteUrl}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-(--parchment) text-sm">
        <input
          checked={form.isOfficial}
          onChange={(e) => setForm({ ...form, isOfficial: e.target.checked })}
          type="checkbox"
        />{' '}
        Juego oficial
      </label>
      <div className={field}>
        <span className={label}>
          Descripción (párrafos separados por línea en blanco)
        </span>
        <textarea
          className={area}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          value={form.description}
        />
      </div>
      <button
        className={`${btn.primary} self-start`}
        disabled={save.isPending}
        onClick={() =>
          save.mutate({
            id: game.id,
            name: form.name,
            slug: form.slug || null,
            isOfficial: form.isOfficial,
            description: form.description || null,
            websiteUrl: form.websiteUrl || null,
          })
        }
        type="button"
      >
        Guardar el juego
      </button>
      {save.error ? (
        <p className="text-(--ember) text-sm">{save.error.message}</p>
      ) : null}
    </section>
  );
};

const VersionsEditor = ({
  data,
  gameId,
  onDone,
}: {
  data: Overview;
  gameId: string;
  onDone: () => void;
}) => {
  const versions = data.versions.filter((v) => v.gameId === gameId);
  const save = api.wiki.upsertVersion.useMutation({ onSuccess: onDone });
  const [draft, setDraft] = useState<
    Record<
      string,
      {
        version: string;
        releaseOrder: number;
        releasedAt: string;
        notes: string;
        changelogUrl: string;
      }
    >
  >({});
  const rowFor = (v: (typeof versions)[number] | null) =>
    draft[v?.id ?? 'new'] ?? {
      version: v?.version ?? '',
      releaseOrder: v?.releaseOrder ?? versions.length + 1,
      releasedAt: v?.releasedAt ?? '',
      notes: v?.notes ?? '',
      changelogUrl: v?.changelogUrl ?? '',
    };
  const setRow = (
    key: string,
    patch: Partial<ReturnType<typeof rowFor>>,
    base: ReturnType<typeof rowFor>,
  ) => setDraft({ ...draft, [key]: { ...base, ...patch } });
  const submit = (key: string, v: (typeof versions)[number] | null) => {
    const row = rowFor(v);
    save.mutate(
      {
        id: v?.id,
        gameId,
        version: row.version,
        releaseOrder: row.releaseOrder,
        releasedAt: row.releasedAt || null,
        notes: row.notes || null,
        changelogUrl: row.changelogUrl || null,
      },
      { onSuccess: () => setDraft({ ...draft, [key]: undefined as never }) },
    );
  };
  return (
    <section className={`${panel} flex flex-col gap-4 p-5`}>
      <h3 className="d-display font-bold text-(--parchment) text-lg uppercase">
        Versiones
      </h3>
      {[...versions, null].map((v) => {
        const key = v?.id ?? 'new';
        const row = rowFor(v);
        return (
          <div
            className="flex flex-col gap-2 border-(--hair) border-t pt-3 first:border-t-0 first:pt-0"
            key={key}
          >
            <div className="grid gap-2 sm:grid-cols-4">
              <div className={field}>
                <span className={label}>Versión</span>
                <input
                  className={small}
                  onChange={(e) =>
                    setRow(key, { version: e.target.value }, row)
                  }
                  placeholder={v ? '' : 'Nueva versión'}
                  value={row.version}
                />
              </div>
              <div className={field}>
                <span className={label}>Orden</span>
                <input
                  className={small}
                  onChange={(e) =>
                    setRow(key, { releaseOrder: Number(e.target.value) }, row)
                  }
                  type="number"
                  value={row.releaseOrder}
                />
              </div>
              <div className={field}>
                <span className={label}>Publicada</span>
                <input
                  className={small}
                  onChange={(e) =>
                    setRow(key, { releasedAt: e.target.value }, row)
                  }
                  type="date"
                  value={row.releasedAt}
                />
              </div>
              <div className={field}>
                <span className={label}>Notas oficiales (URL)</span>
                <input
                  className={small}
                  onChange={(e) =>
                    setRow(key, { changelogUrl: e.target.value }, row)
                  }
                  value={row.changelogUrl}
                />
              </div>
            </div>
            <div className={field}>
              <span className={label}>Qué trae (párrafos)</span>
              <textarea
                className={area}
                onChange={(e) => setRow(key, { notes: e.target.value }, row)}
                value={row.notes}
              />
            </div>
            <button
              className={`${btn.secondary} self-start px-3 py-1 text-xs`}
              disabled={!row.version.trim() || save.isPending}
              onClick={() => submit(key, v)}
              type="button"
            >
              {v ? 'Guardar' : 'Añadir versión'}
            </button>
          </div>
        );
      })}
      {save.error ? (
        <p className="text-(--ember) text-sm">{save.error.message}</p>
      ) : null}
    </section>
  );
};

const FactionsEditor = ({
  data,
  gameId,
  onDone,
}: {
  data: Overview;
  gameId: string;
  onDone: () => void;
}) => {
  const versions = data.versions.filter((v) => v.gameId === gameId);
  const versionIds = new Set(versions.map((v) => v.id));
  const factions = data.factions.filter((f) =>
    versionIds.has(f.introducedInVersionId),
  );
  const save = api.wiki.upsertFaction.useMutation({ onSuccess: onDone });
  type Row = {
    name: string;
    code: string;
    kind: 'core' | 'alternate';
    introducedInVersionId: string;
    removedInVersionId: string;
    transformsFactionId: string;
    sortOrder: number;
  };
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const rowFor = (f: (typeof factions)[number] | null): Row =>
    draft[f?.id ?? 'new'] ?? {
      name: f?.name ?? '',
      code: f?.code ?? '',
      kind: f?.kind ?? 'core',
      introducedInVersionId: f?.introducedInVersionId ?? versions[0]?.id ?? '',
      removedInVersionId: f?.removedInVersionId ?? '',
      transformsFactionId: f?.transformsFactionId ?? '',
      sortOrder: f?.sortOrder ?? factions.length,
    };
  return (
    <section className={`${panel} flex flex-col gap-3 p-5`}>
      <h3 className="d-display font-bold text-(--parchment) text-lg uppercase">
        Facciones
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-200 border-collapse text-xs">
          <thead>
            <tr className="font-mono text-(--faded) text-2xs uppercase tracking-wider">
              <th className="px-1 py-1 text-left">Nombre</th>
              <th className="px-1 py-1 text-left">Código</th>
              <th className="px-1 py-1 text-left">Tipo</th>
              <th className="px-1 py-1 text-left">Desde</th>
              <th className="px-1 py-1 text-left">Hasta</th>
              <th className="px-1 py-1 text-left">Transforma</th>
              <th className="px-1 py-1 text-left">Orden</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...factions, null].map((f) => {
              const key = f?.id ?? 'new';
              const row = rowFor(f);
              const set = (patch: Partial<Row>) =>
                setDraft({ ...draft, [key]: { ...row, ...patch } });
              return (
                <tr key={key}>
                  <td className="px-1 py-1">
                    <input
                      className={small}
                      onChange={(e) => set({ name: e.target.value })}
                      placeholder={f ? '' : 'Nueva facción'}
                      value={row.name}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={`${small} w-32`}
                      onChange={(e) => set({ code: e.target.value })}
                      value={row.code}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <select
                      className={select}
                      onChange={(e) =>
                        set({ kind: e.target.value as 'core' | 'alternate' })
                      }
                      value={row.kind}
                    >
                      <option value="core">Principal</option>
                      <option value="alternate">Alternativa</option>
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <select
                      className={select}
                      onChange={(e) =>
                        set({ introducedInVersionId: e.target.value })
                      }
                      value={row.introducedInVersionId}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.version}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <select
                      className={select}
                      onChange={(e) =>
                        set({ removedInVersionId: e.target.value })
                      }
                      value={row.removedInVersionId}
                    >
                      <option value="">—</option>
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.version}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <select
                      className={select}
                      onChange={(e) =>
                        set({ transformsFactionId: e.target.value })
                      }
                      value={row.transformsFactionId}
                    >
                      <option value="">—</option>
                      {factions
                        .filter((o) => o.kind === 'core' && o.id !== f?.id)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={`${small} w-16`}
                      onChange={(e) =>
                        set({ sortOrder: Number(e.target.value) })
                      }
                      type="number"
                      value={row.sortOrder}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <button
                      className={`${btn.secondary} px-3 py-1 text-xs`}
                      disabled={
                        !row.name.trim() || !row.code.trim() || save.isPending
                      }
                      onClick={() =>
                        save.mutate(
                          {
                            id: f?.id,
                            name: row.name,
                            code: row.code,
                            kind: row.kind,
                            introducedInVersionId: row.introducedInVersionId,
                            removedInVersionId: row.removedInVersionId || null,
                            transformsFactionId:
                              row.transformsFactionId || null,
                            sortOrder: row.sortOrder,
                          },
                          {
                            onSuccess: () =>
                              setDraft({ ...draft, [key]: undefined as never }),
                          },
                        )
                      }
                      type="button"
                    >
                      {f ? 'Guardar' : 'Añadir'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {save.error ? (
        <p className="text-(--ember) text-sm">{save.error.message}</p>
      ) : null}
    </section>
  );
};

const MapsEditor = ({
  data,
  gameId,
  onDone,
}: {
  data: Overview;
  gameId: string;
  onDone: () => void;
}) => {
  const versions = data.versions.filter((v) => v.gameId === gameId);
  const maps = data.maps.filter((m) => m.gameId === gameId);
  const save = api.wiki.upsertMap.useMutation({ onSuccess: onDone });
  const remove = api.wiki.deleteMap.useMutation({ onSuccess: onDone });
  type Row = {
    name: string;
    players: string;
    introducedInVersionId: string;
    description: string;
  };
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const rowFor = (m: (typeof maps)[number] | null): Row =>
    draft[m?.id ?? 'new'] ?? {
      name: m?.name ?? '',
      players: m?.players?.toString() ?? '',
      introducedInVersionId: m?.introducedInVersionId ?? '',
      description: m?.description ?? '',
    };
  return (
    <section className={`${panel} flex flex-col gap-3 p-5`}>
      <h3 className="d-display font-bold text-(--parchment) text-lg uppercase">
        Mapas
      </h3>
      <div className="flex flex-col gap-2">
        {[...maps, null].map((m) => {
          const key = m?.id ?? 'new';
          const row = rowFor(m);
          const set = (patch: Partial<Row>) =>
            setDraft({ ...draft, [key]: { ...row, ...patch } });
          return (
            <div
              className="grid items-end gap-2 sm:grid-cols-[1fr_5rem_8rem_2fr_auto_auto]"
              key={key}
            >
              <input
                className={small}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={m ? '' : 'Nuevo mapa'}
                value={row.name}
              />
              <input
                className={small}
                onChange={(e) => set({ players: e.target.value })}
                placeholder="Jug."
                type="number"
                value={row.players}
              />
              <select
                className={select}
                onChange={(e) => set({ introducedInVersionId: e.target.value })}
                value={row.introducedInVersionId}
              >
                <option value="">Desde siempre</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version}
                  </option>
                ))}
              </select>
              <input
                className={small}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Descripción"
                value={row.description}
              />
              <button
                className={`${btn.secondary} px-3 py-1 text-xs`}
                disabled={!row.name.trim() || save.isPending}
                onClick={() =>
                  save.mutate(
                    {
                      id: m?.id,
                      gameId,
                      name: row.name,
                      players: numberOrNull(row.players),
                      introducedInVersionId: row.introducedInVersionId || null,
                      description: row.description || null,
                    },
                    {
                      onSuccess: () =>
                        setDraft({ ...draft, [key]: undefined as never }),
                    },
                  )
                }
                type="button"
              >
                {m ? 'Guardar' : 'Añadir'}
              </button>
              {m ? (
                <button
                  className={`${btn.ghost} px-2 text-xs`}
                  onClick={() => remove.mutate({ id: m.id })}
                  type="button"
                >
                  Quitar
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

type HeroRow = {
  name: string;
  title: string;
  recruitedAt: string;
  cost: string;
  buildTimeSeconds: string;
  health: string;
  armourSet: string;
  attackType: string;
  isSummon: string;
  description: string;
  abilities: string;
  stats: string;
  imageUrl: string;
  portraitUrl: string;
};
type UnitRow = {
  name: string;
  category: string;
  recruitedAt: string;
  requirements: string;
  cost: string;
  commandPoints: string;
  health: string;
  buildTimeSeconds: string;
  armourSet: string;
  attackType: string;
  maxCount: string;
  isSummon: string;
  strongAgainst: string;
  weakAgainst: string;
  description: string;
  abilities: string;
  upgrades: string;
  stats: string;
  imageUrl: string;
  portraitUrl: string;
};
type StructureRow = {
  name: string;
  kind: string;
  cost: string;
  buildTimeSeconds: string;
  health: string;
  healthByLevel: string;
  armourSet: string;
  maxCount: string;
  bonus: string;
  produces: string;
  description: string;
  upgrades: string;
  abilities: string;
  stats: string;
  imageUrl: string;
};
type PowerRow = {
  name: string;
  tier: string;
  cost: string;
  position: string;
  kind: string;
  requires: string;
  description: string;
  stats: string;
  imageUrl: string;
};

type RevisionForm = {
  summary: string;
  overview: string;
  strengths: string;
  weaknesses: string;
  changes: string;
  ringHero: string;
  sourceUrl: string;
  heroes: HeroRow[];
  units: UnitRow[];
  structures: StructureRow[];
  powers: PowerRow[];
};

const emptyForm = (): RevisionForm => ({
  summary: '',
  overview: '',
  strengths: '',
  weaknesses: '',
  changes: '',
  ringHero: '',
  sourceUrl: '',
  heroes: [],
  units: [],
  structures: [],
  powers: [],
});

const emptyHero: HeroRow = {
  name: '',
  title: '',
  recruitedAt: '',
  cost: '',
  buildTimeSeconds: '',
  health: '',
  armourSet: '',
  attackType: '',
  isSummon: 'no',
  description: '',
  abilities: '[]',
  stats: '{}',
  imageUrl: '',
  portraitUrl: '',
};
const emptyUnit: UnitRow = {
  name: '',
  category: 'swordsmen',
  recruitedAt: '',
  requirements: '',
  cost: '',
  commandPoints: '',
  health: '',
  buildTimeSeconds: '',
  armourSet: '',
  attackType: '',
  maxCount: '',
  isSummon: 'no',
  strongAgainst: '',
  weakAgainst: '',
  description: '',
  abilities: '[]',
  upgrades: '[]',
  stats: '{}',
  imageUrl: '',
  portraitUrl: '',
};
const emptyStructure: StructureRow = {
  name: '',
  kind: 'production',
  cost: '',
  buildTimeSeconds: '',
  health: '',
  healthByLevel: '',
  armourSet: '',
  maxCount: '',
  bonus: '',
  produces: '',
  description: '',
  upgrades: '[]',
  abilities: '[]',
  stats: '{}',
  imageUrl: '',
};
const emptyPower: PowerRow = {
  name: '',
  tier: '',
  cost: '',
  position: 'L',
  kind: 'buff',
  requires: '',
  description: '',
  stats: '{}',
  imageUrl: '',
};

const str = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '' : String(value);
const json = (value: unknown) => JSON.stringify(value, null, 1);
const list = (text: string) =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
/** JSON columns (abilities, upgrades, stats) are edited raw; the server validates their shape. */
const parseJson = <T,>(text: string, fallback: T): T => {
  try {
    return text.trim() ? (JSON.parse(text) as T) : fallback;
  } catch {
    throw new Error(`JSON inválido: ${text.slice(0, 40)}…`);
  }
};
const urlOrNull = (text: string) => (text.trim() ? text.trim() : null);
const yes = (text: string) => text === 'sí';

const JSON_HINT = 'JSON';
const ABILITY_HINT =
  'Habilidades (JSON: [{name, level, hotkey, kind: active|passive|leadership|toggle|formation, description, stats?}])';
const UPGRADE_HINT =
  'Mejoras (JSON: [{name, cost, hotkey, level, description, stats?}])';

const RevisionEditor = ({
  data,
  gameId,
  onDone,
}: {
  data: Overview;
  gameId: string;
  onDone: () => void;
}) => {
  const versions = data.versions.filter((v) => v.gameId === gameId);
  const versionIds = new Set(versions.map((v) => v.id));
  const factions = data.factions.filter((f) =>
    versionIds.has(f.introducedInVersionId),
  );
  const [factionId, setFactionId] = useState('');
  const [versionId, setVersionId] = useState('');
  const revision = api.wiki.revision.useQuery(
    { factionId, gameVersionId: versionId },
    { enabled: Boolean(factionId && versionId) },
  );
  const [form, setForm] = useState<RevisionForm>(emptyForm());
  const [loadedKey, setLoadedKey] = useState('');
  useEffect(() => {
    const key = `${factionId}:${versionId}:${revision.dataUpdatedAt}`;
    if (!factionId || !versionId || revision.isPending || loadedKey === key)
      return;
    const r = revision.data;
    setForm(
      r
        ? {
            summary: r.summary ?? '',
            overview: r.overview ?? '',
            strengths: r.strengths.join('\n'),
            weaknesses: r.weaknesses.join('\n'),
            changes: r.changes ?? '',
            ringHero: r.ringHero ?? '',
            sourceUrl: r.sourceUrl ?? '',
            heroes: r.heroes.map((h) => ({
              name: h.name,
              title: h.title ?? '',
              recruitedAt: h.recruitedAt ?? '',
              cost: str(h.cost),
              buildTimeSeconds: str(h.buildTimeSeconds),
              health: str(h.health),
              armourSet: h.armourSet ?? '',
              attackType: h.attackType ?? '',
              isSummon: h.isSummon ? 'sí' : 'no',
              description: h.description ?? '',
              abilities: json(h.abilities),
              stats: json(h.stats),
              imageUrl: h.imageUrl ?? '',
              portraitUrl: h.portraitUrl ?? '',
            })),
            units: r.units.map((u) => ({
              name: u.name,
              category: u.category,
              recruitedAt: u.recruitedAt ?? '',
              requirements: u.requirements ?? '',
              cost: str(u.cost),
              commandPoints: str(u.commandPoints),
              health: str(u.health),
              buildTimeSeconds: str(u.buildTimeSeconds),
              armourSet: u.armourSet ?? '',
              attackType: u.attackType ?? '',
              maxCount: str(u.maxCount),
              isSummon: u.isSummon ? 'sí' : 'no',
              strongAgainst: u.strongAgainst.join(', '),
              weakAgainst: u.weakAgainst.join(', '),
              description: u.description ?? '',
              abilities: json(u.abilities),
              upgrades: json(u.upgrades),
              stats: json(u.stats),
              imageUrl: u.imageUrl ?? '',
              portraitUrl: u.portraitUrl ?? '',
            })),
            structures: r.structures.map((s) => ({
              name: s.name,
              kind: s.kind ?? 'production',
              cost: str(s.cost),
              buildTimeSeconds: str(s.buildTimeSeconds),
              health: str(s.health),
              healthByLevel: s.healthByLevel.join(', '),
              armourSet: s.armourSet ?? '',
              maxCount: str(s.maxCount),
              bonus: s.bonus ?? '',
              produces: s.produces.join(', '),
              description: s.description ?? '',
              upgrades: json(s.upgrades),
              abilities: json(s.abilities),
              stats: json(s.stats),
              imageUrl: s.imageUrl ?? '',
            })),
            powers: r.powers.map((p) => ({
              name: p.name,
              tier: str(p.tier),
              cost: str(p.cost),
              position: p.position ?? 'L',
              kind: p.kind ?? 'buff',
              requires: p.requires.join(', '),
              description: p.description ?? '',
              stats: json(p.stats),
              imageUrl: p.imageUrl ?? '',
            })),
          }
        : emptyForm(),
    );
    setLoadedKey(key);
  }, [
    factionId,
    versionId,
    revision.data,
    revision.isPending,
    revision.dataUpdatedAt,
    loadedKey,
  ]);
  const save = api.wiki.saveRevision.useMutation({
    onSuccess: () => {
      revision.refetch();
      onDone();
    },
  });
  const remove = api.wiki.deleteRevision.useMutation({
    onSuccess: () => {
      setForm(emptyForm());
      revision.refetch();
      onDone();
    },
  });
  const hasRevision = (fid: string, vid: string) =>
    data.revisions.some((r) => r.factionId === fid && r.gameVersionId === vid);
  const lines = (text: string) =>
    text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

  const [formError, setFormError] = useState<string | null>(null);
  const submit = () => {
    setFormError(null);
    try {
      save.mutate({
        factionId,
        gameVersionId: versionId,
        summary: form.summary || null,
        overview: form.overview || null,
        strengths: lines(form.strengths),
        weaknesses: lines(form.weaknesses),
        changes: form.changes || null,
        ringHero: form.ringHero || null,
        sourceUrl: form.sourceUrl || null,
        heroes: form.heroes
          .filter((h) => h.name.trim())
          .map((h) => ({
            name: h.name,
            title: h.title || null,
            recruitedAt: h.recruitedAt || null,
            cost: numberOrNull(h.cost),
            buildTimeSeconds: numberOrNull(h.buildTimeSeconds),
            health: numberOrNull(h.health),
            armourSet: h.armourSet || null,
            attackType: h.attackType || null,
            isSummon: yes(h.isSummon),
            description: h.description || null,
            abilities: parseJson(h.abilities, []),
            stats: parseJson(h.stats, {}),
            imageUrl: urlOrNull(h.imageUrl),
            portraitUrl: urlOrNull(h.portraitUrl),
          })),
        units: form.units
          .filter((u) => u.name.trim())
          .map((u) => ({
            name: u.name,
            category: u.category as 'swordsmen',
            recruitedAt: u.recruitedAt || null,
            requirements: u.requirements || null,
            cost: numberOrNull(u.cost),
            commandPoints: numberOrNull(u.commandPoints),
            health: numberOrNull(u.health),
            buildTimeSeconds: numberOrNull(u.buildTimeSeconds),
            armourSet: u.armourSet || null,
            attackType: u.attackType || null,
            maxCount: numberOrNull(u.maxCount),
            isSummon: yes(u.isSummon),
            strongAgainst: list(u.strongAgainst) as 'cavalry'[],
            weakAgainst: list(u.weakAgainst) as 'cavalry'[],
            description: u.description || null,
            abilities: parseJson(u.abilities, []),
            upgrades: parseJson(u.upgrades, []),
            stats: parseJson(u.stats, {}),
            imageUrl: urlOrNull(u.imageUrl),
            portraitUrl: urlOrNull(u.portraitUrl),
          })),
        structures: form.structures
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name,
            kind: (s.kind || null) as 'production' | null,
            cost: numberOrNull(s.cost),
            buildTimeSeconds: numberOrNull(s.buildTimeSeconds),
            health: numberOrNull(s.health),
            healthByLevel: list(s.healthByLevel).map(Number),
            armourSet: s.armourSet || null,
            maxCount: numberOrNull(s.maxCount),
            description: s.description || null,
            bonus: s.bonus || null,
            produces: list(s.produces),
            upgrades: parseJson(s.upgrades, []),
            abilities: parseJson(s.abilities, []),
            stats: parseJson(s.stats, {}),
            imageUrl: urlOrNull(s.imageUrl),
          })),
        powers: form.powers
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name,
            tier: numberOrNull(p.tier),
            cost: numberOrNull(p.cost),
            position: (p.position || null) as 'L' | null,
            kind: (p.kind || null) as 'buff' | null,
            requires: list(p.requires),
            description: p.description || null,
            stats: parseJson(p.stats, {}),
            imageUrl: urlOrNull(p.imageUrl),
          })),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className={`${panelGold} flex flex-col gap-4 p-5`}>
      <h3 className="d-display font-bold text-(--parchment) text-lg uppercase">
        Ficha de facción por versión
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={field}>
          <span className={label}>Facción</span>
          <select
            className={select}
            onChange={(e) => setFactionId(e.target.value)}
            value={factionId}
          >
            <option value="">Elegir…</option>
            {factions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.kind === 'alternate' ? ' (alt.)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className={field}>
          <span className={label}>Vale desde la versión</span>
          <select
            className={select}
            onChange={(e) => setVersionId(e.target.value)}
            value={versionId}
          >
            <option value="">Elegir…</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.version}
                {factionId && hasRevision(factionId, v.id)
                  ? ' · tiene ficha'
                  : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {factionId && versionId ? (
        <>
          <p className="text-(--faded) text-xs">
            {hasRevision(factionId, versionId)
              ? 'Editando la ficha propia de esta versión.'
              : 'Esta versión hereda la ficha anterior (si la hay). Al guardar, creas una ficha propia que vale desde aquí.'}
          </p>
          <div className={field}>
            <span className={label}>Resumen (una frase)</span>
            <input
              className={small}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              value={form.summary}
            />
          </div>
          <div className={field}>
            <span className={label}>Descripción (párrafos)</span>
            <textarea
              className={area}
              onChange={(e) => setForm({ ...form, overview: e.target.value })}
              value={form.overview}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={field}>
              <span className={label}>Puntos fuertes (uno por línea)</span>
              <textarea
                className={area}
                onChange={(e) =>
                  setForm({ ...form, strengths: e.target.value })
                }
                value={form.strengths}
              />
            </div>
            <div className={field}>
              <span className={label}>Puntos débiles (uno por línea)</span>
              <textarea
                className={area}
                onChange={(e) =>
                  setForm({ ...form, weaknesses: e.target.value })
                }
                value={form.weaknesses}
              />
            </div>
          </div>
          <div className={field}>
            <span className={label}>
              Qué cambia respecto a la ficha anterior (párrafos)
            </span>
            <textarea
              className={area}
              onChange={(e) => setForm({ ...form, changes: e.target.value })}
              value={form.changes}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={field}>
              <span className={label}>Héroe del Anillo</span>
              <input
                className={small}
                onChange={(e) => setForm({ ...form, ringHero: e.target.value })}
                value={form.ringHero}
              />
            </div>
            <div className={field}>
              <span className={label}>Fuente (URL)</span>
              <input
                className={small}
                onChange={(e) =>
                  setForm({ ...form, sourceUrl: e.target.value })
                }
                value={form.sourceUrl}
              />
            </div>
          </div>

          <RowsEditor
            columns={[
              { key: 'name', text: 'Héroe' },
              { key: 'title', text: 'Título' },
              { key: 'recruitedAt', text: 'Dónde' },
              { key: 'cost', text: 'Coste', number: true },
              { key: 'buildTimeSeconds', text: 'Tiempo (s)', number: true },
              { key: 'health', text: 'Vida', number: true },
              { key: 'armourSet', text: 'Armadura' },
              { key: 'attackType', text: 'Ataque' },
              { key: 'isSummon', text: 'Invocado', options: ['no', 'sí'] },
              { key: 'imageUrl', text: 'Imagen (URL)' },
              { key: 'portraitUrl', text: 'Retrato (URL)' },
              { key: 'description', text: 'Descripción', wide: true },
              {
                key: 'abilities',
                text: ABILITY_HINT,
                wide: true,
                multiline: true,
              },
              { key: 'stats', text: `Números (${JSON_HINT})`, multiline: true },
            ]}
            empty={emptyHero}
            onChange={(rows) => setForm({ ...form, heroes: rows })}
            rows={form.heroes}
            title="Héroes"
          />
          <RowsEditor
            columns={[
              { key: 'name', text: 'Unidad' },
              {
                key: 'category',
                text: 'Tipo',
                options: [
                  'swordsmen',
                  'pikemen',
                  'archers',
                  'cavalry',
                  'siege',
                  'monster',
                  'heroic',
                  'special',
                ],
              },
              { key: 'recruitedAt', text: 'Dónde' },
              { key: 'requirements', text: 'Requisitos' },
              { key: 'cost', text: 'Coste', number: true },
              { key: 'commandPoints', text: 'PM', number: true },
              { key: 'health', text: 'Vida', number: true },
              { key: 'buildTimeSeconds', text: 'Tiempo (s)', number: true },
              { key: 'armourSet', text: 'Armadura' },
              { key: 'attackType', text: 'Ataque' },
              { key: 'maxCount', text: 'Límite', number: true },
              { key: 'isSummon', text: 'Invocada', options: ['no', 'sí'] },
              { key: 'strongAgainst', text: 'Fuerte contra (tags, coma)' },
              { key: 'weakAgainst', text: 'Débil contra (tags, coma)' },
              { key: 'imageUrl', text: 'Imagen (URL)' },
              { key: 'portraitUrl', text: 'Retrato (URL)' },
              { key: 'description', text: 'Descripción', wide: true },
              {
                key: 'abilities',
                text: ABILITY_HINT,
                wide: true,
                multiline: true,
              },
              {
                key: 'upgrades',
                text: UPGRADE_HINT,
                wide: true,
                multiline: true,
              },
              { key: 'stats', text: `Números (${JSON_HINT})`, multiline: true },
            ]}
            empty={emptyUnit}
            onChange={(rows) => setForm({ ...form, units: rows })}
            rows={form.units}
            title="Unidades"
          />
          <RowsEditor
            columns={[
              { key: 'name', text: 'Estructura' },
              {
                key: 'kind',
                text: 'Tipo',
                options: [
                  'fortress',
                  'economy',
                  'production',
                  'defence',
                  'support',
                  'summoned',
                ],
              },
              { key: 'cost', text: 'Coste', number: true },
              { key: 'buildTimeSeconds', text: 'Tiempo (s)', number: true },
              { key: 'health', text: 'Vida', number: true },
              { key: 'healthByLevel', text: 'Vida por nivel (coma)' },
              { key: 'armourSet', text: 'Armadura' },
              { key: 'maxCount', text: 'Límite', number: true },
              { key: 'bonus', text: 'Bonus' },
              { key: 'produces', text: 'Recluta (nombres, coma)' },
              { key: 'imageUrl', text: 'Imagen (URL)' },
              { key: 'description', text: 'Descripción', wide: true },
              {
                key: 'upgrades',
                text: UPGRADE_HINT,
                wide: true,
                multiline: true,
              },
              {
                key: 'abilities',
                text: ABILITY_HINT,
                wide: true,
                multiline: true,
              },
              { key: 'stats', text: `Números (${JSON_HINT})`, multiline: true },
            ]}
            empty={emptyStructure}
            onChange={(rows) => setForm({ ...form, structures: rows })}
            rows={form.structures}
            title="Estructuras"
          />
          <RowsEditor
            columns={[
              { key: 'name', text: 'Poder' },
              { key: 'tier', text: 'Nivel', number: true },
              { key: 'cost', text: 'PP', number: true },
              {
                key: 'position',
                text: 'Posición',
                options: ['L', 'C', 'R', 'LL', 'LR', 'RL', 'RR'],
              },
              {
                key: 'kind',
                text: 'Tipo',
                options: [
                  'buff',
                  'debuff',
                  'summon',
                  'heal',
                  'utility',
                  'attack',
                ],
              },
              { key: 'requires', text: 'Requiere (nombres, coma)' },
              { key: 'imageUrl', text: 'Icono (URL)' },
              { key: 'description', text: 'Descripción', wide: true },
              { key: 'stats', text: `Números (${JSON_HINT})`, multiline: true },
            ]}
            empty={emptyPower}
            onChange={(rows) => setForm({ ...form, powers: rows })}
            rows={form.powers}
            title="Libro de poderes"
          />

          <div className="flex flex-wrap gap-3">
            <button
              className={btn.primary}
              disabled={save.isPending}
              onClick={submit}
              type="button"
            >
              {save.isPending ? 'Guardando…' : 'Guardar la ficha'}
            </button>
            {hasRevision(factionId, versionId) ? (
              <button
                className={btn.danger}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ factionId, gameVersionId: versionId })
                }
                type="button"
              >
                Borrar esta ficha
              </button>
            ) : null}
          </div>
          {formError || save.error ? (
            <p className="text-(--ember) text-sm">
              {formError ?? save.error?.message}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
};

type Column = {
  key: string;
  text: string;
  number?: boolean;
  wide?: boolean;
  multiline?: boolean;
  options?: string[];
};

/** A small table of editable rows with add/remove/move. */
const RowsEditor = <Row extends Record<string, string>>({
  title,
  columns,
  rows,
  empty,
  onChange,
}: {
  title: string;
  columns: Column[];
  rows: Row[];
  empty: Row;
  onChange: (rows: Row[]) => void;
}) => {
  const update = (index: number, key: string, value: string) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  const move = (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target] as Row, next[index] as Row];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={label}>
          {title} · {rows.length}
        </span>
        <button
          className={`${btn.secondary} px-3 py-1 text-xs`}
          onClick={() => onChange([...rows, { ...empty }])}
          type="button"
        >
          Añadir fila
        </button>
      </div>
      {rows.map((row, index) => (
        <div
          className="grid grid-cols-2 gap-1.5 rounded-lg border border-(--hair) p-2 sm:grid-cols-4" // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional while editing.
          key={index}
        >
          {columns.map((col) => (
            <div
              className={`${field} ${col.wide ? 'col-span-2 sm:col-span-4' : ''}`}
              key={col.key}
            >
              <span className="font-mono text-(--faded) text-3xs uppercase">
                {col.text}
              </span>
              {col.options ? (
                <select
                  className={select}
                  onChange={(e) => update(index, col.key, e.target.value)}
                  value={row[col.key] ?? ''}
                >
                  {col.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : col.multiline ? (
                <textarea
                  className={`${area} min-h-16`}
                  onChange={(e) => update(index, col.key, e.target.value)}
                  value={row[col.key] ?? ''}
                />
              ) : (
                <input
                  className={small}
                  onChange={(e) => update(index, col.key, e.target.value)}
                  type={col.number ? 'number' : 'text'}
                  value={row[col.key] ?? ''}
                />
              )}
            </div>
          ))}
          <div className="col-span-2 flex gap-1 sm:col-span-4">
            <button
              className={`${btn.ghost} px-2 text-xs`}
              onClick={() => move(index, -1)}
              type="button"
            >
              ↑
            </button>
            <button
              className={`${btn.ghost} px-2 text-xs`}
              onClick={() => move(index, 1)}
              type="button"
            >
              ↓
            </button>
            <button
              className={`${btn.ghost} ml-auto px-2 text-(--ember) text-xs`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              type="button"
            >
              Quitar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export { WikiAdmin };
