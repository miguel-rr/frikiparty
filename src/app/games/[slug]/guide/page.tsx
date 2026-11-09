import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  btn,
  panel,
  Section,
  SectionHeader,
  tag,
} from '@/components/theme/primitives';
import { heading } from '@/components/wiki/army-views';
import { GuideBlocks } from '@/components/wiki/guide-blocks';
import { factionSlug } from '@/lib/wiki/faction-slug';
import {
  DIFFICULTY_LABELS,
  gamesWithGuides,
  guidesOf,
} from '@/lib/wiki/guides';
import { db } from '@/server/db';
import { getGame } from '@/server/wiki/queries';

type Params = Promise<{ slug: string }>;

/** Built up front, one page per game with guides; redeploy to refresh. */
export const generateStaticParams = () =>
  gamesWithGuides().map((slug) => ({ slug }));

export const generateMetadata = async ({
  params,
}: {
  params: Params;
}): Promise<Metadata> => {
  const { slug } = await params;
  const g = await getGame(db, slug);
  return {
    title: g ? `Empieza aquí · ${g.name} — Frikiparty` : 'Guía — Frikiparty',
  };
};

/**
 * "Empieza aquí": the basics for people who play once a year, then one
 * card per core faction pointing at its "Cómo jugarla".
 */
const GuidePage = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const guides = guidesOf(slug);
  const g = await getGame(db, slug);
  if (!guides || !g) notFound();
  const { start } = guides;
  const latest = g.versions[0]?.version;
  const core = g.factions.filter((f) => f.kind === 'core' && f.code);
  return (
    <SiteShell>
      <main>
        <Section id="guide">
          <SectionHeader
            eyebrowHref={`/games/${slug}`}
            eyebrowText={g.name}
            lead={start.lead}
            title="Empieza aquí"
          />
          <div className="flex flex-wrap justify-center gap-2">
            <span className={tag}>Escrita para la {start.version}</span>
            <Link className={btn.outline} href={`/games/${slug}/videos`}>
              Vídeos
            </Link>
          </div>

          <nav className="flex flex-wrap justify-center gap-2">
            {start.sections.map((s) => (
              <a className={btn.outline} href={`#${s.id}`} key={s.id}>
                {s.title}
              </a>
            ))}
            <a className={btn.outline} href="#factions">
              Facciones
            </a>
          </nav>

          <div className="mx-auto flex w-full max-w-[72ch] flex-col gap-10">
            {start.sections.map((s) => (
              <div className="flex flex-col gap-4" key={s.id}>
                <h3 className={heading} id={s.id}>
                  {s.title}
                </h3>
                <GuideBlocks blocks={s.blocks} />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h3 className={heading} id="factions">
              Cómo jugar cada facción
            </h3>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {core.map((f) => {
                const code = f.code as string;
                const guide = guides.factions[code];
                return (
                  <li key={f.id}>
                    <Link
                      className={`${panel} flex h-full flex-col gap-2 p-4 transition-colors hover:border-(--gold)`}
                      href={
                        latest
                          ? `/games/${slug}/${latest}/${factionSlug(code)}#guide`
                          : `/games/${slug}`
                      }
                    >
                      <span className="d-display font-bold text-(--gold-hi) text-lg uppercase">
                        {f.name}
                      </span>
                      {guide ? (
                        <>
                          <span className="font-mono text-(--faded) text-2xs uppercase tracking-2xl">
                            {DIFFICULTY_LABELS[guide.difficulty]}
                          </span>
                          <span className="text-(--parchment)/90 text-sm">
                            {guide.style}
                          </span>
                        </>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default GuidePage;
