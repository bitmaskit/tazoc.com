import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the utility modules
vi.mock('./utils/shortCode', () => ({
  generateUniqueShortCode: vi.fn()
}));

vi.mock('./utils/urlValidation', () => ({
  validateUrl: vi.fn(),
  normalizeUrl: vi.fn()
}));

vi.mock('./utils/storage', () => ({
  storeUrlMapping: vi.fn(),
  getUrlMapping: vi.fn(),
  deleteUrlMapping: vi.fn(),
  getUserLinks: vi.fn(),
  deleteUserLink: vi.fn()
}));

import { generateUniqueShortCode } from './utils/shortCode';
import { validateUrl, normalizeUrl } from './utils/urlValidation';
import { storeUrlMapping, getUrlMapping, deleteUrlMapping, getUserLinks, deleteUserLink } from './utils/storage';

// Import the worker
import worker from './index';

// Mock environment
const mockEnv = {
  DB: {} as D1Database,
  KV: {} as KVNamespace,
  shortener_analytics: {} as Queue
} as Env;

const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {}
} as ExecutionContext;

describe('Shortener Worker API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (normalizeUrl as any).mockImplementation((url: string) => url);
    (validateUrl as any).mockResolvedValue({ isValid: true });
    (generateUniqueShortCode as any).mockResolvedValue('abc123');
  });

  describe('POST /shorten', () => {
    it('should create a short URL successfully', async () => {
      const mockStoredLink = {
        id: 1,
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: '2024-01-01T00:00:00Z',
        isActive: true,
        clickCount: 0
      };

      (storeUrlMapping as any).mockResolvedValue(mockStoredLink);

      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.shortCode).toBe('abc123');
      expect(result.originalUrl).toBe('https://example.com');
      expect(result.shortUrl).toContain('abc123');
      expect(normalizeUrl).toHaveBeenCalledWith('https://example.com');
      expect(validateUrl).toHaveBeenCalled();
      expect(generateUniqueShortCode).toHaveBeenCalledWith(mockEnv.URL_DB);
      expect(storeUrlMapping).toHaveBeenCalled();
    });

    it('should return error for missing URL', async () => {
      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe('MISSING_URL');
      expect(result.error.message).toBe('URL is required');
    });

    it('should return error for invalid URL', async () => {
      (validateUrl as any).mockResolvedValue({ 
        isValid: false, 
        error: 'Invalid URL format' 
      });

      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'invalid-url' })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe('INVALID_URL');
      expect(result.error.message).toBe('Invalid URL format');
    });

    it('should handle custom expiration date', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 24 hours from now
      const mockStoredLink = {
        id: 1,
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: futureDate,
        isActive: true,
        clickCount: 0
      };

      (storeUrlMapping as any).mockResolvedValue(mockStoredLink);

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

    it('should return error for past expiration date', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago

      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: 'https://example.com',
          expiresAt: pastDate
        })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe('INVALID_EXPIRY');
    });

    it('should handle short code collision error', async () => {
      (storeUrlMapping as any).mockRejectedValue(new Error('Short code already exists'));

      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.error.code).toBe('CODE_EXISTS');
    });
  });

  describe('GET /links/:shortCode', () => {
    it('should retrieve link details successfully', async () => {
      const mockLinkData = {
        id: 1,
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: '2024-01-01T00:00:00Z',
        isActive: true,
        clickCount: 5
      };

      (getUrlMapping as any).mockResolvedValue(mockLinkData);

      const request = new Request('https://shortener.com/links/abc123', {
        method: 'GET'
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.shortCode).toBe('abc123');
      expect(result.originalUrl).toBe('https://example.com');
      expect(result.clickCount).toBe(5);
      expect(getUrlMapping).toHaveBeenCalledWith('abc123', { DB: mockEnv.URL_DB, KV: mockEnv.URL_CACHE });
    });

    it('should return 404 for non-existent link', async () => {
      (getUrlMapping as any).mockResolvedValue(null);

      const request = new Request('https://shortener.com/links/nonexistent', {
        method: 'GET'
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error.code).toBe('LINK_NOT_FOUND');
    });

    it('should return error for missing short code', async () => {
      const request = new Request('https://shortener.com/links/', {
        method: 'GET'
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe('INVALID_PATH');
    });
  });

  describe('DELETE /links/:shortCode', () => {
    it('should delete link successfully', async () => {
      (deleteUserLink as any).mockResolvedValue({ success: true });

      const request = new Request('https://shortener.com/links/abc123', {
        method: 'DELETE',
        headers: {
          'X-User-ID': '1'
        }
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(deleteUserLink).toHaveBeenCalledWith('abc123', '1', { DB: mockEnv.URL_DB, KV: mockEnv.URL_CACHE });
    });

    it('should return 404 for non-existent link', async () => {
      (deleteUserLink as any).mockResolvedValue({ success: false, error: 'Link not found or access denied' });

      const request = new Request('https://shortener.com/links/nonexistent', {
        method: 'DELETE',
        headers: {
          'X-User-ID': '1'
        }
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error.code).toBe('LINK_NOT_FOUND');
    });
  });

  describe('GET /links', () => {
    it('should return links list with pagination', async () => {
      (getUserLinks as any).mockResolvedValue({ links: [], total: 0 });

      const request = new Request('https://shortener.com/links?limit=10&offset=0', {
        method: 'GET',
        headers: {
          'X-User-ID': '1'
        }
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.links).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(getUserLinks).toHaveBeenCalledWith('1', { DB: mockEnv.URL_DB, KV: mockEnv.URL_CACHE }, 10, 0);
    });

    it('should handle default pagination parameters', async () => {
      (getUserLinks as any).mockResolvedValue({ links: [], total: 0 });

      const request = new Request('https://shortener.com/links', {
        method: 'GET',
        headers: {
          'X-User-ID': '1'
        }
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(getUserLinks).toHaveBeenCalledWith('1', { DB: mockEnv.URL_DB, KV: mockEnv.URL_CACHE }, 50, 0);
    });

    it('should limit maximum page size', async () => {
      (getUserLinks as any).mockResolvedValue({ links: [], total: 0 });

      const request = new Request('https://shortener.com/links?limit=200', {
        method: 'GET',
        headers: {
          'X-User-ID': '1'
        }
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.limit).toBe(100); // Should be capped at 100
      expect(getUserLinks).toHaveBeenCalledWith('1', { DB: mockEnv.URL_DB, KV: mockEnv.URL_CACHE }, 100, 0);
    });
  });

  describe('CORS and OPTIONS', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const request = new Request('https://shortener.com/shorten', {
        method: 'OPTIONS'
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });

    it('should add CORS headers to all responses', async () => {
      const request = new Request('https://shortener.com/nonexistent', {
        method: 'GET'
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const request = new Request('https://shortener.com/unknown', {
        method: 'GET'
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it('should handle JSON parsing errors', async () => {
      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });

    it('should include request ID and timestamp in error responses', async () => {
      const request = new Request('https://shortener.com/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);
      const result = await response.json();

      expect(result.timestamp).toBeTruthy();
      expect(result.requestId).toBeTruthy();
      expect(typeof result.requestId).toBe('string');
    });
  });
});