import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Track user session for active users monitoring
  try {
    const { updateUserSession } = await import("../db");
    const sessionId = opts.req.cookies?.session_id || (opts.req.headers['x-session-id'] as string) || `session_${Date.now()}_${Math.random()}`;
    const ipAddress = opts.req.ip || ((opts.req.headers['x-forwarded-for'] as string)?.split(',')[0]) || 'unknown';
    const userAgent = opts.req.headers['user-agent'] as string;
    
    // Update session asynchronously without blocking the request
    updateUserSession(sessionId, user?.id || null, ipAddress, userAgent).catch(err => {
      console.error('Failed to update user session:', err);
    });
  } catch (error) {
    // Session tracking is non-critical, don't fail the request
    console.error('Session tracking error:', error);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
