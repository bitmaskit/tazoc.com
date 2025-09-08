/**
 * Short code generation utility using Base62 encoding
 * Provides collision detection and retry logic for unique code generation
 */

const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a random short code using Base62 encoding
 * @param length - Length of the code to generate (default: 6)
 * @returns Random short code string
 */
export function generateShortCode(length: number = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE62_CHARS.charAt(Math.floor(Math.random() * BASE62_CHARS.length));
  }
  return result;
}

/**
 * Check if a short code already exists in the database
 * @param shortCode - The code to check
 * @param db - D1 database instance
 * @returns Promise<boolean> - true if code exists, false otherwise
 */
export async function checkCodeExists(shortCode: string, db: D1Database): Promise<boolean> {
  const result = await db.prepare('SELECT 1 FROM links WHERE short_code = ?')
    .bind(shortCode)
    .first();
  
  return result !== null;
}

/**
 * Generate a unique short code with collision detection
 * @param db - D1 database instance
 * @param length - Initial length of the code (default: 6)
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns Promise<string> - Unique short code
 * @throws Error if unable to generate unique code after max retries
 */
export async function generateUniqueShortCode(
  db: D1Database, 
  length: number = 6, 
  maxRetries: number = 5
): Promise<string> {
  let attempts = 0;
  let currentLength = length;
  
  while (attempts < maxRetries) {
    const shortCode = generateShortCode(currentLength);
    const exists = await checkCodeExists(shortCode, db);
    
    if (!exists) {
      return shortCode;
    }
    
    attempts++;
    
    // Increase length after every 2 failed attempts to reduce collision probability
    if (attempts % 2 === 0) {
      currentLength++;
    }
  }
  
  throw new Error(`Failed to generate unique short code after ${maxRetries} attempts`);
}

/**
 * Validate that a short code contains only valid Base62 characters
 * @param shortCode - The code to validate
 * @returns boolean - true if valid, false otherwise
 */
export function isValidShortCode(shortCode: string): boolean {
  if (!shortCode || shortCode.length < 3 || shortCode.length > 12) {
    return false;
  }
  
  return /^[a-zA-Z0-9]+$/.test(shortCode);
}