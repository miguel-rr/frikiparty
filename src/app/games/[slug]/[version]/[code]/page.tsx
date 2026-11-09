import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  btn,
  panel,
  panelGold,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { ArmySection, ArmyViewSwitch } from '@/components/wiki/army-section';
import {
  BuildingView,
  heading,
  subheading,
} from '@/components/wiki/army-views';
import { FactionEmblem } from '@/components/wiki/faction-emblem';
import { FactionGuide } from '@/components/wiki/faction-guide';
import { FactionSwitcher } from '@/components/wiki/faction-switcher';
import { HeroCard } from '@/components/wiki/hero-card';
import { Prose } from '@/components/wiki/prose';
import { SpellbookTree } from '@/components/wiki/spellbook-tree';
import { WikiImage } from '@/components/wiki/wiki-image';
import { factionSlug } from '@/lib/wiki/faction-slug';
import { factionGuideOf, factionVideosOf, guidesOf } from '@/lib/wiki/guides';
import { db } from '@/server/db';
import { getFactionPage, listWikiParams } from '@/server/wiki/queries';

import { loadTypeView } from './actions';

type Params = Promise<{ slug: string; version: string; code: string }>;

/**
 * Every faction of every version, built up front (redeploy to refresh). The
 * page carries the default "Por edificio" view; "Por tipo" loads on demand.
 */
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

/**
 * A faction as it was in a version: the revision that applies (its own,
 * or inherited from an earlier version), with every hero, unit, structure
 * and the spellbook tree. The version switcher keeps the faction and
 * changes the version.
 */
const FactionPage = async ({ params }: { params: Params }) => {
  const { slug, version, code } = await params;
  // Old camelCase links (`battleOfFiveArmies`) move to the hyphenated slug.
  if (factionSlug(code) !== code)
    permanentRedirect(`/games/${slug}/${version}/${factionSlug(code)}`);
  const page = await getFactionPage(db, slug, version, code);
  if (!page) notFound();
  const { faction, revision } = page;
  const heroes = page.heroes.filter((h) => !h.isSummon);
  const summonedHeroes = page.heroes.filter((h) => h.isSummon);
  // 10.0 portraits were cropped from the game's own textures.
  const imagesFromGame = [...page.units, ...page.heroes].some((x) =>
    x.portraitUrl?.includes('/aotr-10/'),
  );
  // "Cómo jugarla": hand-written guide (core factions) and videos.
  const guide = factionGuideOf(slug, faction.code);
  const videos = factionVideosOf(slug, faction.code);
  const hasGuide = guide !== null || videos.length > 0;
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
              <FactionSwitcher
                currentCode={faction.code ?? ''}
                factions={page.siblings}
                slug={slug}
                version={version}
              />
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
                {hasGuide ? (
                  <a className={btn.outline} href="#guide">
                    Cómo jugarla
                  </a>
                ) : null}
                {(
                  [
                    ['#heroes', 'Héroes', page.heroes.length],
                    [
                      '#army',
                      'Edificios y unidades',
                      page.structures.length + page.units.length,
                    ],
                    ['#spellbook', 'Árbol de poderes', page.powers.length],
                  ] as const
                )
                  .filter(([, , n]) => n > 0)
                  .map(([href, text, n]) => (
                    <a className={btn.outline} href={href} key={href}>
                      {text} · {n}
                    </a>
                  ))}
              </nav>

              <FactionGuide
                currentVersion={guidesOf(slug)?.start.version ?? version}
                guide={guide}
                slug={slug}
                videos={videos}
              />

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

              {page.units.length + page.structures.length > 0 ? (
                <ArmySection
                  building={
                    <BuildingView
                      structures={page.structures}
                      switcher={<ArmyViewSwitch />}
                      units={page.units}
                    />
                  }
                  loadTypeView={loadTypeView.bind(null, slug, version, code)}
                />
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
                  {imagesFromGame
                    ? 'y los ficheros del juego, de donde salen las imágenes.'
                    : 'y la wiki de la comunidad (CC BY-SA), de donde salen las imágenes.'}{' '}
                  Los textos son nuestros.
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
