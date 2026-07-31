import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';

const appRouter = createTRPCRouter({});

type AppRouter = typeof appRouter;

const createCaller = createCallerFactory(appRouter);

export { type AppRouter, appRouter, createCaller };
