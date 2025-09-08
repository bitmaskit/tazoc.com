/**
 * URL validation utilities
 * Provides comprehensive URL validation including format and accessibility checks
 */

/**
 * Validate URL format and protocol
 * @param url - The URL string to validate
 * @returns boolean - true if URL format is valid
 */
export function isValidUrlFormat(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Ensure hostname is present
    if (!parsed.hostname) {
      return false;
    }

    // Block localhost and private IP ranges for security
    if (isLocalOrPrivateUrl(parsed.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if hostname is localhost or private IP range
 * @param hostname - The hostname to check
 * @returns boolean - true if hostname is local/private
 */
function isLocalOrPrivateUrl(hostname: string): boolean {
  // Block localhost variations
  if (['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase())) {
    return true;
  }

  // Block private IP ranges (basic check)
  if (hostname.match(/^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./)) {
    return true;
  }

  return false;
}

/**
 * Check if URL is accessible by making a HEAD request
 * @param url - The URL to check
 * @param timeoutMs - Request timeout in milliseconds (default: 5000)
 * @returns Promise<boolean> - true if URL is accessible
 */
export async function isUrlAccessible(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'URL-Shortener-Bot/1.0'
      }
    });

    clearTimeout(timeoutId);

    // Consider 2xx and 3xx status codes as accessible
    return response.status >= 200 && response.status < 400;
  } catch (error) {
    return false;
  }
}

/**
 * Comprehensive URL validation combining format and accessibility checks
 * @param url - The URL to validate
 * @param checkAccessibility - Whether to check if URL is accessible (default: true)
 * @returns Promise<{isValid: boolean, error?: string}> - Validation result
 */
export async function validateUrl(
  url: string, 
  checkAccessibility: boolean = true
): Promise<{isValid: boolean, error?: string}> {
  // First check format
  if (!isValidUrlFormat(url)) {
    return {
      isValid: false,
      error: 'Invalid URL format or unsupported protocol'
    };
  }

  // Optionally check accessibility
  if (checkAccessibility) {
    const isAccessible = await isUrlAccessible(url);
    if (!isAccessible) {
      return {
        isValid: false,
        error: 'URL is not accessible or returned an error'
      };
    }
  }

  return { isValid: true };
}

/**
 * Normalize URL by ensuring it has a protocol and removing trailing slashes
 * @param url - The URL to normalize
 * @returns string - Normalized URL
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Add https:// if no protocol is specified
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    
    // Remove trailing slash from pathname unless it's the root
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return normalized;
  }
}