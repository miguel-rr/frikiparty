import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  btn,
  panel,
  panelGold,
  Section,
  SectionHeader,
  tag,
  td,
  th,
} from '@/components/theme/primitives';
import { FactionEmblem } from '@/components/wiki/faction-emblem';
import { HeroCard } from '@/components/wiki/hero-card';
import { Prose } from '@/components/wiki/prose';
import { SpellbookTree } from '@/components/wiki/spellbook-tree';
import { StructureCard } from '@/components/wiki/structure-card';
import { UnitCard } from '@/components/wiki/unit-card';
import { WikiImage } from '@/components/wiki/wiki-image';
import { CATEGORY_LABELS, STRUCTURE_KIND_LABELS } from '@/lib/wiki/labels';
import type { StructureKind } from '@/lib/wiki/types';
import { db } from '@/server/db';
import type { UnitCategory } from '@/server/db/schema';
import {
  type FactionPageData,
  getFactionPage,
  listWikiParams,
} from '@/server/wiki/queries';

type Params = Promise<{ slug: string; version: string; code: string }>;

export const generateStaticParams = async () =>
  (await listWikiParams(db))
    .filter((p) => p.code)
    .map((p) => ({
      slug: p.slug,
      version: p.version as string,
      code: p.code as string,
    }));

export const generateMetadata = async ({
  params,
}: {
  params: Params;
}): Promise<Metadata> => {
  const { slug, version, code } = await params;
  const page = await getFactionPage(db, slug, version, code);
  return {
    title: page
      ? `${page.faction.name} · ${page.game.name} ${version} — Frikiparty`
      : 'Facción — Frikiparty',
  };
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
 * A faction as it was in a version: the revision that applies (its own,
 * or inherited from an earlier version), with every hero, unit, structure
 * and the spellbook tree. The version switcher keeps the faction and
 * changes the version.
 */
const FactionPage = async ({ params }: { params: Params }) => {
  const { slug, version, code } = await params;
  const page = await getFactionPage(db, slug, version, code);
  if (!page) notFound();
  const { faction, revision } = page;
  const recruited = page.units.filter((u) => !u.isSummon);
  const summoned = page.units.filter((u) => u.isSummon);
  const heroes = page.heroes.filter((h) => !h.isSummon);
  const summonedHeroes = page.heroes.filter((h) => h.isSummon);
  return (
    <SiteShell>
      <main>
        <Section id="faction">
          <div className="flex flex-col items-center gap-4 text-center">
            {faction.imageUrl ? (
              <WikiImage
                alt=""
                className="size-28 object-contain drop-shadow-[0_0_18px_rgba(201,165,87,0.35)]"
                src={faction.imageUrl}
              />
            ) : (
              <FactionEmblem
                className="text-(--gold)"
                code={faction.code}
                size={96}
              />
            )}
            <SectionHeader
              eyebrowHref={`/games/${slug}/${version}`}
              eyebrowText={`${page.game.name} · ${version}`}
              lead={revision?.summary ?? undefined}
              title={faction.name}
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              {faction.kind === 'alternate' ? (
                <span className={tag}>
                  Facción alternativa
                  {faction.transforms
                    ? ` · transforma a ${faction.transforms.name}`
                    : ''}
                </span>
              ) : null}
              {revision?.ringHero ? (
                <span className={tag}>
                  Héroe del Anillo: {revision.ringHero}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {page.versionsWithFaction.map((v) => (
                <Link
                  className={`${btn.outline} ${v.version === version ? 'border-(--gold) text-(--gold-hi)' : ''}`}
                  href={`/games/${slug}/${v.version}/${code}`}
                  key={v.id}
                  title={
                    page.revisionVersions.includes(v.version)
                      ? 'Tiene ficha propia'
                      : 'Hereda la ficha anterior'
                  }
                >
                  {v.version}
                  {page.revisionVersions.includes(v.version) ? '' : ' ↩'}
                </Link>
              ))}
            </div>
            {revision?.inherited ? (
              <p className="text-(--faded) text-xs">
                En la {version} esta facción no cambió: se muestra la ficha
                escrita para la {revision.version}.
              </p>
            ) : null}
          </div>

          {!revision ? (
            <p className="text-center text-(--faded)">
              Esta facción aún no tiene ficha para esta versión.
            </p>
          ) : (
            <>
              <Prose
                className="mx-auto max-w-[68ch]"
                text={revision.overview}
              />

              {(revision.strengths.length > 0 ||
                revision.weaknesses.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={`${panel} p-4`}>
                    <span className="font-mono text-(--moss) text-2xs uppercase tracking-2xl">
                      Puntos fuertes
                    </span>
                    <ul className="mt-2 list-inside list-disc text-(--parchment) text-sm">
                      {revision.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className={`${panel} p-4`}>
                    <span className="font-mono text-(--ember) text-2xs uppercase tracking-2xl">
                      Puntos débiles
                    </span>
                    <ul className="mt-2 list-inside list-disc text-(--parchment) text-sm">
                      {revision.weaknesses.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {revision.changes ? (
                <div className={`${panelGold} flex flex-col gap-2 p-5`}>
                  <span className="font-mono text-(--gold) text-2xs uppercase tracking-2xl">
                    Qué cambia en la {revision.version}
                  </span>
                  <Prose className="text-sm" text={revision.changes} />
                </div>
              ) : null}

              <nav className="flex flex-wrap justify-center gap-2">
                {[
                  ['#heroes', 'Héroes', page.heroes.length],
                  ['#units', 'Unidades', page.units.length],
                  ['#structures', 'Estructuras', page.structures.length],
                  ['#spellbook', 'Árbol de poderes', page.powers.length],
                ]
                  .filter(([, , n]) => (n as number) > 0)
                  .map(([href, text, n]) => (
                    <a
                      className={btn.outline}
                      href={href as string}
                      key={href as string}
                    >
                      {text} · {n}
                    </a>
                  ))}
              </nav>

              {page.heroes.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <h3 className={heading} id="heroes">
                    Héroes
                  </h3>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {heroes.map((h) => (
                      <HeroCard
                        hero={h}
                        key={h.id}
                        ringHero={h.name === revision.ringHero}
                      />
                    ))}
                  </ul>
                  {summonedHeroes.length > 0 ? (
                    <>
                      <span className={subheading}>
                        Llegan por el libro de poderes
                      </span>
                      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {summonedHeroes.map((h) => (
                          <HeroCard hero={h} key={h.id} ringHero={false} />
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}

              {page.units.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <h3 className={heading} id="units">
                    Unidades
                  </h3>
                  <UnitsSummary units={recruited} />
                  {CATEGORY_ORDER.map((category) => {
                    const group = recruited.filter(
                      (u) => u.category === category,
                    );
                    if (group.length === 0) return null;
                    return (
                      <div className="flex flex-col gap-3" key={category}>
                        <span className={subheading}>
                          {CATEGORY_LABELS[category]}
                        </span>
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {group.map((u) => (
                            <UnitCard key={u.id} unit={u} />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
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

              {page.structures.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <h3 className={heading} id="structures">
                    Estructuras
                  </h3>
                  {STRUCTURE_ORDER.map((kind) => {
                    const group = page.structures.filter(
                      (s) => (s.kind ?? 'production') === kind,
                    );
                    if (group.length === 0) return null;
                    return (
                      <div className="flex flex-col gap-3" key={kind}>
                        <span className={subheading}>
                          {STRUCTURE_KIND_LABELS[kind]}
                        </span>
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {group.map((s) => (
                            <StructureCard key={s.id} structure={s} />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {page.powers.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <h3 className={heading} id="spellbook">
                    Árbol de poderes
                  </h3>
                  <SpellbookTree powers={page.powers} />
                </div>
              ) : null}

              {revision.sourceUrl ? (
                <p className="text-center text-(--faded) text-xs">
                  Datos contrastados con{' '}
                  <a
                    className="underline hover:text-(--gold-hi)"
                    href={revision.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    las notas del mod
                  </a>{' '}
                  y la wiki de la comunidad (CC BY-SA), de donde salen las
                  imágenes. Los textos son nuestros.
                </p>
              ) : null}
            </>
          )}
        </Section>
      </main>
    </SiteShell>
  );
};

export default FactionPage;
