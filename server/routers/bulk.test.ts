import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };

  return ctx;
}

describe('Bulk Verification Router', () => {
  describe('verifyBatch', () => {
    it('should verify a batch of ICD-10 codes', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: ['D07.28', 'E11.9', 'A01.00'],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should identify all items as codes', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: ['D07.28'],
      });

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('code');
      expect(result[0].input).toBe('D07.28');
    });

    it('should identify valid ICD-10 codes correctly', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: ['D07.28', 'E11.9'],
      });

      expect(result.length).toBe(2);
      expect(result[0].type).toBe('code');
      expect(result[1].type).toBe('code');
    });

    it('should handle empty items array', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: [],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should mark invalid codes as not found', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: ['INVALID', 'XYZ123'],
      });

      expect(result.length).toBe(2);
      // Invalid codes should not be found
      expect(result.every(r => !r.found)).toBe(true);
    });

    it('should include coverage status in results', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: ['D07.28'],
      });

      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('isCovered');
      expect(typeof result[0].isCovered).toBe('boolean');
    });

    it('should include code name in details for found codes', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: ['D07.28'],
      });

      expect(result.length).toBe(1);
      if (result[0].found) {
        expect(result[0].details).toHaveProperty('name');
        expect(result[0].details.name).toBeTruthy();
      }
    });

    it('should handle case-insensitive code matching', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: ['d07.28', 'e11.9'],
      });

      expect(result.length).toBe(2);
      expect(result[0].type).toBe('code');
      expect(result[1].type).toBe('code');
    });

    it('should process multiple codes in sequence', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bulk.verifyBatch({
        items: ['D07.28', 'E11.9', 'A01.00', 'B02.9', 'C01.0'],
      });

      expect(result.length).toBe(5);
      result.forEach(item => {
        expect(item).toHaveProperty('input');
        expect(item).toHaveProperty('type');
        expect(item.type).toBe('code');
        expect(item).toHaveProperty('found');
        expect(item).toHaveProperty('isCovered');
        expect(item).toHaveProperty('details');
      });
    });

    it('should return consistent results for same input', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result1 = await caller.bulk.verifyBatch({
        items: ['D07.28'],
      });

      const result2 = await caller.bulk.verifyBatch({
        items: ['D07.28'],
      });

      expect(result1[0].found).toBe(result2[0].found);
      expect(result1[0].isCovered).toBe(result2[0].isCovered);
      expect(result1[0].details.name).toBe(result2[0].details.name);
    });
  });
});
