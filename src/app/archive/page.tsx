import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArchiveBrowser } from '@/app/archive/_components/archive-browser';
import { SiteShell } from '@/components/layout/site-shell';
import { Section, SectionHeader } from '@/components/theme/primitives';
import { siteFlags } from '@/lib/site-flags';
import { listAllMedia } from '@/server/api/routers/media-queries';
import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';
import { resolveArchiveAccess } from '@/server/media/access';

export const metadata: Metadata = { title: 'Los Archivos — Frikiparty' };

// Reads the session (member gate), so it renders on demand.
export const dynamic = 'force-dynamic';

/**
 * The whole library, for every archive member (a claimed player, an
 * editor, an admin); anyone else gets a 404, so the page doesn't
 * advertise itself. Everyone sees every file; the row actions follow
 * who may edit what.
 */
const ArchivePage = async () => {
  const session = await getSession();
  const access = await resolveArchiveAccess(db, session?.user);
  if (!access.isAdmin && !(access.allowed && siteFlags.archiveForMembers)) {
    notFound();
  }
  const items = await listAllMedia(db, session?.user.id ?? null);
  const photos = items.filter((item) => item.type === 'image').length;
  const videos = items.filter((item) => item.type === 'video').length;
  const documents = items.filter((item) => item.type === 'document').length;
  const tally = [
    `${photos} ${photos === 1 ? 'foto' : 'fotos'}`,
    `${videos} ${videos === 1 ? 'vídeo' : 'vídeos'}`,
    ...(documents > 0
      ? [`${documents} ${documents === 1 ? 'documento' : 'documentos'}`]
      : []),
  ];
  const tallyText = `${tally.slice(0, -1).join(', ')} y ${tally.at(-1)}`;

  return (
    <SiteShell>
      <main>
        <Section id="archive">
          <SectionHeader
            eyebrowText="Frikiparty"
            lead={
              items.length === 0
                ? 'Todavía no hay nada guardado. Cada foto, vídeo o documento que subáis desde una edición o un jugador acaba aquí.'
                : `${tallyText} de veinte años de concilios.`
            }
            title="Los Archivos"
          />
          <ArchiveBrowser
            canModerate={access.canModerate}
            items={items}
            viewerId={session?.user.id ?? null}
          />
        </Section>
      </main>
    </SiteShell>
  );
};

export default ArchivePage;
