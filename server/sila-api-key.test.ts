import { describe, it, expect, beforeAll } from 'vitest';
import { generateSilaApiKey, verifySilaApiKey, getAllSilaApiKeys, deactivateSilaApiKey } from '../server/db';

describe('Sila API Key Management', () => {
  let testApiKeyId: number;
  let testRawKey: string;

  it('should generate a new API key', async () => {
    const result = await generateSilaApiKey('Test Key', 'Test Description');
    
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('rawKey');
    expect(result).toHaveProperty('keyName');
    expect(result.keyName).toBe('Test Key');
    
    testApiKeyId = result.id;
    testRawKey = result.rawKey;
  });

  it('should verify a valid API key', async () => {
    const result = await verifySilaApiKey(testRawKey);
    
    expect(result).not.toBeNull();
    expect(result?.keyName).toBe('Test Key');
    expect(result?.isActive).toBe(true);
  });

  it('should reject an invalid API key', async () => {
    const result = await verifySilaApiKey('invalid_key_12345');
    
    expect(result).toBeNull();
  });

  it('should get all API keys', async () => {
    const keys = await getAllSilaApiKeys();
    
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.some(k => k.keyName === 'Test Key')).toBe(true);
  });

  it('should deactivate an API key', async () => {
    await deactivateSilaApiKey(testApiKeyId);
    
    const result = await verifySilaApiKey(testRawKey);
    expect(result).toBeNull(); // Should not verify after deactivation
  });
});
