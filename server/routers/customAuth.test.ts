import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hashPassword, verifyPassword, signUpSchema, signInSchema } from "../_core/auth-utils";

describe("Authentication Utilities", () => {
  describe("Password Hashing", () => {
    it("should hash a password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should verify a correct password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword456";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it("should produce different hashes for the same password", async () => {
      const password = "testPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Sign Up Validation", () => {
    it("should validate correct sign up data", () => {
      const data = {
        username: "john_doe",
        email: "john@example.com",
        password: "securePassword123",
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject username with less than 3 characters", () => {
      const data = {
        username: "ab",
        email: "john@example.com",
        password: "securePassword123",
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const data = {
        username: "john_doe",
        email: "invalid-email",
        password: "securePassword123",
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password with less than 6 characters", () => {
      const data = {
        username: "john_doe",
        email: "john@example.com",
        password: "short",
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject username with invalid characters", () => {
      const data = {
        username: "john@doe!",
        email: "john@example.com",
        password: "securePassword123",
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("Sign In Validation", () => {
    it("should validate correct sign in data", () => {
      const data = {
        email: "john@example.com",
        password: "securePassword123",
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const data = {
        email: "invalid-email",
        password: "securePassword123",
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const data = {
        email: "john@example.com",
        password: "",
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
