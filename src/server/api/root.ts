import { editionRouter } from '@/server/api/routers/edition';
import { formationRouter } from '@/server/api/routers/formation';
import { gameFilesRouter } from '@/server/api/routers/game-files';
import { liveRouter } from '@/server/api/routers/live';
import { matchRouter } from '@/server/api/routers/match';
import { mediaRouter } from '@/server/api/routers/media';
import { phasesRouter } from '@/server/api/routers/phases';
import { playerRouter } from '@/server/api/routers/player';
import { pollRouter } from '@/server/api/routers/poll';
import { socialRouter } from '@/server/api/routers/social';
import { tournamentRouter } from '@/server/api/routers/tournament';
import { translationsRouter } from '@/server/api/routers/translations';
import { venueRouter } from '@/server/api/routers/venue';
import { voteRouter } from '@/server/api/routers/vote';
import { wikiRouter } from '@/server/api/routers/wiki';
import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';

const appRouter = createTRPCRouter({
  edition: editionRouter,
  formation: formationRouter,
  gameFiles: gameFilesRouter,
  live: liveRouter,
  match: matchRouter,
  media: mediaRouter,
  phases: phasesRouter,
  player: playerRouter,
  poll: pollRouter,
  social: socialRouter,
  tournament: tournamentRouter,
  translations: translationsRouter,
  venue: venueRouter,
  vote: voteRouter,
  wiki: wikiRouter,
});

type AppRouter = typeof appRouter;

const createCaller = createCallerFactory(appRouter);

export { type AppRouter, appRouter, createCaller };
