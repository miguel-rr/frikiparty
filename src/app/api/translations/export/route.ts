import { canTranslate } from '@/lib/roles';
import { auth } from '@/server/better-auth';
import { db } from '@/server/db';
import { buildExport } from '@/server/translations/export';

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Downloads the game-ready file: `?es=<fileId>` picks the Spanish base,
 * `&en=<fileId>` (optional) the English that fills in the keys it lacks.
 */
const GET = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !canTranslate(session.user)) {
    return new Response('Sin permiso.', { status: 403 });
  }
  const url = new URL(request.url);
  const esFileId = url.searchParams.get('es') ?? '';
  const enFileId = url.searchParams.get('en');
  if (!UUID.test(esFileId) || (enFileId && !UUID.test(enFileId))) {
    return new Response('Faltan datos.', { status: 400 });
  }
  try {
    const { bytes, filename } = await buildExport(db, {
      esFileId,
      enFileId: enFileId || null,
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'text/plain; charset=windows-1252',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo exportar.';
    return new Response(message, { status: 400 });
  }
};

export { GET };
