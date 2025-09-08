import { generateUniqueShortCode } from './utils/shortCode';
import { validateUrl, normalizeUrl } from './utils/urlValidation';
import { 
  storeUrlMapping, 
  getUrlMapping, 
  deleteUrlMapping, 
  getUserLinks,
  deleteUserLink,
  getCacheMetrics,
  type StorageEnv,
  type LinkData 
} from './utils/storage';
import { createLogger, MetricsCollector, HealthChecker, type LogContext } from '../../shared/logging';

interface ShortenRequest {
  url: string;
  customCode?: string;
  expiresAt?: string;
  userId?: string; // User ID from authentication
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

interface LinkResponse {
  id?: number;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  clickCount?: number;
}

// Global logger, metrics collector, and health checker
const logger = createLogger('shortener');
const metrics = new MetricsCollector('shortener');
const healthChecker = new HealthChecker('shortener');

// Initialize health checks
healthChecker.addCheck('database', async () => {
  // This would be implemented with actual database connectivity check
  return { name: 'database', status: 'healthy', message: 'Database connection healthy', lastCheck: new Date().toISOString() };
});

healthChecker.addCheck('cache', async () => {
  // This would be implemented with actual cache connectivity check
  return { name: 'cache', status: 'healthy', message: 'Cache connection healthy', lastCheck: new Date().toISOString() };
});

/**
 * Create error response with consistent format
 */
function createErrorResponse(
  code: string, 
  message: string, 
  status: number = 400, 
  details?: any
): Response {
  const errorResponse: ErrorResponse = {
    error: { code, message, details },
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID()
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create success response with consistent format
 */
function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Extract user ID from request headers
 */
function getUserIdFromRequest(request: Request): string | null {
  return request.headers.get('X-User-ID') || null;
}

/**
 * Handle POST /shorten endpoint
 */
async function handleShorten(request: Request, env: Env): Promise<Response> {
  const requestId = crypto.randomUUID();
  const requestLogger = logger.child({ requestId });
  const startTime = Date.now();
  
  try {
    metrics.incrementCounter('shorten_requests');
    
    const body: ShortenRequest = await request.json();
    const userId = getUserIdFromRequest(request);
    
    requestLogger.info('Processing shorten request', { 
      userId,
      metadata: { hasCustomCode: !!body.customCode, hasExpiry: !!body.expiresAt }
    });
    
    if (!body.url) {
      metrics.incrementCounter('validation_errors');
      return createErrorResponse('MISSING_URL', 'URL is required');
    }

    // Normalize and validate URL
    const normalizedUrl = normalizeUrl(body.url);
    const validation = await validateUrl(normalizedUrl);
    
    if (!validation.isValid) {
      requestLogger.warn('URL validation failed', { 
        originalUrl: body.url,
        error: validation.error 
      });
      metrics.incrementCounter('validation_errors');
      return createErrorResponse('INVALID_URL', validation.error || 'Invalid URL');
    }

    // Generate or validate custom short code
    let shortCode: string;
    if (body.customCode) {
      // TODO: Validate custom code format and availability
      shortCode = body.customCode;
    } else {
      shortCode = await generateUniqueShortCode(env.URL_DB);
    }

    // Validate expiration date if provided
    let expiresAt: string | undefined;
    if (body.expiresAt) {
      const expiry = new Date(body.expiresAt);
      if (isNaN(expiry.getTime()) || expiry <= new Date()) {
        return createErrorResponse('INVALID_EXPIRY', 'Expiry date must be in the future');
      }
      expiresAt = expiry.toISOString();
    }

    // Store the URL mapping with user ownership
    const linkData: LinkData = {
      shortCode,
      originalUrl: normalizedUrl,
      createdAt: new Date().toISOString(),
      expiresAt,
      isActive: true,
      createdBy: userId || undefined // Track ownership if user is authenticated
    };

    const storageEnv: StorageEnv = { DB: env.URL_DB, KV: env.URL_CACHE };
    const storedLink = await storeUrlMapping(linkData, storageEnv);

    const processingTime = Date.now() - startTime;
    requestLogger.info('Link created successfully', {
      shortCode: storedLink.shortCode,
      userId,
      duration: processingTime
    });
    
    metrics.recordTiming('shorten_response_time', processingTime);
    metrics.incrementCounter('links_created');

    // Create response
    const response: LinkResponse = {
      id: storedLink.id,
      shortCode: storedLink.shortCode,
      shortUrl: `https://short.ly/${storedLink.shortCode}`, // TODO: Use actual domain
      originalUrl: storedLink.originalUrl,
      createdAt: storedLink.createdAt,
      expiresAt: storedLink.expiresAt,
      isActive: storedLink.isActive,
      clickCount: storedLink.clickCount || 0
    };

    return createSuccessResponse(response, 201);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    requestLogger.error('Error in handleShorten', {
      duration: processingTime,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : { name: 'Unknown', message: String(error) }
    });
    
    metrics.recordTiming('shorten_response_time', processingTime);
    metrics.incrementCounter('shorten_errors');
    
    if (error instanceof Error) {
      if (error.message.includes('Short code already exists')) {
        return createErrorResponse('CODE_EXISTS', 'Short code already exists', 409);
      }
      if (error.message.includes('Failed to generate unique short code')) {
        return createErrorResponse('CODE_GENERATION_FAILED', 'Unable to generate unique code', 500);
      }
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * Handle GET /links endpoint - requires user authentication
 */
async function handleGetLinks(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const storageEnv: StorageEnv = { DB: env.URL_DB, KV: env.URL_CACHE };
    const result = await getUserLinks(userId, storageEnv, limit, offset);

    // Transform links to include shortUrl
    const transformedLinks = result.links.map(link => ({
      id: link.id,
      shortCode: link.shortCode,
      shortUrl: `https://short.ly/${link.shortCode}`, // TODO: Use actual domain
      originalUrl: link.originalUrl,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      isActive: link.isActive,
      clickCount: link.clickCount || 0
    }));

    const response = {
      links: transformedLinks,
      total: result.total,
      limit,
      offset
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Error in handleGetLinks:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * Handle GET /links/:shortCode endpoint
 */
async function handleGetLink(shortCode: string, env: Env): Promise<Response> {
  try {
    const storageEnv: StorageEnv = { DB: env.URL_DB, KV: env.URL_CACHE };
    const linkData = await getUrlMapping(shortCode, storageEnv);

    if (!linkData) {
      return createErrorResponse('LINK_NOT_FOUND', 'Link not found', 404);
    }

    const response: LinkResponse = {
      id: linkData.id,
      shortCode: linkData.shortCode,
      shortUrl: `https://short.ly/${linkData.shortCode}`, // TODO: Use actual domain
      originalUrl: linkData.originalUrl,
      createdAt: linkData.createdAt,
      expiresAt: linkData.expiresAt,
      isActive: linkData.isActive,
      clickCount: linkData.clickCount || 0
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Error in handleGetLink:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * Handle DELETE /links/:shortCode endpoint - requires user authentication and ownership
 */
async function handleDeleteLink(shortCode: string, request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const storageEnv: StorageEnv = { DB: env.URL_DB, KV: env.URL_CACHE };
    const result = await deleteUserLink(shortCode, userId, storageEnv);

    if (!result.success) {
      if (result.error === 'Link not found or access denied') {
        return createErrorResponse('LINK_NOT_FOUND', 'Link not found or access denied', 404);
      }
      return createErrorResponse('DELETE_FAILED', result.error || 'Failed to delete link', 500);
    }

    return createSuccessResponse({ success: true });

  } catch (error) {
    console.error('Error in handleDeleteLink:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * Handle GET /metrics/cache endpoint - get cache performance metrics
 */
async function handleCacheMetrics(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const hoursBack = parseInt(url.searchParams.get('hours') || '24');
    
    const storageEnv: StorageEnv = { DB: env.URL_DB, KV: env.URL_CACHE };
    const metrics = await getCacheMetrics(storageEnv.KV, hoursBack);
    
    return createSuccessResponse({
      ...metrics,
      timestamp: new Date().toISOString(),
      hoursRequested: hoursBack,
      service: 'shortener'
    });

  } catch (error) {
    console.error('Error in handleCacheMetrics:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * Handle GET /health endpoint - health check
 */
async function handleHealthCheck(request: Request, env: Env): Promise<Response> {
  const checks: Record<string, string> = {};
  let isHealthy = true;
  
  try {
    // Check D1 database connectivity
    try {
      await env.URL_DB.prepare('SELECT 1').first();
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'failed';
      isHealthy = false;
    }
    
    // Check KV cache connectivity
    try {
      await env.URL_CACHE.get('health-check');
      checks.cache = 'ok';
    } catch (error) {
      checks.cache = 'failed';
      isHealthy = false;
    }
    
    const healthResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'shortener',
      timestamp: new Date().toISOString(),
      checks
    };
    
    return new Response(JSON.stringify(healthResponse), {
      status: isHealthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in handleHealthCheck:', error);
    
    return new Response(JSON.stringify({
      status: 'unhealthy',
      service: 'shortener',
      timestamp: new Date().toISOString(),
      checks: { ...checks, general: 'failed' },
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Route requests to appropriate handlers
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const requestId = crypto.randomUUID();
  const requestLogger = logger.child({ requestId });
  const startTime = Date.now();
  
  metrics.incrementCounter('requests');
  
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'X-Request-ID': requestId,
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let response: Response;
    
    // Handle health check endpoint
    if (method === 'GET' && pathname === '/health') {
      const healthResult = await healthChecker.runHealthChecks();
      const statusCode = healthResult.status === 'healthy' ? 200 : 
                        healthResult.status === 'degraded' ? 200 : 503;
      
      response = new Response(JSON.stringify(healthResult), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Handle metrics endpoint  
    else if (method === 'GET' && pathname === '/metrics') {
      const currentMetrics = metrics.getMetrics();
      response = new Response(JSON.stringify({
        ...currentMetrics,
        timestamp: new Date().toISOString(),
        service: 'shortener'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route to appropriate handler
    if (method === 'POST' && pathname === '/shorten') {
      response = await handleShorten(request, env);
    } else if (method === 'GET' && pathname === '/links') {
      response = await handleGetLinks(request, env);
    } else if (method === 'GET' && pathname === '/metrics/cache') {
      response = await handleCacheMetrics(request, env);
    } else if (method === 'GET' && pathname === '/health') {
      response = await handleHealthCheck(request, env);
    } else if (method === 'GET' && pathname.startsWith('/links/')) {
      const shortCode = pathname.split('/')[2];
      if (!shortCode) {
        response = createErrorResponse('INVALID_PATH', 'Short code is required', 400);
      } else {
        response = await handleGetLink(shortCode, env);
      }
    } else if (method === 'DELETE' && pathname.startsWith('/links/')) {
      const shortCode = pathname.split('/')[2];
      if (!shortCode) {
        response = createErrorResponse('INVALID_PATH', 'Short code is required', 400);
      } else {
        response = await handleDeleteLink(shortCode, request, env);
      }
    } else {
      metrics.incrementCounter('not_found');
      response = createErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
    }

    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Record response time
    const processingTime = Date.now() - startTime;
    metrics.recordTiming('response_time', processingTime);

    return response;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    requestLogger.error('Unhandled error in handleRequest', {
      duration: processingTime,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : { name: 'Unknown', message: String(error) }
    });
    
    metrics.recordTiming('response_time', processingTime);
    metrics.incrementCounter('errors');
    
    const errorResponse = createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
    
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });

    return errorResponse;
  } finally {
    // Log metrics periodically (every 50 requests)
    if (metrics.getMetrics().requestCount % 50 === 0) {
      metrics.logMetrics();
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
