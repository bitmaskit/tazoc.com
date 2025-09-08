import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  isValidUrlFormat, 
  isUrlAccessible, 
  validateUrl, 
  normalizeUrl 
} from './urlValidation';

// Mock fetch globally
global.fetch = vi.fn();

describe('urlValidation utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidUrlFormat', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(isValidUrlFormat('http://example.com')).toBe(true);
      expect(isValidUrlFormat('http://www.example.com')).toBe(true);
      expect(isValidUrlFormat('http://example.com/path')).toBe(true);
      expect(isValidUrlFormat('http://example.com:8080')).toBe(true);
    });

    it('should return true for valid HTTPS URLs', () => {
      expect(isValidUrlFormat('https://example.com')).toBe(true);
      expect(isValidUrlFormat('https://www.example.com')).toBe(true);
      expect(isValidUrlFormat('https://example.com/path?query=1')).toBe(true);
    });

    it('should return false for invalid protocols', () => {
      expect(isValidUrlFormat('ftp://example.com')).toBe(false);
      expect(isValidUrlFormat('file:///path/to/file')).toBe(false);
      expect(isValidUrlFormat('javascript:alert(1)')).toBe(false);
    });

    it('should return false for localhost URLs', () => {
      expect(isValidUrlFormat('http://localhost')).toBe(false);
      expect(isValidUrlFormat('http://127.0.0.1')).toBe(false);
      expect(isValidUrlFormat('http://::1')).toBe(false);
    });

    it('should return false for private IP ranges', () => {
      expect(isValidUrlFormat('http://10.0.0.1')).toBe(false);
      expect(isValidUrlFormat('http://172.16.0.1')).toBe(false);
      expect(isValidUrlFormat('http://192.168.1.1')).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(isValidUrlFormat('')).toBe(false);
      expect(isValidUrlFormat('not-a-url')).toBe(false);
      expect(isValidUrlFormat('http://')).toBe(false);
      expect(isValidUrlFormat(null as any)).toBe(false);
      expect(isValidUrlFormat(undefined as any)).toBe(false);
    });
  });

  describe('isUrlAccessible', () => {
    it('should return true for accessible URLs', async () => {
      (global.fetch as any).mockResolvedValue({
        status: 200
      });

      const result = await isUrlAccessible('https://example.com');
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'HEAD',
        signal: expect.any(AbortSignal),
        headers: {
          'User-Agent': 'URL-Shortener-Bot/1.0'
        }
      });
    });

    it('should return true for redirect responses', async () => {
      (global.fetch as any).mockResolvedValue({
        status: 301
      });

      const result = await isUrlAccessible('https://example.com');
      expect(result).toBe(true);
    });

    it('should return false for client error responses', async () => {
      (global.fetch as any).mockResolvedValue({
        status: 404
      });

      const result = await isUrlAccessible('https://example.com');
      expect(result).toBe(false);
    });

    it('should return false for server error responses', async () => {
      (global.fetch as any).mockResolvedValue({
        status: 500
      });

      const result = await isUrlAccessible('https://example.com');
      expect(result).toBe(false);
    });

    it('should return false when fetch throws an error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await isUrlAccessible('https://example.com');
      expect(result).toBe(false);
    });

    it('should handle timeout correctly', async () => {
      // Mock a slow response that will be aborted
      (global.fetch as any).mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => resolve({ status: 200 }), 1000);
          // Simulate abort signal behavior
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      const result = await isUrlAccessible('https://example.com', 100);
      expect(result).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should return valid for properly formatted and accessible URLs', async () => {
      (global.fetch as any).mockResolvedValue({ status: 200 });

      const result = await validateUrl('https://example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for malformed URLs', async () => {
      const result = await validateUrl('not-a-url');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL format or unsupported protocol');
    });

    it('should return invalid for inaccessible URLs when checking accessibility', async () => {
      (global.fetch as any).mockResolvedValue({ status: 404 });

      const result = await validateUrl('https://example.com');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL is not accessible or returned an error');
    });

    it('should skip accessibility check when disabled', async () => {
      const result = await validateUrl('https://example.com', false);
      
      expect(result.isValid).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('normalizeUrl', () => {
    it('should add https:// to URLs without protocol', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com/');
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com/');
    });

    it('should preserve existing protocols', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
      expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('should remove trailing slashes from paths', () => {
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
      expect(normalizeUrl('https://example.com/path/subpath/')).toBe('https://example.com/path/subpath');
    });

    it('should preserve root path slash', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
      expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('should preserve query parameters and fragments', () => {
      expect(normalizeUrl('https://example.com/path?query=1')).toBe('https://example.com/path?query=1');
      expect(normalizeUrl('https://example.com/path#fragment')).toBe('https://example.com/path#fragment');
    });

    it('should handle malformed URLs gracefully', () => {
      expect(normalizeUrl('not-a-url')).toBe('https://not-a-url/');
    });

    it('should trim whitespace', () => {
      expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com/');
    });
  });
});