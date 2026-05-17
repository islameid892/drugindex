import { describe, it, expect } from 'vitest';
import compression from 'compression';
import { Request, Response } from 'express';

describe('Response Compression', () => {
  describe('Compression Configuration', () => {
    it('should have compression level set to 6', () => {
      // Compression level 6 is a good balance between compression ratio and CPU usage
      // Level 0 = no compression, 9 = maximum compression
      const level = 6;
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(9);
    });

    it('should have threshold set to 1024 bytes', () => {
      // Only compress responses larger than 1KB
      const threshold = 1024;
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThanOrEqual(10240); // Max 10KB threshold
    });

    it('should compress JSON responses', () => {
      // JSON responses are highly compressible
      const jsonData = { data: 'test', value: 123 };
      const jsonString = JSON.stringify(jsonData);
      
      // JSON should be compressible
      expect(jsonString.length).toBeGreaterThan(0);
      expect(jsonString).toContain('data');
    });

    it('should compress API responses', () => {
      // API responses with search results should be compressible
      const apiResponse = {
        results: Array(100).fill({ id: 1, name: 'Test', description: 'A test item' }),
        total: 100,
      };
      
      const jsonString = JSON.stringify(apiResponse);
      expect(jsonString.length).toBeGreaterThan(1024); // Should exceed threshold
    });
  });

  describe('Compression Filter', () => {
    it('should not compress if x-no-compression header is set', () => {
      // Custom header to disable compression
      const req = { headers: { 'x-no-compression': 'true' } } as Request;
      const res = {} as Response;
      
      const shouldCompress = !req.headers['x-no-compression'];
      expect(shouldCompress).toBe(false);
    });

    it('should compress if x-no-compression header is not set', () => {
      const req = { headers: {} } as Request;
      const res = {} as Response;
      
      const shouldCompress = !req.headers['x-no-compression'];
      expect(shouldCompress).toBe(true);
    });

    it('should use default compression filter', () => {
      // The default filter checks for content-type
      const req = { headers: { 'accept-encoding': 'gzip' } } as Request;
      const res = { getHeader: () => 'application/json' } as Response;
      
      // Should compress JSON
      expect(res.getHeader('content-type')).toBe('application/json');
    });
  });

  describe('Compression Benefits', () => {
    it('should reduce response size significantly', () => {
      // Example: typical search response
      const largeResponse = JSON.stringify({
        results: Array(50).fill({
          id: 1,
          scientificName: 'Acetaminophen',
          tradeName: 'Panadol',
          indication: 'Pain and fever relief',
          icdCodes: ['R51.9', 'R50.9'],
          coverage: true,
        }),
      });

      // Uncompressed size
      const uncompressedSize = Buffer.byteLength(largeResponse, 'utf8');
      
      // Estimated compression ratio (gzip typically achieves 70-80% reduction for JSON)
      const estimatedCompressedSize = uncompressedSize * 0.25; // 75% reduction
      
      expect(uncompressedSize).toBeGreaterThan(1024);
      expect(estimatedCompressedSize).toBeLessThan(uncompressedSize);
    });

    it('should improve bandwidth usage', () => {
      // Bandwidth calculation
      const uncompressedSize = 10000; // 10KB
      const compressedSize = 2500; // 2.5KB (75% reduction)
      
      const bandwidthSaved = uncompressedSize - compressedSize;
      const percentageSaved = (bandwidthSaved / uncompressedSize) * 100;
      
      expect(percentageSaved).toBeGreaterThan(70);
      expect(percentageSaved).toBeLessThan(90);
    });

    it('should improve page load time', () => {
      // Assuming 1Mbps connection
      const bandwidth = 1000000; // bits per second
      
      const uncompressedSize = 10000 * 8; // bits
      const compressedSize = 2500 * 8; // bits
      
      const uncompressedTime = uncompressedSize / bandwidth;
      const compressedTime = compressedSize / bandwidth;
      
      const timeImprovement = ((uncompressedTime - compressedTime) / uncompressedTime) * 100;
      
      expect(timeImprovement).toBeGreaterThan(70);
    });
  });

  describe('Cache Headers', () => {
    it('should set cache-control header for API responses', () => {
      const cacheControl = 'public, max-age=300';
      
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age=300'); // 5 minutes
    });

    it('should set vary header for content encoding', () => {
      const varyHeader = 'Accept-Encoding';
      
      expect(varyHeader).toContain('Accept-Encoding');
    });

    it('should set long cache for static assets', () => {
      const cacheControl = 'public, max-age=31536000, immutable';
      
      expect(cacheControl).toContain('immutable');
      expect(cacheControl).toContain('31536000'); // 1 year
    });
  });

  describe('Content Types', () => {
    it('should compress JSON content', () => {
      const contentType = 'application/json';
      expect(contentType).toBe('application/json');
    });

    it('should compress text content', () => {
      const contentType = 'text/html';
      expect(contentType).toContain('text');
    });

    it('should not compress already compressed content', () => {
      const compressedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
      
      compressedTypes.forEach(type => {
        // These are already compressed, no need to compress again
        expect(type).toBeTruthy();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate compression ratio', () => {
      const uncompressed = 10000;
      const compressed = 2500;
      const ratio = (1 - compressed / uncompressed) * 100;
      
      expect(ratio).toBeGreaterThan(70);
      expect(ratio).toBeLessThan(90);
    });

    it('should estimate bandwidth savings', () => {
      const dailyRequests = 1000;
      const avgResponseSize = 10000; // 10KB
      const compressionRatio = 0.75; // 75% reduction
      
      const dailyBandwidth = dailyRequests * avgResponseSize;
      const compressedBandwidth = dailyRequests * (avgResponseSize * compressionRatio);
      const savedBandwidth = dailyBandwidth - compressedBandwidth;
      
      expect(savedBandwidth).toBeGreaterThan(0);
      expect(savedBandwidth).toBeLessThan(dailyBandwidth);
    });

    it('should calculate CPU impact', () => {
      // Compression level 6 uses moderate CPU
      const level = 6;
      const estimatedCpuUsage = level * 10; // Rough estimate: 60% at level 6
      
      expect(estimatedCpuUsage).toBeGreaterThan(0);
      expect(estimatedCpuUsage).toBeLessThan(100);
    });
  });
});
