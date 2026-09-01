import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/layout/site-shell';
import {
  RingGlyph,
  Section,
  SectionHeader,
} from '@/components/theme/primitives';
import { EditionCard } from '@/components/tournament/edition-card';
import { siteFlags } from '@/lib/site-flags';
import { sceneForIndex } from '@/lib/tournament/edition-scenes';
import { listEditions } from '@/server/api/routers/edition';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Ediciones — Frikiparty' };

// Built statically; each card's upcoming/live/past status depends on
// today's date, so the page re-renders hourly (plus on-demand from edits).
export const revalidate = 3600;

const EditionsPage = async () => {
  if (!siteFlags.editionsPage) {
    notFound();
  }
  const editions = await listEditions(db);

  return (
    <SiteShell>
      <main>
        <Section id="editions">
          <SectionHeader
            eyebrowText="Crónica · Desde 2005"
            lead="Cada año, una casa rural, un torneo y un puñado de anillos. Esta es la cuenta de todas las ediciones del concilio."
            title="Las Ediciones"
          />
          {editions.length > 0 ? (
            <ol className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 border-(--hair-gold) border-l pl-6 sm:pl-10">
              {editions.map((edition, index) => (
                <li className="relative" key={edition.id}>
                  <span
                    aria-hidden
                    className="absolute top-6 -left-[34px] grid size-4 place-items-center bg-(--night) sm:-left-[50px]"
                  >
                    <RingGlyph
                      size={16}
                      tone={edition.individualChampion ? 'solitaire' : 'gold'}
                    />
                  </span>
                  <EditionCard edition={edition} scene={sceneForIndex(index)} />
                </li>
              ))}
            </ol>
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
