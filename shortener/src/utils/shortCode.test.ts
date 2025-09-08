import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateShortCode, 
  checkCodeExists, 
  generateUniqueShortCode, 
  isValidShortCode 
} from './shortCode';

// Mock D1Database
const mockDb = {
  prepare: vi.fn(),
} as unknown as D1Database;

const mockStatement = {
  bind: vi.fn(),
  first: vi.fn(),
};

describe('shortCode utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockDb.prepare as any).mockReturnValue(mockStatement);
    (mockStatement.bind as any).mockReturnValue(mockStatement);
  });

  describe('generateShortCode', () => {
    it('should generate a code of default length 6', () => {
      const code = generateShortCode();
      expect(code).toHaveLength(6);
    });

    it('should generate a code of specified length', () => {
      const code = generateShortCode(8);
      expect(code).toHaveLength(8);
    });

    it('should only contain Base62 characters', () => {
      const code = generateShortCode(10);
      expect(code).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should generate different codes on multiple calls', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateShortCode());
      }
      // With Base62 and length 6, collision probability is very low
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe('checkCodeExists', () => {
    it('should return true when code exists', async () => {
      (mockStatement.first as any).mockResolvedValue({ id: 1 });
      
      const exists = await checkCodeExists('abc123', mockDb);
      
      expect(exists).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT 1 FROM links WHERE short_code = ?');
      expect(mockStatement.bind).toHaveBeenCalledWith('abc123');
    });

    it('should return false when code does not exist', async () => {
      (mockStatement.first as any).mockResolvedValue(null);
      
      const exists = await checkCodeExists('xyz789', mockDb);
      
      expect(exists).toBe(false);
    });
  });

  describe('generateUniqueShortCode', () => {
    it('should return a unique code on first attempt', async () => {
      (mockStatement.first as any).mockResolvedValue(null);
      
      const code = await generateUniqueShortCode(mockDb);
      
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[a-zA-Z0-9]+$/);
      expect(mockDb.prepare).toHaveBeenCalledTimes(1);
    });

    it('should retry and return unique code after collision', async () => {
      (mockStatement.first as any)
        .mockResolvedValueOnce({ id: 1 }) // First attempt: collision
        .mockResolvedValueOnce(null);     // Second attempt: unique
      
      const code = await generateUniqueShortCode(mockDb);
      
      expect(code).toHaveLength(6);
      expect(mockDb.prepare).toHaveBeenCalledTimes(2);
    });

    it('should increase code length after multiple collisions', async () => {
      (mockStatement.first as any)
        .mockResolvedValueOnce({ id: 1 }) // Attempt 1: collision
        .mockResolvedValueOnce({ id: 1 }) // Attempt 2: collision
        .mockResolvedValueOnce(null);     // Attempt 3: unique (length increased)
      
      const code = await generateUniqueShortCode(mockDb);
      
      expect(code).toHaveLength(7); // Length increased after 2 attempts
      expect(mockDb.prepare).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      (mockStatement.first as any).mockResolvedValue({ id: 1 }); // Always collision
      
      await expect(generateUniqueShortCode(mockDb, 6, 3))
        .rejects.toThrow('Failed to generate unique short code after 3 attempts');
      
      expect(mockDb.prepare).toHaveBeenCalledTimes(3);
    });

    it('should respect custom length parameter', async () => {
      (mockStatement.first as any).mockResolvedValue(null);
      
      const code = await generateUniqueShortCode(mockDb, 8);
      
      expect(code).toHaveLength(8);
    });
  });

  describe('isValidShortCode', () => {
    it('should return true for valid codes', () => {
      expect(isValidShortCode('abc123')).toBe(true);
      expect(isValidShortCode('XYZ789')).toBe(true);
      expect(isValidShortCode('aBc123XyZ')).toBe(true);
    });

    it('should return false for codes that are too short', () => {
      expect(isValidShortCode('ab')).toBe(false);
      expect(isValidShortCode('a')).toBe(false);
      expect(isValidShortCode('')).toBe(false);
    });

    it('should return false for codes that are too long', () => {
      expect(isValidShortCode('abcdefghijklm')).toBe(false); // 13 characters
    });

    it('should return false for codes with invalid characters', () => {
      expect(isValidShortCode('abc-123')).toBe(false);
      expect(isValidShortCode('abc_123')).toBe(false);
      expect(isValidShortCode('abc@123')).toBe(false);
      expect(isValidShortCode('abc 123')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isValidShortCode(null as any)).toBe(false);
      expect(isValidShortCode(undefined as any)).toBe(false);
    });
  });
});