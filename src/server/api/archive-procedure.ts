import { TRPCError } from '@trpc/server';

import { protectedProcedure } from '@/server/api/trpc';
import { resolveArchiveAccess } from '@/server/media/access';

/**
 * Reading, uploading, liking and commenting share one rule (see
 * resolveArchiveAccess): admins and editors always, anyone else once
 * their account has claimed a player.
 */
const archiveProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const access = await resolveArchiveAccess(ctx.db, ctx.session.user);
  if (!access.allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Vincula tu jugador para entrar en Los Archivos.',
    });
  }
  return next({ ctx: { ...ctx, access } });
});

export { archiveProcedure };
