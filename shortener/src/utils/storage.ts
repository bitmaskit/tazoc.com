/**
 * Storage utilities for URL mappings
 * Handles D1 database operations and KV caching
 */

export interface LinkData {
  id?: number;
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  clickCount?: number;
  createdBy?: string; // User ID who created the link
}

export interface StorageEnv {
  DB: D1Database;
  KV: KVNamespace;
}

/**
 * Store URL mapping in D1 database
 * @param linkData - The link data to store
 * @param db - D1 database instance
 * @returns Promise<LinkData> - Stored link data with ID
 */
export async function storeInDatabase(linkData: LinkData, db: D1Database): Promise<LinkData> {
  const query = `
    INSERT INTO links (short_code, destination, created_at, expires_at, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING id, short_code, destination as original_url, created_at, expires_at, is_active, click_count, created_by
  `;

  const result = await db.prepare(query)
    .bind(
      linkData.shortCode,
      linkData.originalUrl,
      linkData.createdAt,
      linkData.expiresAt || null,
      linkData.isActive ? 1 : 0,
      linkData.createdBy || null
    )
    .first<LinkData>();

  if (!result) {
    throw new Error('Failed to store link in database');
  }

  return result;
}

/**
 * Cache URL mapping in KV store
 * @param shortCode - The short code key
 * @param linkData - The link data to cache
 * @param kv - KV namespace instance
 * @param ttlSeconds - TTL in seconds (default: 86400 = 24 hours)
 */
export async function cacheInKV(
  shortCode: string, 
  linkData: LinkData, 
  kv: KVNamespace, 
  ttlSeconds: number = 86400
): Promise<void> {
  const cacheData = {
    originalUrl: linkData.originalUrl,
    isActive: linkData.isActive,
    expiresAt: linkData.expiresAt,
    cachedAt: new Date().toISOString()
  };

  await kv.put(
    `link:${shortCode}`, 
    JSON.stringify(cacheData),
    { expirationTtl: ttlSeconds }
  );
}

/**
 * Store URL mapping in both database and cache
 * @param linkData - The link data to store
 * @param env - Storage environment with DB and KV
 * @returns Promise<LinkData> - Stored link data
 */
export async function storeUrlMapping(linkData: LinkData, env: StorageEnv): Promise<LinkData> {
  try {
    // Store in database first
    const storedLink = await storeInDatabase(linkData, env.DB);

    // Cache in KV (fire-and-forget, don't block on cache failures)
    cacheInKV(linkData.shortCode, storedLink, env.KV).catch(error => {
      console.error('Failed to cache link in KV:', error);
    });

    return storedLink;
  } catch (error) {
    // Check if it's a unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Short code already exists');
    }
    throw error;
  }
}

/**
 * Retrieve URL mapping from cache
 * @param shortCode - The short code to look up
 * @param kv - KV namespace instance
 * @returns Promise<LinkData | null> - Cached link data or null if not found
 */
export async function getFromCache(shortCode: string, kv: KVNamespace): Promise<LinkData | null> {
  try {
    const cached = await kv.get(`link:${shortCode}`, 'json');
    if (!cached) {
      return null;
    }

    return {
      shortCode,
      originalUrl: cached.originalUrl,
      isActive: cached.isActive,
      expiresAt: cached.expiresAt,
      createdAt: cached.cachedAt // Use cached timestamp as fallback
    };
  } catch (error) {
    console.error('Failed to retrieve from cache:', error);
    return null;
  }
}

/**
 * Retrieve URL mapping from database
 * @param shortCode - The short code to look up
 * @param db - D1 database instance
 * @returns Promise<LinkData | null> - Link data or null if not found
 */
export async function getFromDatabase(shortCode: string, db: D1Database): Promise<LinkData | null> {
  const query = `
    SELECT id, short_code, destination as original_url, created_at, expires_at, is_active, click_count, created_by
    FROM links 
    WHERE short_code = ? AND is_active = 1
  `;

  const result = await db.prepare(query)
    .bind(shortCode)
    .first<LinkData>();

  return result || null;
}

/**
 * Retrieve URL mapping with cache-first strategy
 * @param shortCode - The short code to look up
 * @param env - Storage environment with DB and KV
 * @returns Promise<LinkData | null> - Link data or null if not found
 */
export async function getUrlMapping(shortCode: string, env: StorageEnv): Promise<LinkData | null> {
  // Try cache first
  let linkData = await getFromCache(shortCode, env.KV);
  
  if (linkData) {
    return linkData;
  }

  // Fallback to database
  linkData = await getFromDatabase(shortCode, env.DB);
  
  if (linkData) {
    // Warm the cache for next time (fire-and-forget)
    cacheInKV(shortCode, linkData, env.KV).catch(error => {
      console.error('Failed to warm cache:', error);
    });
  }

  return linkData;
}

/**
 * Delete URL mapping from both database and cache
 * @param shortCode - The short code to delete
 * @param env - Storage environment with DB and KV
 * @returns Promise<boolean> - true if deleted, false if not found
 */
export async function deleteUrlMapping(shortCode: string, env: StorageEnv): Promise<boolean> {
  // Soft delete in database (set is_active = 0)
  const query = `
    UPDATE links 
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
    WHERE short_code = ? AND is_active = 1
  `;

  const result = await env.DB.prepare(query)
    .bind(shortCode)
    .run();

  const wasDeleted = result.changes > 0;

  if (wasDeleted) {
    // Remove from cache (fire-and-forget)
    env.KV.delete(`link:${shortCode}`).catch(error => {
      console.error('Failed to delete from cache:', error);
    });
  }

  return wasDeleted;
}

/**
 * Increment click count for a short code
 * @param shortCode - The short code to increment
 * @param db - D1 database instance
 * @returns Promise<void>
 */
export async function incrementClickCount(shortCode: string, db: D1Database): Promise<void> {
  const query = `
    UPDATE links 
    SET click_count = COALESCE(click_count, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE short_code = ? AND is_active = 1
  `;

  await db.prepare(query)
    .bind(shortCode)
    .run();
}

/**
 * Get links for a specific user
 * @param userId - The user ID to filter by
 * @param env - Storage environment with DB and KV
 * @param limit - Maximum number of links to return
 * @param offset - Number of links to skip
 * @returns Promise<{links: LinkData[], total: number}> - User's links and total count
 */
export async function getUserLinks(
  userId: string, 
  env: StorageEnv, 
  limit: number = 50, 
  offset: number = 0
): Promise<{links: LinkData[], total: number}> {
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM links 
    WHERE created_by = ? AND is_active = 1
  `;
  
  const countResult = await env.DB.prepare(countQuery)
    .bind(userId)
    .first<{total: number}>();
  
  const total = countResult?.total || 0;

  // Get paginated links
  const linksQuery = `
    SELECT id, short_code, destination as original_url, created_at, expires_at, is_active, click_count, created_by
    FROM links 
    WHERE created_by = ? AND is_active = 1
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const linksResult = await env.DB.prepare(linksQuery)
    .bind(userId, limit, offset)
    .all<LinkData>();

  return {
    links: linksResult.results || [],
    total
  };
}

/**
 * Check if a user owns a specific link
 * @param shortCode - The short code to check
 * @param userId - The user ID to verify ownership
 * @param db - D1 database instance
 * @returns Promise<boolean> - true if user owns the link
 */
export async function checkLinkOwnership(shortCode: string, userId: string, db: D1Database): Promise<boolean> {
  const query = `
    SELECT 1
    FROM links 
    WHERE short_code = ? AND created_by = ? AND is_active = 1
  `;

  const result = await db.prepare(query)
    .bind(shortCode, userId)
    .first();

  return !!result;
}

/**
 * Delete URL mapping with ownership check
 * @param shortCode - The short code to delete
 * @param userId - The user ID requesting deletion
 * @param env - Storage environment with DB and KV
 * @returns Promise<{success: boolean, error?: string}> - Deletion result
 */
export async function deleteUserLink(
  shortCode: string, 
  userId: string, 
  env: StorageEnv
): Promise<{success: boolean, error?: string}> {
  // Check ownership first
  const ownsLink = await checkLinkOwnership(shortCode, userId, env.DB);
  
  if (!ownsLink) {
    return { success: false, error: 'Link not found or access denied' };
  }

  // Soft delete in database
  const query = `
    UPDATE links 
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
    WHERE short_code = ? AND created_by = ? AND is_active = 1
  `;

  const result = await env.DB.prepare(query)
    .bind(shortCode, userId)
    .run();

  const wasDeleted = result.changes > 0;

  if (wasDeleted) {
    // Remove from cache (fire-and-forget)
    env.KV.delete(`link:${shortCode}`).catch(error => {
      console.error('Failed to delete from cache:', error);
    });
  }

  return { success: wasDeleted };
}