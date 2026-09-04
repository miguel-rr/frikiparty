import { auctionRoomRouter } from '@/server/api/routers/auction-room';
import { draftRoomRouter } from '@/server/api/routers/draft-room';
import { editionRouter } from '@/server/api/routers/edition';
import { formationRouter } from '@/server/api/routers/formation';
import { liveRouter } from '@/server/api/routers/live';
import { mediaRouter } from '@/server/api/routers/media';
import { playerRouter } from '@/server/api/routers/player';
import { socialRouter } from '@/server/api/routers/social';
import { tournamentRouter } from '@/server/api/routers/tournament';
import { venueRouter } from '@/server/api/routers/venue';
import { voteRouter } from '@/server/api/routers/vote';
import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';

const appRouter = createTRPCRouter({
  auctionRoom: auctionRoomRouter,
  draftRoom: draftRoomRouter,
  edition: editionRouter,
  formation: formationRouter,
  live: liveRouter,
  media: mediaRouter,
  player: playerRouter,
  social: socialRouter,
  tournament: tournamentRouter,
  venue: venueRouter,
  vote: voteRouter,
});

type AppRouter = typeof appRouter;

const createCaller = createCallerFactory(appRouter);

export { type AppRouter, appRouter, createCaller };
