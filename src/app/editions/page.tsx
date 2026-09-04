import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { NewEditionButton } from '@/app/editions/_components/new-edition-button';
import { EditionsView } from '@/components/editions/editions-view';
import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import { buildEditionViews } from '@/lib/tournament/edition-view';
import { listEditions } from '@/server/api/routers/edition';
import { getHistoricalRanking } from '@/server/api/routers/player';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Ediciones — Frikiparty' };

// Built statically; each card's upcoming/live/past status depends on
// today's date, so the page re-renders hourly (plus on-demand from edits).
export const revalidate = 3600;

/**
 * The chronicle: every edition as a card from the players' deck, with a
 * compact list behind a toggle for when twenty years is too much scroll.
 */
const EditionsPage = async () => {
  if (!siteFlags.editionsPage) {
    notFound();
  }
  const [editions, players] = await Promise.all([
    listEditions(db),
    getHistoricalRanking(db),
  ]);
  const views = buildEditionViews(editions, players);

  return (
    <SiteShell>
      <main>
        <Section id="editions">
          <SectionHeader eyebrowText="Crónica" title="Las Ediciones" />
          <NewEditionButton />
          {views.length > 0 ? (
            <EditionsView editions={views} />
          ) : (
            <p className="text-center text-(--faded)">
              Todavía no hay ediciones registradas.
            </p>
          )}
        </Section>
      </main>
    </SiteShell>
  );
};

export default EditionsPage;
