import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import { btn, Section, SectionHeader } from '@/components/theme/primitives';
import { heading } from '@/components/wiki/army-views';
import { VideoList } from '@/components/wiki/video-list';
import { factionSlug } from '@/lib/wiki/faction-slug';
import { gamesWithGuides, guidesOf } from '@/lib/wiki/guides';
import { db } from '@/server/db';
import { getGame } from '@/server/wiki/queries';

type Params = Promise<{ slug: string }>;

/** Built up front, one page per game with videos; redeploy to refresh. */
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
    title: g ? `Vídeos · ${g.name} — Frikiparty` : 'Vídeos — Frikiparty',
  };
};

/**
 * Hand-picked videos: the basics, one block per core faction, and full
 * matches to watch. Each card says its language and game version.
 */
const VideosPage = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const guides = guidesOf(slug);
  const g = await getGame(db, slug);
  if (!guides || !g) notFound();
  const currentVersion = guides.start.version;
  const latest = g.versions[0]?.version;
  const general = guides.videos.filter((v) => v.topic === 'general');
  const matches = guides.videos.filter((v) => v.topic === 'match');
  const core = g.factions
    .filter((f) => f.kind === 'core' && f.code)
    .map((f) => ({
      ...f,
      code: f.code as string,
      videos: guides.videos.filter(
        (v) => v.topic === 'faction' && v.faction === f.code,
      ),
    }))
    .filter((f) => f.videos.length > 0);
  return (
    <SiteShell>
      <main>
        <Section id="videos">
          <SectionHeader
            eyebrowHref={`/games/${slug}`}
            eyebrowText={g.name}
            lead="Vídeos elegidos para quien juega poco: primero lo básico, después cada facción y, al final, partidas enteras para ver jugar. Casi todos están en inglés: los que hay en castellano van siempre primero, y los de versiones anteriores lo avisan."
            title="Vídeos"
          />
          <nav className="flex flex-wrap justify-center gap-2">
            <Link className={btn.outline} href={`/games/${slug}/guide`}>
              Empieza aquí
            </Link>
            <a className={btn.outline} href="#basics">
              Lo básico
            </a>
            <a className={btn.outline} href="#factions">
              Por facción
            </a>
            <a className={btn.outline} href="#matches">
              Partidas
            </a>
          </nav>

          <div className="flex flex-col gap-4">
            <h3 className={heading} id="basics">
              Lo básico
            </h3>
            <VideoList currentVersion={currentVersion} videos={general} />
          </div>

          <div className="flex flex-col gap-8">
            <h3 className={heading} id="factions">
              Por facción
            </h3>
            {core.map((f) => (
              <div className="flex flex-col gap-3" key={f.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="d-display font-bold text-(--gold-hi) text-lg uppercase">
                    {f.name}
                  </span>
                  {latest ? (
                    <Link
                      className="font-bold text-(--gold) text-sm hover:text-(--gold-hi)"
                      href={`/games/${slug}/${latest}/${factionSlug(f.code)}#guide`}
                    >
                      Cómo jugarla →
                    </Link>
                  ) : null}
                </div>
                <VideoList currentVersion={currentVersion} videos={f.videos} />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h3 className={heading} id="matches">
              Partidas para ver jugar
            </h3>
            <VideoList currentVersion={currentVersion} videos={matches} />
          </div>
        </Section>
      </main>
    </SiteShell>
  );
};

export default VideosPage;
