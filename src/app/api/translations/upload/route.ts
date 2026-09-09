import { canTranslate } from '@/lib/roles';
import { auth } from '@/server/better-auth';
import { db } from '@/server/db';
import { importStrFile } from '@/server/translations/import';

/** A whole lotr.str is ~3 MB; anything far beyond that isn't one. */
const MAX_BYTES = 32 * 1024 * 1024;

/**
 * Receives a `lotr.str` as multipart form data (tRPC isn't meant for
 * bodies this size), stores it and answers with the import report, or
 * 409 when a file for that version and language already exists and
 * `replace` wasn't confirmed.
 */
const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !canTranslate(session.user)) {
    return Response.json({ error: 'Sin permiso.' }, { status: 403 });
  }
  const form = await request.formData();
  const file = form.get('file');
  const gameVersionId = form.get('gameVersionId');
  const language = form.get('language');
  const source = form.get('source');
  if (
    !(file instanceof File) ||
    typeof gameVersionId !== 'string' ||
    (language !== 'en' && language !== 'es')
  ) {
    return Response.json({ error: 'Faltan datos.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'Demasiado grande.' }, { status: 413 });
  }
  try {
    const result = await importStrFile(db, {
      bytes: Buffer.from(await file.arrayBuffer()),
      gameVersionId,
      language,
      source:
        typeof source === 'string' && source.trim() ? source.trim() : null,
      userId: session.user.id,
      replace: form.get('replace') === '1',
    });
    return Response.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo importar.';
    return Response.json({ error: message }, { status: 400 });
  }
};

export { POST };
