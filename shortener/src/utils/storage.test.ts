import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  storeInDatabase,
  cacheInKV,
  storeUrlMapping,
  getFromCache,
  getFromDatabase,
  getUrlMapping,
  deleteUrlMapping,
  incrementClickCount,
  type LinkData,
  type StorageEnv
} from './storage';

// Mock D1Database and KVNamespace
const mockDb = {
  prepare: vi.fn(),
} as unknown as D1Database;

const mockKv = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
} as unknown as KVNamespace;

const mockStatement = {
  bind: vi.fn(),
  first: vi.fn(),
  run: vi.fn(),
};

const mockEnv: StorageEnv = {
  DB: mockDb,
  KV: mockKv
};

const sampleLinkData: LinkData = {
  shortCode: 'abc123',
  originalUrl: 'https://example.com',
  createdAt: '2024-01-01T00:00:00Z',
  isActive: true
};

describe('storage utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockDb.prepare as any).mockReturnValue(mockStatement);
    (mockStatement.bind as any).mockReturnValue(mockStatement);
  });

  describe('storeInDatabase', () => {
    it('should store link data and return result with ID', async () => {
      const expectedResult = { ...sampleLinkData, id: 1, clickCount: 0 };
      (mockStatement.first as any).mockResolvedValue(expectedResult);

      const result = await storeInDatabase(sampleLinkData, mockDb);

      expect(result).toEqual(expectedResult);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO links'));
      expect(mockStatement.bind).toHaveBeenCalledWith(
        'abc123',
        'https://example.com',
        '2024-01-01T00:00:00Z',
        null,
        1,
        null
      );
    });

    it('should handle expires_at when provided', async () => {
      const linkWithExpiry = { ...sampleLinkData, expiresAt: '2024-12-31T23:59:59Z' };
      const expectedResult = { ...linkWithExpiry, id: 1, clickCount: 0 };
      (mockStatement.first as any).mockResolvedValue(expectedResult);

      await storeInDatabase(linkWithExpiry, mockDb);

      expect(mockStatement.bind).toHaveBeenCalledWith(
        'abc123',
        'https://example.com',
        '2024-01-01T00:00:00Z',
        '2024-12-31T23:59:59Z',
        1,
        null
      );
    });

    it('should throw error when database operation fails', async () => {
      (mockStatement.first as any).mockResolvedValue(null);

      await expect(storeInDatabase(sampleLinkData, mockDb))
        .rejects.toThrow('Failed to store link in database');
    });
  });

  describe('cacheInKV', () => {
    it('should cache link data with default TTL', async () => {
      (mockKv.put as any).mockResolvedValue(undefined);

      await cacheInKV('abc123', sampleLinkData, mockKv);

      expect(mockKv.put).toHaveBeenCalledWith(
        'link:abc123',
        expect.stringContaining('"originalUrl":"https://example.com"'),
        { expirationTtl: 86400 }
      );
    });

    it('should cache link data with custom TTL', async () => {
      (mockKv.put as any).mockResolvedValue(undefined);

      await cacheInKV('abc123', sampleLinkData, mockKv, 3600);

      expect(mockKv.put).toHaveBeenCalledWith(
        'link:abc123',
        expect.any(String),
        { expirationTtl: 3600 }
      );
    });
  });

  describe('storeUrlMapping', () => {
    it('should store in database and cache in KV', async () => {
      const expectedResult = { ...sampleLinkData, id: 1, clickCount: 0 };
      (mockStatement.first as any).mockResolvedValue(expectedResult);
      (mockKv.put as any).mockResolvedValue(undefined);

      const result = await storeUrlMapping(sampleLinkData, mockEnv);

      expect(result).toEqual(expectedResult);
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockKv.put).toHaveBeenCalled();
    });

    it('should handle unique constraint violations', async () => {
      const error = new Error('UNIQUE constraint failed: links.short_code');
      (mockStatement.first as any).mockRejectedValue(error);

      await expect(storeUrlMapping(sampleLinkData, mockEnv))
        .rejects.toThrow('Short code already exists');
    });

    it('should continue if KV caching fails', async () => {
      const expectedResult = { ...sampleLinkData, id: 1, clickCount: 0 };
      (mockStatement.first as any).mockResolvedValue(expectedResult);
      (mockKv.put as any).mockRejectedValue(new Error('KV error'));

      // Should not throw despite KV error
      const result = await storeUrlMapping(sampleLinkData, mockEnv);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getFromCache', () => {
    it('should retrieve cached link data', async () => {
      const cachedData = {
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        cachedAt: '2024-01-01T00:00:00Z'
      };
      (mockKv.get as any).mockResolvedValue(cachedData);

      const result = await getFromCache('abc123', mockKv);

      expect(result).toEqual({
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        createdAt: '2024-01-01T00:00:00Z'
      });
      expect(mockKv.get).toHaveBeenCalledWith('link:abc123', 'json');
    });

    it('should return null when not found in cache', async () => {
      (mockKv.get as any).mockResolvedValue(null);

      const result = await getFromCache('abc123', mockKv);

      expect(result).toBeNull();
    });

    it('should return null when KV operation fails', async () => {
      (mockKv.get as any).mockRejectedValue(new Error('KV error'));

      const result = await getFromCache('abc123', mockKv);

      expect(result).toBeNull();
    });
  });

  describe('getFromDatabase', () => {
    it('should retrieve link data from database', async () => {
      const dbResult = { ...sampleLinkData, id: 1, clickCount: 5 };
      (mockStatement.first as any).mockResolvedValue(dbResult);

      const result = await getFromDatabase('abc123', mockDb);

      expect(result).toEqual(dbResult);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(mockStatement.bind).toHaveBeenCalledWith('abc123');
    });

    it('should return null when not found in database', async () => {
      (mockStatement.first as any).mockResolvedValue(null);

      const result = await getFromDatabase('abc123', mockDb);

      expect(result).toBeNull();
    });
  });

  describe('getUrlMapping', () => {
    it('should return cached data when available', async () => {
      const cachedData = {
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        createdAt: '2024-01-01T00:00:00Z'
      };
      (mockKv.get as any).mockResolvedValue({
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        cachedAt: '2024-01-01T00:00:00Z'
      });

      const result = await getUrlMapping('abc123', mockEnv);

      expect(result).toEqual(cachedData);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    it('should fallback to database when cache miss', async () => {
      const dbResult = { ...sampleLinkData, id: 1, clickCount: 5 };
      (mockKv.get as any).mockResolvedValue(null);
      (mockStatement.first as any).mockResolvedValue(dbResult);
      (mockKv.put as any).mockResolvedValue(undefined);

      const result = await getUrlMapping('abc123', mockEnv);

      expect(result).toEqual(dbResult);
      expect(mockKv.get).toHaveBeenCalled();
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockKv.put).toHaveBeenCalled(); // Cache warming
    });

    it('should return null when not found anywhere', async () => {
      (mockKv.get as any).mockResolvedValue(null);
      (mockStatement.first as any).mockResolvedValue(null);

      const result = await getUrlMapping('abc123', mockEnv);

      expect(result).toBeNull();
    });
  });

  describe('deleteUrlMapping', () => {
    it('should soft delete from database and remove from cache', async () => {
      (mockStatement.run as any).mockResolvedValue({ changes: 1 });
      (mockKv.delete as any).mockResolvedValue(undefined);

      const result = await deleteUrlMapping('abc123', mockEnv);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE links'));
      expect(mockStatement.bind).toHaveBeenCalledWith('abc123');
      expect(mockKv.delete).toHaveBeenCalledWith('link:abc123');
    });

    it('should return false when link not found', async () => {
      (mockStatement.run as any).mockResolvedValue({ changes: 0 });

      const result = await deleteUrlMapping('abc123', mockEnv);

      expect(result).toBe(false);
      expect(mockKv.delete).not.toHaveBeenCalled();
    });

    it('should continue if cache deletion fails', async () => {
      (mockStatement.run as any).mockResolvedValue({ changes: 1 });
      (mockKv.delete as any).mockRejectedValue(new Error('KV error'));

      // Should not throw despite KV error
      const result = await deleteUrlMapping('abc123', mockEnv);
      expect(result).toBe(true);
    });
  });

  describe('incrementClickCount', () => {
    it('should increment click count for existing link', async () => {
      (mockStatement.run as any).mockResolvedValue({ changes: 1 });

      await incrementClickCount('abc123', mockDb);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE links'));
      expect(mockStatement.bind).toHaveBeenCalledWith('abc123');
    });

    it('should handle links with null click count', async () => {
      (mockStatement.run as any).mockResolvedValue({ changes: 1 });

      await incrementClickCount('abc123', mockDb);

      // Should use COALESCE to handle null values
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('COALESCE(click_count, 0) + 1'));
    });
  });
});