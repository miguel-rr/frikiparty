import { on } from 'node:events';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import {
  claimCaptain,
  createRoom,
  emitter,
  getRoom,
  placeBid,
} from '@/server/realtime/auction-rooms';

const potsSchema = z.array(z.array(z.string()));

const auctionRoomRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ pots: potsSchema, captainIds: z.array(z.string()) }))
    .mutation(({ input }) => {
      const code = createRoom(input.pots, input.captainIds);
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

  placeBid: publicProcedure
    .input(
      z.object({ code: z.string(), deviceId: z.string(), amount: z.number() }),
    )
    .mutation(({ input }) => {
      const result = placeBid(input.code, input.deviceId, input.amount);
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

export { auctionRoomRouter };
