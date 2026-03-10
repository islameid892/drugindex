import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";


// Get client IP from request
function getClientIp(ctx: TrpcContext): string {
  // Try to get from forwarded headers (for proxied requests)
  if (ctx.req?.headers['x-forwarded-for']) {
    const forwarded = ctx.req.headers['x-forwarded-for'];
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }
  
  // Fall back to socket address
  return ctx.req?.socket?.remoteAddress || 'unknown';
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);





// Procedure variants
export const searchProcedure = publicProcedure;
export const analyticsProcedure = publicProcedure;
export const bulkOperationProcedure = publicProcedure;
export const apiProcedure = publicProcedure;
