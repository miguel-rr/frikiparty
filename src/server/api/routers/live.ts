import { setTimeout as sleep } from 'node:timers/promises';

import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { settleAuctionTimers } from '@/server/live/formation';
import {
  getCurrentTournament,
  getLiveState,
  getLiveVersion,
} from '@/server/live/state';

/** Poll cadence for the change subscription (live plan §3.2). */
const HOT_STAGES = new Set(['formation']);
const HOT_POLL_MS = 1000;
const CALM_POLL_MS = 3000;

/**
 * Read side of the live module: what /live and /council render, plus the
 * subscription that pushes a fresh snapshot whenever the tournament's
 * version counter moves. Everything here is public — the tournament is a
 * spectacle for everyone; acting on it is what needs an account.
 */
const liveRouter = createTRPCRouter({
  current: publicProcedure.query(({ ctx }) => getCurrentTournament(ctx.db)),

  state: publicProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      getLiveState(ctx.db, input.tournamentId, {
        privileged: ctx.session?.user.role === 'admin',
      }),
    ),

  onChange: publicProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .subscription(async function* ({ ctx, input, signal }) {
      const options = { privileged: ctx.session?.user.role === 'admin' };
      let state = await getLiveState(ctx.db, input.tournamentId, options);
      if (!state) return;
      yield state;
      let known = state.version;
      while (!signal?.aborted) {
        await sleep(
          HOT_STAGES.has(state.stage) ? HOT_POLL_MS : CALM_POLL_MS,
          undefined,
          { signal },
        ).catch(() => undefined);
        if (signal?.aborted) return;
        // Whoever polls first settles a due auction timer (lazy clocks).
        if (state.stage === 'formation') {
          await settleAuctionTimers(ctx.db, input.tournamentId).catch(
            () => false,
          );
        }
        const version = await getLiveVersion(ctx.db, input.tournamentId);
        if (version === known) continue;
        const next = await getLiveState(ctx.db, input.tournamentId, options);
        if (!next) return;
        state = next;
        known = next.version;
        yield next;
      }
    }),
});

export { liveRouter };
