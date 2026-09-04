import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';

import { auth } from '@/server/better-auth';
import { db } from '@/server/db';

const createTRPCContext = async (opts: { headers: Headers }) => {
  const raw = await auth.api.getSession({
    headers: opts.headers,
  });
  // The admin plugin types `role` as optional; every account has one.
  const session = raw
    ? { ...raw, user: { ...raw.user, role: raw.user.role ?? 'user' } }
    : null;
  return {
    db,
    session,
    ...opts,
  };
};

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const createCallerFactory = t.createCallerFactory;

const createTRPCRouter = t.router;

// Adds artificial latency in dev to surface waterfalls that would otherwise only show in prod.
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

const publicProcedure = t.procedure.use(timingMiddleware);

// Verifies the session and guarantees `ctx.session.user` is non-null.
const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

// Verifies the session and requires an admin role.
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next();
});

export {
  adminProcedure,
  createCallerFactory,
  createTRPCContext,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  type TRPCContext,
};
