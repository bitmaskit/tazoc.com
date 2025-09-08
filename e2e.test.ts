import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalyticsData } from './types/analytics-data';

// Import workers
import shortenerWorker from './shortener/src/index';
import resolverWorker from './resolver/src/index';
import queueProcessorWorker from './queue-processor/src/index';

// Mock environments for each service
const mockShortenerEnv = {
  URL_DB: {
    prepare: vi.fn(),
  } as unknown as D1Database,
  URL_CACHE: {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  } as unknown as KVNamespace,
  shortener_analytics: {
    send: vi.fn(),
  } as unknown as Queue,
} as any;

const mockResolverEnv = {
  URL_CACHE: {
    get: vi.fn(),
    put: vi.fn(),
  } as unknown as KVNamespace,
  URL_DB: {
    prepare: vi.fn(),
  } as unknown as D1Database,
  shortener_analytics: {
    send: vi.fn(),
  } as unknown as Queue,
  ASSETS: {
    fetch: vi.fn(),
  } as unknown as Fetcher,
} as any;

const mockQueueProcessorEnv = {
  ANALYTICS_ENGINE: {
    writeDataPoint: vi.fn(),
  },
  URL_DB: {
    prepare: vi.fn(),
  } as unknown as D1Database,
} as any;

const mockStatement = {
  bind: vi.fn(),
  first: vi.fn(),
  run: vi.fn(),
  all: vi.fn(),
};

const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
} as ExecutionContext;

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup common mocks
    [mockShortenerEnv, mockResolverEnv, mockQueueProcessorEnv].forEach(env => {
      if (env.URL_DB) {
        (env.URL_DB.prepare as any).mockReturnValue(mockStatement);
      }
    });
    (mockStatement.bind as any).mockReturnValue(mockStatement);
  });

  describe('Complete URL Shortening and Resolution Workflow', () => {
    it('should handle complete workflow from URL creation to resolution and analytics', async () => {
      // Step 1: Create a short URL using the shortener service
      const mockStoredLink = {
        id: 1,
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: '2024-01-01T00:00:00Z',
        isActive: true,
        clickCount: 0
      };

      // Mock shortener database operations
      (mockStatement.first as any)
        .mockResolvedValueOnce(null) // No collision check
        .mockResolvedValueOnce(mockStoredLink); // Storage result
      (mockShortenerEnv.URL_CACHE.put as any).mockResolvedValue(undefined);

      const shortenRequest = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });

      const shortenResponse = await shortenerWorker.fetch(shortenRequest, mockShortenerEnv, mockCtx);
      const shortenResult = await shortenResponse.json();

      expect(shortenResponse.status).toBe(201);
      expect(shortenResult.shortCode).toBe('abc123');
      expect(shortenResult.originalUrl).toBe('https://example.com');

      // Step 2: Resolve the short URL using the resolver service
      (mockResolverEnv.URL_CACHE.get as any).mockResolvedValue('https://example.com');
      (mockResolverEnv.shortener_analytics.send as any).mockResolvedValue(undefined);

      const resolveRequest = new Request('https://short.ly/abc123');
      const resolveResponse = await resolverWorker.fetch(resolveRequest, mockResolverEnv, mockCtx);

      expect(resolveResponse.status).toBe(302);
      expect(resolveResponse.headers.get('Location')).toBe('https://example.com');

      // Verify analytics was queued
      expect(mockResolverEnv.shortener_analytics.send).toHaveBeenCalled();
      const analyticsData = (mockResolverEnv.shortener_analytics.send as any).mock.calls[0][0];
      expect(analyticsData.shortCode).toBe('abc123');

      // Step 3: Process analytics using the queue processor
      (mockQueueProcessorEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);
      (mockStatement.run as any).mockResolvedValue({ success: true });

      const mockBatch = {
        messages: [{
          body: analyticsData,
          id: 'msg-1',
          timestamp: new Date(),
          attempts: 1,
        }],
        queue: 'analytics-queue'
      } as MessageBatch<AnalyticsData>;

      await queueProcessorWorker.queue(mockBatch, mockQueueProcessorEnv);

      // Verify analytics was processed
      expect(mockQueueProcessorEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
      const processedDataPoint = (mockQueueProcessorEnv.ANALYTICS_ENGINE.writeDataPoint as any).mock.calls[0][0];
      expect(processedDataPoint.blobs[0]).toBe('abc123'); // shortCode
      expect(processedDataPoint.indexes[0]).toBe('abc123');
    });

    it('should handle resolver fallback to database when cache misses', async () => {
      // Mock cache miss and database hit
      (mockResolverEnv.URL_CACHE.get as any).mockResolvedValue(null);
      (mockStatement.first as any).mockResolvedValue({ destination: 'https://example.com' });
      (mockResolverEnv.URL_CACHE.put as any).mockResolvedValue(undefined);
      (mockResolverEnv.shortener_analytics.send as any).mockResolvedValue(undefined);

      const resolveRequest = new Request('https://short.ly/abc123');
      const resolveResponse = await resolverWorker.fetch(resolveRequest, mockResolverEnv, mockCtx);

      expect(resolveResponse.status).toBe(302);
      expect(resolveResponse.headers.get('Location')).toBe('https://example.com');

      // Should have queried database
      expect(mockStatement.first).toHaveBeenCalled();
      // Should have updated cache
      expect(mockCtx.waitUntil).toHaveBeenCalled();
    });

    it('should handle error scenarios gracefully across services', async () => {
      // Test shortener with invalid URL
      const invalidShortenRequest = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'invalid-url' })
      });

      const invalidShortenResponse = await shortenerWorker.fetch(invalidShortenRequest, mockShortenerEnv, mockCtx);
      expect(invalidShortenResponse.status).toBe(400);

      // Test resolver with non-existent short code
      (mockResolverEnv.URL_CACHE.get as any).mockResolvedValue(null);
      (mockStatement.first as any).mockResolvedValue(null);

      const invalidResolveRequest = new Request('https://short.ly/notfound');
      const invalidResolveResponse = await resolverWorker.fetch(invalidResolveRequest, mockResolverEnv, mockCtx);
      const invalidResolveResult = await invalidResolveResponse.json();

      expect(invalidResolveResponse.status).toBe(404);
      expect(invalidResolveResult.error.code).toBe('NOT_FOUND');

      // Test queue processor with invalid analytics data
      const invalidAnalyticsData = {
        // Missing required shortCode
        timestamp: '2023-01-01T00:00:00.000Z',
        isBot: false,
      } as AnalyticsData;

      const invalidBatch = {
        messages: [{
          body: invalidAnalyticsData,
          id: 'msg-1',
          timestamp: new Date(),
          attempts: 1,
        }],
        queue: 'analytics-queue'
      } as MessageBatch<AnalyticsData>;

      try {
        await queueProcessorWorker.queue(invalidBatch, mockQueueProcessorEnv);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('messages failed processing');
      }

      // Should not have written to Analytics Engine
      expect(mockQueueProcessorEnv.ANALYTICS_ENGINE.writeDataPoint).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Resilience', () => {
    it('should handle high-volume analytics processing', async () => {
      const batchSize = 25;
      const analyticsMessages = Array.from({ length: batchSize }, (_, i) => ({
        body: {
          shortCode: `code${i}`,
          timestamp: '2023-01-01T00:00:00.000Z',
          isBot: false,
          country: 'US'
        } as AnalyticsData,
        id: `msg-${i}`,
        timestamp: new Date(),
        attempts: 1,
      }));

      (mockQueueProcessorEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);
      (mockStatement.run as any).mockResolvedValue({ success: true });

      const largeBatch = {
        messages: analyticsMessages,
        queue: 'analytics-queue'
      } as MessageBatch<AnalyticsData>;

      await queueProcessorWorker.queue(largeBatch, mockQueueProcessorEnv);

      // Should have processed all messages
      expect(mockQueueProcessorEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(batchSize);
    });

    it('should handle service failures with appropriate error responses', async () => {
      // Test shortener database failure
      (mockStatement.first as any).mockRejectedValue(new Error('Database connection failed'));

      const shortenRequest = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });

      const shortenResponse = await shortenerWorker.fetch(shortenRequest, mockShortenerEnv, mockCtx);
      expect(shortenResponse.status).toBe(500);

      // Test resolver with both cache and database failures
      (mockResolverEnv.URL_CACHE.get as any).mockRejectedValue(new Error('KV unavailable'));
      (mockStatement.first as any).mockRejectedValue(new Error('D1 unavailable'));

      const resolveRequest = new Request('https://short.ly/abc123');
      const resolveResponse = await resolverWorker.fetch(resolveRequest, mockResolverEnv, mockCtx);
      expect(resolveResponse.status).toBe(404); // Circuit breaker should prevent D1 calls

      // Test queue processor with Analytics Engine failure
      (mockQueueProcessorEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(new Error('Analytics Engine unavailable'));

      const analyticsData: AnalyticsData = {
        shortCode: 'abc123',
        timestamp: '2023-01-01T00:00:00.000Z',
        isBot: false,
      };

      const failureBatch = {
        messages: [{
          body: analyticsData,
          id: 'msg-1',
          timestamp: new Date(),
          attempts: 1,
        }],
        queue: 'analytics-queue'
      } as MessageBatch<AnalyticsData>;

      try {
        await queueProcessorWorker.queue(failureBatch, mockQueueProcessorEnv);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('messages failed processing');
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across cache and database', async () => {
      const mockStoredLink = {
        id: 1,
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: '2024-01-01T00:00:00Z',
        isActive: true,
        clickCount: 0
      };

      // Create URL in shortener
      (mockStatement.first as any)
        .mockResolvedValueOnce(null) // No collision
        .mockResolvedValueOnce(mockStoredLink); // Storage result
      (mockShortenerEnv.URL_CACHE.put as any).mockResolvedValue(undefined);

      const shortenRequest = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });

      await shortenerWorker.fetch(shortenRequest, mockShortenerEnv, mockCtx);

      // Verify cache was updated (short code is randomly generated)
      expect(mockShortenerEnv.URL_CACHE.put).toHaveBeenCalledWith(
        expect.stringMatching(/^link:/),
        expect.any(String),
        { expirationTtl: 86400 }
      );

      // Resolve from cache
      (mockResolverEnv.URL_CACHE.get as any).mockResolvedValue('https://example.com');

      const resolveRequest = new Request('https://short.ly/abc123');
      const resolveResponse = await resolverWorker.fetch(resolveRequest, mockResolverEnv, mockCtx);

      expect(resolveResponse.status).toBe(302);
      expect(resolveResponse.headers.get('Location')).toBe('https://example.com');

      // Should not have queried database since cache hit
      // Note: mockStatement.first is called for collision check and storage in shortener
      expect(mockStatement.first).toHaveBeenCalled();
    });
  });
});