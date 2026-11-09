import type { ReactNode } from 'react';

import { panel, td, th } from '@/components/theme/primitives';
import { type CardGroup, CardGroups } from '@/components/wiki/card-groups';
import { StructureCard } from '@/components/wiki/structure-card';
import { UnitCard } from '@/components/wiki/unit-card';
import { CATEGORY_LABELS, STRUCTURE_KIND_LABELS } from '@/lib/wiki/labels';
import type { StructureKind } from '@/lib/wiki/types';
import type { UnitCategory } from '@/server/db/schema';
import type { FactionPageData } from '@/server/wiki/queries';

type Army = {
  structures: FactionPageData['structures'];
  units: FactionPageData['units'];
  /** The "Por edificio · Por tipo" switch, placed under the summary table. */
  switcher: ReactNode;
};

const CATEGORY_ORDER: UnitCategory[] = [
  'swordsmen',
  'pikemen',
  'archers',
  'cavalry',
  'siege',
  'monster',
  'heroic',
  'special',
];

const STRUCTURE_ORDER: StructureKind[] = [
  'fortress',
  'economy',
  'production',
  'defence',
  'support',
  'summoned',
];

const heading =
  'd-display font-bold text-(--parchment) text-xl uppercase scroll-mt-24';
const subheading = 'font-mono text-(--gold) text-2xs uppercase tracking-2xl';

/** Health bought per 100 resources: the first number anyone compares. */
const healthPer100 = (u: { cost: number | null; health: number | null }) =>
  u.cost && u.health ? Math.round((u.health / u.cost) * 100) : null;

const UnitsSummary = ({ units }: { units: FactionPageData['units'] }) => (
  <div className={`${panel} overflow-x-auto`}>
    <table className="w-full min-w-140 border-collapse text-sm">
      <thead>
        <tr>
          <th className={th}>Unidad</th>
          <th className={th}>Tipo</th>
          <th className={`${th} text-right`}>Coste</th>
          <th className={`${th} text-right`}>PM</th>
          <th className={`${th} text-right`}>Vida</th>
          <th className={`${th} text-right`} title="Vida por cada 100 recursos">
            Vida/100
          </th>
        </tr>
      </thead>
      <tbody>
        {units.map((u) => (
          <tr key={u.id}>
            <td className={td}>
              <a
                className="text-(--parchment) hover:text-(--gold-hi)"
                href={`#u-${u.id}`}
              >
                {u.name}
              </a>
            </td>
            <td className={`${td} text-(--faded)`}>
              {CATEGORY_LABELS[u.category]}
            </td>
            <td className={`${td} text-right font-mono text-(--gold)`}>
              {u.cost ?? '—'}
            </td>
            <td className={`${td} text-right font-mono text-(--faded)`}>
              {u.commandPoints ?? '—'}
            </td>
            <td className={`${td} text-right font-mono text-(--faded)`}>
              {u.health ?? '—'}
            </td>
            <td className={`${td} text-right font-mono text-(--faded)`}>
              {healthPer100(u) ?? '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Each structure in build-menu order, followed by the units it trains (a
 * unit trained in two places shows under the first). Whatever no structure
 * trains (summons, inn units) closes the list.
 */
const BuildingView = ({ structures, units, switcher }: Army) => {
  const placed = new Set<string>();
  const groups: CardGroup[] = structures.map((s) => {
    const trained = units.filter(
      (u) => !u.isSummon && !placed.has(u.id) && s.produces.includes(u.name),
    );
    for (const u of trained) placed.add(u.id);
    const kind = STRUCTURE_KIND_LABELS[s.kind ?? 'production'];
    return {
      key: s.id,
      label: trained.length ? `${kind} · entrena ${trained.length}` : kind,
      cards: [
        <StructureCard key={s.id} structure={s} />,
        ...trained.map((u) => <UnitCard key={u.id} unit={u} />),
      ],
    };
  });
  const rest = units.filter((u) => !placed.has(u.id));
  groups.push({
    key: 'rest',
    label: 'Otras unidades · invocadas o de otros edificios',
    cards: rest.map((u) => <UnitCard key={u.id} unit={u} />),
  });
  const byId = new Map(units.map((u) => [u.id, u]));
  // The summary table follows the same order as the cards below it.
  const summary = [
    ...[...placed].flatMap((id) => byId.get(id) ?? []),
    ...rest.filter((u) => !u.isSummon),
  ];
  return (
    <>
      <h3 className={heading}>Edificios y unidades</h3>
      {summary.length > 0 ? <UnitsSummary units={summary} /> : null}
      {switcher}
      <CardGroups groups={groups} />
    </>
  );
};

/**
 * Units grouped by category (summons apart) and structures by kind. Not in
 * the static page: it is rendered on demand when the switch asks for it.
 */
const TypeView = ({ structures, units, switcher }: Army) => {
  const recruited = units.filter((u) => !u.isSummon);
  const summoned = units.filter((u) => u.isSummon);
  return (
    <>
      {units.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h3 className={heading} id="units">
            Unidades
          </h3>
          <UnitsSummary units={recruited} />
          {switcher}
          <CardGroups
            groups={CATEGORY_ORDER.map((category) => ({
              key: category,
              label: CATEGORY_LABELS[category],
              cards: recruited
                .filter((u) => u.category === category)
                .map((u) => <UnitCard key={u.id} unit={u} />),
            }))}
          />
          {summoned.length > 0 ? (
            <div className="flex flex-col gap-3">
              <span className={subheading}>Invocadas</span>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {summoned.map((u) => (
                  <UnitCard key={u.id} unit={u} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {structures.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h3 className={heading} id="structures">
            Estructuras
          </h3>
          {units.length === 0 ? switcher : null}
          <CardGroups
            fillGaps
            groups={STRUCTURE_ORDER.map((kind) => ({
              key: kind,
              label: STRUCTURE_KIND_LABELS[kind],
              cards: structures
                .filter((s) => (s.kind ?? 'production') === kind)
                .map((s) => <StructureCard key={s.id} structure={s} />),
            }))}
          />
        </div>
      ) : null}
    </>
  );
};

export { BuildingView, heading, subheading, TypeView };
