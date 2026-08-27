import { auctionRoomRouter } from '@/server/api/routers/auction-room';
import { draftRoomRouter } from '@/server/api/routers/draft-room';
import { playerRouter } from '@/server/api/routers/player';
import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';

const appRouter = createTRPCRouter({
  auctionRoom: auctionRoomRouter,
  draftRoom: draftRoomRouter,
  player: playerRouter,
});

type AppRouter = typeof appRouter;

const createCaller = createCallerFactory(appRouter);

export { type AppRouter, appRouter, createCaller };
