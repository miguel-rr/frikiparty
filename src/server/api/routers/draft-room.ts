import { on } from 'node:events';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import {
  claimCaptain,
  createRoom,
  emitter,
  getRoom,
  pickPlayer,
} from '@/server/realtime/draft-rooms';

const potsSchema = z.array(z.array(z.string()));
const captainOrderMethodSchema = z.enum([
  'ranking',
  'inverse-ranking',
  'fixed-random',
  'full-random',
]);
const draftMethodSchema = z.enum(['snake', 'linear']);

const draftRoomRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        pots: potsSchema,
        captainIds: z.array(z.string()),
        ranking: z.array(z.string()),
        captainOrderMethod: captainOrderMethodSchema,
        draftMethod: draftMethodSchema,
      }),
    )
    .mutation(({ input }) => {
      const code = createRoom(
        input.pots,
        input.captainIds,
        input.ranking,
        input.captainOrderMethod,
        input.draftMethod,
      );
      return { code };
    }),

  claim: publicProcedure
    .input(
      z.object({
        code: z.string(),
        captainId: z.string(),
        deviceId: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const result = claimCaptain(input.code, input.captainId, input.deviceId);
      if ('error' in result) {
        throw new TRPCError({ code: 'FORBIDDEN', message: result.error });
      }
      return result;
    }),

  pick: publicProcedure
    .input(
      z.object({
        code: z.string(),
        deviceId: z.string(),
        potIndex: z.number(),
        playerId: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const result = pickPlayer(
        input.code,
        input.deviceId,
        input.potIndex,
        input.playerId,
      );
      if ('error' in result) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
      }
      return result;
    }),

  onUpdate: publicProcedure
    .input(z.object({ code: z.string() }))
    .subscription(async function* ({ input, signal }) {
      const current = getRoom(input.code);
      if (current) yield current;

      try {
        for await (const [payload] of on(emitter, `update:${input.code}`, {
          signal,
        })) {
          yield payload;
        }
      } catch (error) {
        if (signal?.aborted) return;
        throw error;
      }
    }),
});

export { draftRoomRouter };
