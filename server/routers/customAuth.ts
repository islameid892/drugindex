import { router, publicProcedure } from "../\_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  signUpSchema,
  signInSchema,
  hashPassword,
  verifyPassword,
  generateToken,
} from "../\_core/auth-utils";

export const customAuthRouter = router({
  /**
   * Sign up - Create a new user account
   */
  signup: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ input, ctx }: any) => {
      try {
        const db = await getDb();

        // Check if email already exists
        const existingEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existingEmail.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already registered",
          });
        }

        // Check if username already exists
        const existingUsername = await db
          .select()
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);

        if (existingUsername.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already taken",
          });
        }

        // Hash password
        const passwordHash = await hashPassword(input.password);

        // Create user
        const result = await db.insert(users).values({
          username: input.username,
          email: input.email,
          passwordHash,
          role: "user",
          loginMethod: "custom",
        });

        const userId = result.insertId;

        // Generate JWT token
        const token = await generateToken(userId, input.email);

        // Set session cookie
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as const,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: "/",
        };

        ctx.res.cookie("auth_token", token, cookieOptions);

        return {
          success: true,
          user: {
            id: userId,
            username: input.username,
            email: input.email,
            role: "user",
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Sign up failed",
        });
      }
    }),

  /**
   * Sign in - Authenticate user
   */
  signin: publicProcedure
    .input(signInSchema)
    .mutation(async ({ input, ctx }: any) => {
      try {
        const db = await getDb();

        // Find user by email
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (userRecord.length === 0) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        const user = userRecord[0];

        // Verify password
        const passwordMatch = await verifyPassword(input.password, user.passwordHash);

        if (!passwordMatch) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Generate JWT token
        const token = await generateToken(user.id, user.email);

        // Update lastSignedIn
        await db
          .update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, user.id));

        // Set session cookie
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as const,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: "/",
        };

        ctx.res.cookie("auth_token", token, cookieOptions);

        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Sign in failed",
        });
      }
    }),

  /**
   * Get current user
   */
  me: publicProcedure.query(async ({ ctx }: any) => {
    if (!ctx.user) {
      return null;
    }
    return ctx.user;
  }),

  /**
   * Logout
   */
  logout: publicProcedure.mutation(({ ctx }: any) => {
    ctx.res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    });
    return { success: true };
  }),
});
