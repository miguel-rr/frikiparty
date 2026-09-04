import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteShell } from '@/components/layout/site-shell';
import { FormationLive } from '@/components/live/formation/formation-live';
import {
  BlazonDefs,
  btn,
  pageWidth,
  Section,
  SectionHeader,
} from '@/components/theme/primitives';
import { db } from '@/server/db';
import { getCurrentTournament, getLiveState } from '@/server/live/state';

export const metadata: Metadata = { title: 'La sala — Frikiparty' };

export const dynamic = 'force-dynamic';

/**
 * The formation room: draft or auction, live. `?display=tv` drops the
 * chrome and scales up for the screen in the room.
 */
const FormationPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ display?: string }>;
}) => {
  const { display } = await searchParams;
  const tv = display === 'tv';
  const current = await getCurrentTournament(db);
  const state = current ? await getLiveState(db, current.id) : null;
  if (!state) {
    return (
      <SiteShell>
        <main>
          <Section id="formation">
            <SectionHeader
              lead="No hay ningún torneo en marcha."
              title="La sala"
            />
            <div className="flex justify-center">
              <Link className={btn.outline} href="/live">
                Volver
              </Link>
            </div>
          </Section>
        </main>
      </SiteShell>
    );
  }
  if (tv) {
    return (
      <div className="theme-night min-h-screen text-[1.125rem] leading-relaxed">
        <BlazonDefs />
        <main className={`${pageWidth} max-w-7xl py-8`}>
          <FormationLive initial={state} tv />
        </main>
      </div>
    );
  }
  return (
    <SiteShell>
      <main>
        <section
          className={`${pageWidth} flex flex-col gap-8 py-10`}
          id="formation"
        >
          <FormationLive initial={state} />
        </section>
      </main>
    </SiteShell>
  );
};

export default FormationPage;
