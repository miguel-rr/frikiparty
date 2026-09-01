import { auctionRoomRouter } from '@/server/api/routers/auction-room';
import { draftRoomRouter } from '@/server/api/routers/draft-room';
import { editionRouter } from '@/server/api/routers/edition';
import { playerRouter } from '@/server/api/routers/player';
import { venueRouter } from '@/server/api/routers/venue';
import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';

const appRouter = createTRPCRouter({
  auctionRoom: auctionRoomRouter,
  draftRoom: draftRoomRouter,
  edition: editionRouter,
  player: playerRouter,
  venue: venueRouter,
});

type AppRouter = typeof appRouter;

const createCaller = createCallerFactory(appRouter);

export { type AppRouter, appRouter, createCaller };
