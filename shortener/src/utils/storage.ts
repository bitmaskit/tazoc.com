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

interface CachedLinkData {
  originalUrl: string;
  isActive: boolean;
  expiresAt?: string;
  clickCount?: number;
  cachedAt: string;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  writes: number;
  invalidates: number;
  errors: number;
  totalRequests: number;
  avgTTL: number;
  ttlSum: number;
  ttlCount: number;
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
 * Calculate intelligent TTL based on usage patterns
 * @param linkData - The link data to analyze
 * @param isNewLink - Whether this is a newly created link
 * @returns TTL in seconds
 */
function calculateIntelligentTTL(linkData: LinkData, isNewLink: boolean = false): number {
  const baseNewLinkTTL = 3600; // 1 hour for new links
  const baseActiveLinkTTL = 86400; // 24 hours for active links
  const maxTTL = 604800; // 7 days maximum
  
  // For new links, use shorter TTL to allow for quick updates
  if (isNewLink) {
    return baseNewLinkTTL;
  }
  
  // Calculate TTL based on click count (higher clicks = longer cache)
  const clickCount = linkData.clickCount || 0;
  let ttl = baseActiveLinkTTL;
  
  if (clickCount > 100) {
    ttl = maxTTL; // Very popular links get max TTL
  } else if (clickCount > 10) {
    ttl = baseActiveLinkTTL * 2; // Popular links get 2x TTL
  } else if (clickCount === 0) {
    ttl = baseActiveLinkTTL / 2; // Unused links get shorter TTL
  }
  
  // Check if link has expiration
  if (linkData.expiresAt) {
    const expiryTime = new Date(linkData.expiresAt).getTime();
    const now = Date.now();
    const timeUntilExpiry = Math.floor((expiryTime - now) / 1000);
    
    // Don't cache longer than the link's expiry
    if (timeUntilExpiry > 0 && timeUntilExpiry < ttl) {
      ttl = timeUntilExpiry;
    }
  }
  
  return Math.min(ttl, maxTTL);
}

/**
 * Cache URL mapping in KV store with intelligent TTL
 * @param shortCode - The short code key
 * @param linkData - The link data to cache
 * @param kv - KV namespace instance
 * @param isNewLink - Whether this is a newly created link
 * @param customTTL - Override TTL calculation with custom value
 */
export async function cacheInKV(
  shortCode: string, 
  linkData: LinkData, 
  kv: KVNamespace, 
  isNewLink: boolean = false,
  customTTL?: number
): Promise<void> {
  const ttlSeconds = customTTL || calculateIntelligentTTL(linkData, isNewLink);
  
  const cacheData = {
    originalUrl: linkData.originalUrl,
    isActive: linkData.isActive,
    expiresAt: linkData.expiresAt,
    clickCount: linkData.clickCount || 0,
    cachedAt: new Date().toISOString(),
    ttl: ttlSeconds
  };

  await kv.put(
    `link:${shortCode}`, 
    JSON.stringify(cacheData),
    { expirationTtl: ttlSeconds }
  );
  
  // Store cache metrics for monitoring
  await storeCacheMetrics(kv, shortCode, 'write', ttlSeconds);
}

/**
 * Store URL mapping in both database and cache with cache warming
 * @param linkData - The link data to store
 * @param env - Storage environment with DB and KV
 * @returns Promise<LinkData> - Stored link data
 */
export async function storeUrlMapping(linkData: LinkData, env: StorageEnv): Promise<LinkData> {
  try {
    // Store in database first
    const storedLink = await storeInDatabase(linkData, env.DB);

    // Immediately warm cache for newly created URLs with shorter TTL
    await warmCacheForNewLink(storedLink.shortCode, storedLink, env.KV);

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
 * Warm cache for newly created links
 * @param shortCode - The short code to warm
 * @param linkData - The link data to cache
 * @param kv - KV namespace instance
 */
async function warmCacheForNewLink(shortCode: string, linkData: LinkData, kv: KVNamespace): Promise<void> {
  try {
    // Use shorter TTL for new links to allow for quick updates
    await cacheInKV(shortCode, linkData, kv, true);
    console.log(`Cache warmed for new link: ${shortCode}`);
  } catch (error) {
    console.error('Failed to warm cache for new link:', error);
    // Don't throw - cache warming failure shouldn't fail link creation
  }
}

/**
 * Retrieve URL mapping from cache with metrics tracking
 * @param shortCode - The short code to look up
 * @param kv - KV namespace instance
 * @returns Promise<LinkData | null> - Cached link data or null if not found
 */
export async function getFromCache(shortCode: string, kv: KVNamespace): Promise<LinkData | null> {
  try {
    const cached = await kv.get(`link:${shortCode}`, 'json') as CachedLinkData | null;
    if (!cached) {
      await storeCacheMetrics(kv, shortCode, 'miss');
      return null;
    }

    await storeCacheMetrics(kv, shortCode, 'hit');
    
    return {
      shortCode,
      originalUrl: cached.originalUrl,
      isActive: cached.isActive,
      expiresAt: cached.expiresAt,
      clickCount: cached.clickCount || 0,
      createdAt: cached.cachedAt // Use cached timestamp as fallback
    };
  } catch (error) {
    console.error('Failed to retrieve from cache:', error);
    await storeCacheMetrics(kv, shortCode, 'error');
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
 * Retrieve URL mapping with cache-first strategy and intelligent cache warming
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
    // Warm the cache for next time with intelligent TTL based on usage
    cacheInKV(shortCode, linkData, env.KV, false).catch(error => {
      console.error('Failed to warm cache:', error);
    });
  }

  return linkData;
}

/**
 * Delete URL mapping from both database and cache with immediate invalidation
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
    .run() as D1Result & { changes: number };

  const wasDeleted = result.changes > 0;

  if (wasDeleted) {
    // Immediately invalidate cache - don't use fire-and-forget for deletions
    await invalidateCache(shortCode, env.KV);
  }

  return wasDeleted;
}

/**
 * Invalidate cache entry for deleted links
 * @param shortCode - The short code to invalidate
 * @param kv - KV namespace instance
 */
async function invalidateCache(shortCode: string, kv: KVNamespace): Promise<void> {
  try {
    await kv.delete(`link:${shortCode}`);
    await storeCacheMetrics(kv, shortCode, 'invalidate');
    console.log(`Cache invalidated for deleted link: ${shortCode}`);
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
    // Don't throw - cache invalidation failure shouldn't fail deletion
  }
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
 * Delete URL mapping with ownership check and immediate cache invalidation
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
    .run() as D1Result & { changes: number };

  const wasDeleted = result.changes > 0;

  if (wasDeleted) {
    // Immediately invalidate cache - don't use fire-and-forget for deletions
    await invalidateCache(shortCode, env.KV);
  }

  return { success: wasDeleted };
}

/**
 * Store cache metrics for monitoring and optimization
 * @param kv - KV namespace instance
 * @param shortCode - The short code being accessed
 * @param operation - The cache operation (hit, miss, write, invalidate, error)
 * @param ttl - TTL used for write operations
 */
async function storeCacheMetrics(
  kv: KVNamespace, 
  shortCode: string, 
  operation: 'hit' | 'miss' | 'write' | 'invalidate' | 'error',
  ttl?: number
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const hour = timestamp.substring(0, 13); // YYYY-MM-DDTHH format for hourly aggregation
    
    const metricKey = `metrics:cache:${hour}`;
    
    // Get existing metrics for this hour
    const existingMetrics = (await kv.get(metricKey, 'json') as CacheMetrics | null) || {
      hits: 0,
      misses: 0,
      writes: 0,
      invalidates: 0,
      errors: 0,
      totalRequests: 0,
      avgTTL: 0,
      ttlSum: 0,
      ttlCount: 0
    };
    
    // Update metrics
    (existingMetrics as any)[operation + 's']++;
    existingMetrics.totalRequests++;
    
    if (operation === 'write' && ttl) {
      existingMetrics.ttlSum += ttl;
      existingMetrics.ttlCount++;
      existingMetrics.avgTTL = existingMetrics.ttlSum / existingMetrics.ttlCount;
    }
    
    // Store updated metrics with 25-hour TTL (to allow for timezone differences)
    await kv.put(metricKey, JSON.stringify(existingMetrics), { expirationTtl: 90000 });
    
  } catch (error) {
    // Don't let metrics failures affect main operations
    console.error('Failed to store cache metrics:', error);
  }
}

/**
 * Get cache hit ratio and performance metrics
 * @param kv - KV namespace instance
 * @param hoursBack - Number of hours to look back (default: 24)
 * @returns Promise<CacheMetrics> - Cache performance metrics
 */
export async function getCacheMetrics(
  kv: KVNamespace, 
  hoursBack: number = 24
): Promise<{
  hitRatio: number;
  totalRequests: number;
  hits: number;
  misses: number;
  writes: number;
  invalidates: number;
  errors: number;
  avgTTL: number;
  hoursAnalyzed: number;
}> {
  const now = new Date();
  let totalHits = 0;
  let totalMisses = 0;
  let totalWrites = 0;
  let totalInvalidates = 0;
  let totalErrors = 0;
  let totalTTLSum = 0;
  let totalTTLCount = 0;
  let hoursWithData = 0;
  
  for (let i = 0; i < hoursBack; i++) {
    const hourTime = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const hour = hourTime.toISOString().substring(0, 13);
    const metricKey = `metrics:cache:${hour}`;
    
    try {
      const metrics = await kv.get(metricKey, 'json') as CacheMetrics | null;
      if (metrics) {
        totalHits += metrics.hits || 0;
        totalMisses += metrics.misses || 0;
        totalWrites += metrics.writes || 0;
        totalInvalidates += metrics.invalidates || 0;
        totalErrors += metrics.errors || 0;
        totalTTLSum += metrics.ttlSum || 0;
        totalTTLCount += metrics.ttlCount || 0;
        hoursWithData++;
      }
    } catch (error) {
      console.error(`Failed to get metrics for hour ${hour}:`, error);
    }
  }
  
  const totalRequests = totalHits + totalMisses;
  const hitRatio = totalRequests > 0 ? totalHits / totalRequests : 0;
  const avgTTL = totalTTLCount > 0 ? totalTTLSum / totalTTLCount : 0;
  
  return {
    hitRatio,
    totalRequests,
    hits: totalHits,
    misses: totalMisses,
    writes: totalWrites,
    invalidates: totalInvalidates,
    errors: totalErrors,
    avgTTL,
    hoursAnalyzed: hoursWithData
  };
}