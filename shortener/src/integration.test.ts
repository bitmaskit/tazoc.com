import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from './index';

// Mock environment for integration tests
const mockEnv = {
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
} as Env;

const mockStatement = {
  bind: vi.fn(),
  first: vi.fn(),
  run: vi.fn(),
  all: vi.fn(),
};

const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {}
} as ExecutionContext;

describe('Shortener Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockEnv.URL_DB.prepare as any).mockReturnValue(mockStatement);
    (mockStatement.bind as any).mockReturnValue(mockStatement);
    
    // Mock short code collision check to return null (no collision)
    (mockStatement.first as any).mockImplementation((query) => {
      // For collision check queries, return null (no collision)
      if (typeof query === 'undefined') {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });
  });

  describe('Complete URL Shortening Workflow', () => {
    it('should handle complete URL shortening and retrieval workflow', async () => {
      // Mock successful URL shortening
      const mockStoredLink = {
        id: 1,
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: '2024-01-01T00:00:00Z',
        isActive: true,
        clickCount: 0
      };

      // Mock collision check (first call) and then storage (second call)
      (mockStatement.first as any)
        .mockResolvedValueOnce(null) // No collision
        .mockResolvedValueOnce(mockStoredLink); // Storage result
      (mockEnv.URL_CACHE.put as any).mockResolvedValue(undefined);

      // Step 1: Create short URL
      const shortenRequest = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });

      const shortenResponse = await worker.fetch(shortenRequest, mockEnv, mockCtx);
      const shortenResult = await shortenResponse.json();

      expect(shortenResponse.status).toBe(201);
      expect(shortenResult.shortCode).toBe('abc123');
      expect(shortenResult.originalUrl).toBe('https://example.com');

      // Step 2: Retrieve the created link
      (mockStatement.first as any).mockResolvedValueOnce(mockStoredLink);

      const getRequest = new Request('https://shortener.com/links/abc123', {
        method: 'GET'
      });

      const getResponse = await worker.fetch(getRequest, mockEnv, mockCtx);
      const getResult = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getResult.shortCode).toBe('abc123');
      expect(getResult.originalUrl).toBe('https://example.com');
      expect(getResult.clickCount).toBe(0);
    });

    it('should handle URL shortening with custom expiration', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const mockStoredLink = {
        id: 1,
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: futureDate,
        isActive: true,
        clickCount: 0
      };

      (mockStatement.first as any)
        .mockResolvedValueOnce(null) // No collision
        .mockResolvedValueOnce(mockStoredLink); // Storage result
      (mockEnv.URL_CACHE.put as any).mockResolvedValue(undefined);

      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: 'https://example.com',
          expiresAt: futureDate
        })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.expiresAt).toBe(futureDate);
    });

    it('should handle user link management workflow', async () => {
      const userId = 'user123';
      const mockLinks = [
        {
          id: 1,
          shortCode: 'abc123',
          originalUrl: 'https://example.com',
          createdAt: '2024-01-01T00:00:00Z',
          isActive: true,
          clickCount: 5
        },
        {
          id: 2,
          shortCode: 'def456',
          originalUrl: 'https://google.com',
          createdAt: '2024-01-02T00:00:00Z',
          isActive: true,
          clickCount: 10
        }
      ];

      // Mock getUserLinks response
      (mockStatement.all as any).mockResolvedValue({ results: mockLinks });
      (mockStatement.first as any).mockResolvedValue({ total: 2 });

      // Get user's links
      const getLinksRequest = new Request('https://shortener.com/links?limit=10&offset=0', {
        method: 'GET',
        headers: {
          'X-User-ID': userId
        }
      });

      const getLinksResponse = await worker.fetch(getLinksRequest, mockEnv, mockCtx);
      const getLinksResult = await getLinksResponse.json();

      expect(getLinksResponse.status).toBe(200);
      expect(getLinksResult.links).toHaveLength(2);
      expect(getLinksResult.total).toBe(2);
      expect(getLinksResult.links[0].shortCode).toBe('abc123');
      expect(getLinksResult.links[1].shortCode).toBe('def456');

      // Delete a link
      (mockStatement.run as any).mockResolvedValue({ changes: 1 });
      (mockEnv.URL_CACHE.delete as any).mockResolvedValue(undefined);

      const deleteRequest = new Request('https://shortener.com/links/abc123', {
        method: 'DELETE',
        headers: {
          'X-User-ID': userId
        }
      });

      const deleteResponse = await worker.fetch(deleteRequest, mockEnv, mockCtx);
      const deleteResult = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteResult.success).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database failures gracefully', async () => {
      // Mock database failure
      (mockStatement.first as any).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle KV cache failures gracefully', async () => {
      // Mock successful database but failed cache
      const mockStoredLink = {
        id: 1,
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: '2024-01-01T00:00:00Z',
        isActive: true,
        clickCount: 0
      };

      (mockStatement.first as any)
        .mockResolvedValueOnce(null) // No collision
        .mockResolvedValueOnce(mockStoredLink); // Storage result
      (mockEnv.URL_CACHE.put as any).mockRejectedValue(new Error('KV cache failed'));

      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      // Should still succeed despite cache failure
      expect(response.status).toBe(201);
      expect(result.shortCode).toBe('abc123');
    });

    it('should handle validation errors properly', async () => {
      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'invalid-url' })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe('INVALID_URL');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Test that the system can handle multiple requests without crashing
      const requests = Array.from({ length: 3 }, (_, i) => 
        worker.fetch(new Request('https://shortener.com/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `invalid-url-${i}` }) // Use invalid URLs to get consistent 400 responses
        }), mockEnv, mockCtx)
      );

      const responses = await Promise.all(requests);
      
      // All requests should complete with validation errors
      responses.forEach(response => {
        expect(response.status).toBe(400);
      });

      // Should have processed all requests
      expect(responses).toHaveLength(3);
    });

    it('should handle large payloads appropriately', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000); // 2KB URL
      
      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: longUrl })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      // Should handle long URLs appropriately
      expect(response.status).toBe(400);
      expect(result.error.code).toBe('INVALID_URL');
    });
  });
});