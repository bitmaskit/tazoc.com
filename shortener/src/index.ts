import { generateUniqueShortCode } from './utils/shortCode';
import { validateUrl, normalizeUrl } from './utils/urlValidation';
import { storeUrlMapping, getUrlMapping, deleteUrlMapping, type StorageEnv } from './utils/storage';

interface ShortenRequest {
  url: string;
  customCode?: string;
  expiresAt?: string;
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
 * Handle POST /shorten endpoint
 */
async function handleShorten(request: Request, env: Env): Promise<Response> {
  try {
    const body: ShortenRequest = await request.json();
    
    if (!body.url) {
      return createErrorResponse('MISSING_URL', 'URL is required');
    }

    // Normalize and validate URL
    const normalizedUrl = normalizeUrl(body.url);
    const validation = await validateUrl(normalizedUrl);
    
    if (!validation.isValid) {
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

    // Store the URL mapping
    const linkData = {
      shortCode,
      originalUrl: normalizedUrl,
      createdAt: new Date().toISOString(),
      expiresAt,
      isActive: true
    };

    const storageEnv: StorageEnv = { DB: env.URL_DB, KV: env.URL_CACHE };
    const storedLink = await storeUrlMapping(linkData, storageEnv);

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
    console.error('Error in handleShorten:', error);
    
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
 * Handle GET /links endpoint
 */
async function handleGetLinks(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // TODO: Add user authentication and filter by user
    // For now, return a placeholder response
    const response = {
      links: [],
      total: 0,
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
 * Handle DELETE /links/:shortCode endpoint
 */
async function handleDeleteLink(shortCode: string, env: Env): Promise<Response> {
  try {
    const storageEnv: StorageEnv = { DB: env.URL_DB, KV: env.URL_CACHE };
    const wasDeleted = await deleteUrlMapping(shortCode, storageEnv);

    if (!wasDeleted) {
      return createErrorResponse('LINK_NOT_FOUND', 'Link not found', 404);
    }

    return createSuccessResponse({ success: true });

  } catch (error) {
    console.error('Error in handleDeleteLink:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * Route requests to appropriate handlers
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let response: Response;

    // Route to appropriate handler
    if (method === 'POST' && pathname === '/shorten') {
      response = await handleShorten(request, env);
    } else if (method === 'GET' && pathname === '/links') {
      response = await handleGetLinks(request, env);
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
        response = await handleDeleteLink(shortCode, env);
      }
    } else {
      response = createErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
    }

    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Unhandled error in handleRequest:', error);
    const errorResponse = createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
    
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });

    return errorResponse;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
