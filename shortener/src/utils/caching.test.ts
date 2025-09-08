/**
 * Tests for caching optimizations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  storeUrlMapping, 
  getUrlMapping, 
  deleteUrlMapping,
  getCacheMetrics,
  type LinkData,
  type StorageEnv 
} from './storage';

// Mock KV and D1 interfaces
const createMockKV = () => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});

const createMockD1 = () => ({
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      first: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
    })),
  })),
});

describe('Caching Optimizations', () => {
  let mockKV: any;
  let mockDB: any;
  let storageEnv: StorageEnv;

  beforeEach(() => {
    mockKV = createMockKV();
    mockDB = createMockD1();
    storageEnv = { DB: mockDB, KV: mockKV };
    vi.clearAllMocks();
  });

  describe('Cache Warming for New Links', () => {
    it('should immediately cache newly created links with shorter TTL', async () => {
      const linkData: LinkData = {
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // Mock database insertion
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            id: 1,
            ...linkData,
          })
        })
      });

      // Mock KV put for cache warming and metrics
      mockKV.put.mockResolvedValue(undefined);
      mockKV.get.mockResolvedValue(null); // No existing metrics

      const result = await storeUrlMapping(linkData, storageEnv);

      expect(result).toEqual(expect.objectContaining(linkData));
      
      // Verify cache was warmed immediately with new link TTL
      expect(mockKV.put).toHaveBeenCalledWith(
        `link:${linkData.shortCode}`,
        expect.stringContaining(linkData.originalUrl),
        expect.objectContaining({ expirationTtl: 3600 }) // 1 hour for new links
      );
    });

    it('should not fail link creation if cache warming fails', async () => {
      const linkData: LinkData = {
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // Mock database insertion success
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            id: 1,
            ...linkData,
          })
        })
      });

      // Mock KV put failure
      mockKV.put.mockRejectedValue(new Error('KV unavailable'));

      // Should still succeed despite cache warming failure
      const result = await storeUrlMapping(linkData, storageEnv);
      expect(result).toEqual(expect.objectContaining(linkData));
    });
  });

  describe('Intelligent TTL Calculation', () => {
    it('should use longer TTL for popular links', async () => {
      const popularLinkData: LinkData = {
        shortCode: 'popular',
        originalUrl: 'https://popular.com',
        createdAt: new Date().toISOString(),
        isActive: true,
        clickCount: 150, // Very popular
      };

      // Mock cache miss first, then metrics storage
      mockKV.get
        .mockResolvedValueOnce(null) // Cache miss
        .mockResolvedValueOnce(null); // No existing metrics
      
      // Mock database hit
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(popularLinkData)
        })
      });
      
      mockKV.put.mockResolvedValue(undefined);

      await getUrlMapping('popular', storageEnv);

      // Should use maximum TTL for very popular links (first call is for the link cache)
      expect(mockKV.put).toHaveBeenCalledWith(
        'link:popular',
        expect.any(String),
        expect.objectContaining({ expirationTtl: 604800 }) // 7 days
      );
    });

    it('should use shorter TTL for unused links', async () => {
      const unusedLinkData: LinkData = {
        shortCode: 'unused',
        originalUrl: 'https://unused.com',
        createdAt: new Date().toISOString(),
        isActive: true,
        clickCount: 0, // Never clicked
      };

      // Mock cache miss first, then metrics storage
      mockKV.get
        .mockResolvedValueOnce(null) // Cache miss
        .mockResolvedValueOnce(null); // No existing metrics
      
      // Mock database hit
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(unusedLinkData)
        })
      });
      
      mockKV.put.mockResolvedValue(undefined);

      await getUrlMapping('unused', storageEnv);

      // Should use shorter TTL for unused links
      expect(mockKV.put).toHaveBeenCalledWith(
        'link:unused',
        expect.any(String),
        expect.objectContaining({ expirationTtl: 43200 }) // 12 hours
      );
    });

    it('should respect link expiration when calculating TTL', async () => {
      const soonToExpireLinkData: LinkData = {
        shortCode: 'expiring',
        originalUrl: 'https://expiring.com',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(), // Expires in 30 minutes
        isActive: true,
        clickCount: 50,
      };

      // Mock cache miss first, then metrics storage
      mockKV.get
        .mockResolvedValueOnce(null) // Cache miss
        .mockResolvedValueOnce(null); // No existing metrics
      
      // Mock database hit
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(soonToExpireLinkData)
        })
      });
      
      mockKV.put.mockResolvedValue(undefined);

      await getUrlMapping('expiring', storageEnv);

      // Should use TTL that doesn't exceed link expiration
      expect(mockKV.put).toHaveBeenCalledWith(
        'link:expiring',
        expect.any(String),
        expect.objectContaining({ 
          expirationTtl: expect.any(Number)
        })
      );

      // Find the cache put call (not the metrics put call)
      const cachePutCall = mockKV.put.mock.calls.find(call => 
        call[0] === 'link:expiring'
      );
      
      expect(cachePutCall).toBeDefined();
      const ttl = cachePutCall[2].expirationTtl;
      expect(ttl).toBeLessThanOrEqual(1800); // Should be <= 30 minutes
    });
  });

  describe('Cache Invalidation', () => {
    it('should immediately invalidate cache when link is deleted', async () => {
      // Mock successful deletion
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ changes: 1 })
        })
      });
      
      mockKV.delete.mockResolvedValue(undefined);
      mockKV.get.mockResolvedValue(null); // No existing metrics
      mockKV.put.mockResolvedValue(undefined); // For metrics storage

      const result = await deleteUrlMapping('test123', storageEnv);

      expect(result).toBe(true);
      expect(mockKV.delete).toHaveBeenCalledWith('link:test123');
    });

    it('should not invalidate cache if deletion fails', async () => {
      // Mock failed deletion
      mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ changes: 0 })
        })
      });

      const result = await deleteUrlMapping('nonexistent', storageEnv);

      expect(result).toBe(false);
      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });

  describe('Cache Metrics Tracking', () => {
    it('should track cache hits and misses', async () => {
      const linkData: LinkData = {
        shortCode: 'metrics',
        originalUrl: 'https://metrics.com',
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // Mock cache hit
      mockKV.get.mockResolvedValueOnce(JSON.stringify({
        originalUrl: linkData.originalUrl,
        isActive: true,
        cachedAt: new Date().toISOString(),
      }));

      // Mock metrics storage
      mockKV.get.mockResolvedValueOnce(null); // No existing metrics
      mockKV.put.mockResolvedValue(undefined);

      await getUrlMapping('metrics', storageEnv);

      // Should store hit metrics
      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringMatching(/^metrics:cache:/),
        expect.stringContaining('"hits":1'),
        expect.objectContaining({ expirationTtl: 90000 })
      );
    });

    it('should calculate cache hit ratio correctly', async () => {
      const mockMetrics = {
        hits: 80,
        misses: 20,
        writes: 50,
        invalidates: 5,
        errors: 2,
        totalRequests: 100,
        avgTTL: 86400,
        ttlSum: 432000,
        ttlCount: 5
      };

      // Mock metrics for multiple hours
      mockKV.get.mockResolvedValue(mockMetrics);

      const result = await getCacheMetrics(mockKV, 1);

      expect(result.hitRatio).toBe(0.8); // 80/100
      expect(result.totalRequests).toBe(100);
      expect(result.hits).toBe(80);
      expect(result.misses).toBe(20);
      expect(result.avgTTL).toBe(86400);
    });

    it('should handle missing metrics gracefully', async () => {
      // Mock no metrics available
      mockKV.get.mockResolvedValue(null);

      const result = await getCacheMetrics(mockKV, 24);

      expect(result.hitRatio).toBe(0);
      expect(result.totalRequests).toBe(0);
      expect(result.hoursAnalyzed).toBe(0);
    });
  });

  describe('Cache Performance Monitoring', () => {
    it('should provide comprehensive cache metrics', async () => {
      const hourlyMetrics = {
        hits: 100,
        misses: 25,
        writes: 30,
        invalidates: 5,
        errors: 1,
        totalRequests: 125,
        avgTTL: 43200,
        ttlSum: 216000,
        ttlCount: 5
      };

      mockKV.get.mockResolvedValue(hourlyMetrics);

      const metrics = await getCacheMetrics(mockKV, 1); // Only check 1 hour to avoid multiplication

      expect(metrics).toEqual({
        hitRatio: 0.8, // 100/125
        totalRequests: 125,
        hits: 100,
        misses: 25,
        writes: 30,
        invalidates: 5,
        errors: 1,
        avgTTL: 43200,
        hoursAnalyzed: 1 // Only 1 hour had data
      });
    });
  });
});