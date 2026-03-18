import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { searchRateLimiter, analyticsRateLimiter, bulkOperationRateLimiter, apiRateLimiter } from "../middleware/rateLimiter";

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

/**
 * Rate limiting middleware for search endpoints
 */
export const searchRateLimitMiddleware = t.middleware(async opts => {
  const { ctx, next } = opts;
  const clientIp = getClientIp(ctx);
  
  const result = searchRateLimiter.isAllowed(clientIp);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many search requests. Please wait ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
    });
  }
  
  return next({ ctx });
});

/**
 * Search tracking middleware - logs all searches with metadata
 */
export const searchTrackingMiddleware = t.middleware(async opts => {
  const { ctx, next, input } = opts;
  const startTime = Date.now();
  
  // Call the next handler and capture the result
  const result = await next({ ctx });
  
  // Record search analytics asynchronously (don't block the response)
  const responseTime = Date.now() - startTime;
  const searchQuery = (input as any)?.query || (input as any)?.term || 'unknown';
  const resultsCount = (result as any)?.length || (result as any)?.results?.length || 0;
  
  // Fire and forget - don't await
  (async () => {
    try {
      const { recordSearch } = await import("../db");
      await recordSearch({
        query: searchQuery,
        resultsCount,
        responseTimeMs: responseTime,
        source: ctx.req?.headers['x-search-source'] as string || 'main',
      });
    } catch (error) {
      console.error('[Search Tracking] Failed to record search:', error);
    }
  })();
  
  return result;
});

/**
 * Rate limiting middleware for analytics endpoints
 */
export const analyticsRateLimitMiddleware = t.middleware(async opts => {
  const { ctx, next } = opts;
  const clientIp = getClientIp(ctx);
  
  const result = analyticsRateLimiter.isAllowed(clientIp);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many analytics requests. Please wait ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
    });
  }
  
  return next({ ctx });
});

/**
 * Rate limiting middleware for bulk operations
 */
export const bulkOperationRateLimitMiddleware = t.middleware(async opts => {
  const { ctx, next } = opts;
  const clientIp = getClientIp(ctx);
  
  const result = bulkOperationRateLimiter.isAllowed(clientIp);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many bulk operations. Please wait ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
    });
  }
  
  return next({ ctx });
});

/**
 * General API rate limiting middleware
 */
export const apiRateLimitMiddleware = t.middleware(async opts => {
  const { ctx, next } = opts;
  const clientIp = getClientIp(ctx);
  
  const result = apiRateLimiter.isAllowed(clientIp);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Please wait ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
    });
  }
  
  return next({ ctx });
});

// Create rate-limited procedure variants
export const searchProcedure = publicProcedure
  .use(searchRateLimitMiddleware)
  .use(searchTrackingMiddleware);
export const analyticsProcedure = publicProcedure.use(analyticsRateLimitMiddleware);
export const bulkOperationProcedure = publicProcedure.use(bulkOperationRateLimitMiddleware);
export const apiProcedure = publicProcedure.use(apiRateLimitMiddleware);
