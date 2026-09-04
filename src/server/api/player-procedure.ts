import { TRPCError } from '@trpc/server';

import { getPlayerForUser } from '@/server/api/routers/player';
import { protectedProcedure } from '@/server/api/trpc';

/**
 * Anything a person does *as a player* in a tournament — voting, bidding,
 * picking, readying a game, declaring a loss, uploading a save — needs an
 * account that has claimed its player. `ctx.player` is that player; with
 * "Entrar como" it's the impersonated user's player, which is the point.
 */
const playerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const player = await getPlayerForUser(ctx.db, ctx.session.user.id);
  if (!player) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Vincula tu jugador para poder participar.',
    });
  }
  return next({ ctx: { ...ctx, player } });
});

export { playerProcedure };
