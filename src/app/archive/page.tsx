import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArchiveBrowser } from '@/app/archive/_components/archive-browser';
import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import { listAllMedia } from '@/server/api/routers/media-queries';
import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Los Archivos — Frikiparty' };

// Reads the session (admin gate), so it renders on demand.
export const dynamic = 'force-dynamic';

/**
 * The whole library. Admins always get in; everyone else only once the
 * archivePublic flag opens the doors. Non-admins get a 404 meanwhile.
 */
const ArchivePage = async () => {
  const session = await getSession();
  const isAdmin = session?.user.role === 'admin';
  if (!isAdmin && !siteFlags.archivePublic) {
    notFound();
  }
  const items = await listAllMedia(db);
  const photos = items.filter((item) => item.type === 'image').length;
  const videos = items.length - photos;

  return (
    <SiteShell>
      <main>
        <Section id="archive">
          <SectionHeader
            eyebrowText="Frikiparty"
            lead={
              items.length === 0
                ? 'Todavía no hay nada guardado. Cada foto o vídeo que subáis desde una edición o un jugador acaba aquí.'
                : `${photos} ${photos === 1 ? 'foto' : 'fotos'} y ${videos} ${videos === 1 ? 'vídeo' : 'vídeos'} de veinte años de concilios.`
            }
            title="Los Archivos"
          />
          <ArchiveBrowser isAdmin={isAdmin} items={items} />
        </Section>
      </main>
    </SiteShell>
  );
};

export default ArchivePage;
