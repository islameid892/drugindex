import bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * Validation schemas for authentication
 */
export const signUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(100, "Username must be less than 100 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(255, "Password must be less than 255 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token (using jose)
 */
export async function generateToken(userId: number, email: string): Promise<string> {
  const { SignJWT } = await import("jose");
  
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
  
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  
  return token;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
    
    const verified = await jwtVerify(token, secret);
    return verified.payload as { userId: number; email: string };
  } catch (error) {
    return null;
  }
}
