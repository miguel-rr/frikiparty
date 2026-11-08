import { and, eq, sql } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';

import { getSession } from '@/server/better-auth/server';
import { db } from '@/server/db';
import { game, gameFile } from '@/server/db/schema';
import { resolveArchiveAccess } from '@/server/media/access';
import { publicUrl } from '@/server/storage/r2';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The download link the page shows: checks who's asking (the archive's
 * rule), counts the download and hands over to R2. The bucket's own URL
 * never appears on the page.
 */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) => {
  const { slug, id } = await params;
  const session = await getSession();
  const access = await resolveArchiveAccess(db, session?.user);
  if (!access.allowed || !UUID_PATTERN.test(id)) {
    notFound();
  }
  const [row] = await db
    .update(gameFile)
    .set({ downloadCount: sql`${gameFile.downloadCount} + 1` })
    .where(
      and(
        eq(gameFile.id, id),
        eq(
          gameFile.gameId,
          sql`(select ${game.id} from ${game} where ${game.slug} = ${slug})`,
        ),
      ),
    )
    .returning({ storageKey: gameFile.storageKey });
  if (!row) {
    notFound();
  }
  redirect(publicUrl(row.storageKey));
};
