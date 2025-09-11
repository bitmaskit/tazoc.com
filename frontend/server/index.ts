export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    // Simple API endpoint
    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
        message: "API is working!",
        path: url.pathname,
      });
    }

    if (url.pathname === "/") {
      console.log(`are we here`);
      return new Response(null, { status: 404 });
    }

    console.log("Trying to get the resolver");

    return await env.RESOLVER.fetch(request);
  },
} satisfies ExportedHandler<Env>;

// interface User {
//   id: number;
//   login: string;
//   name: string;
//   email: string;
//   avatar_url: string;
// }

// interface AuthenticatedRequest extends Request {
//   user?: User;
// }

// interface ErrorResponse {
//   error: {
//     code: string;
//     message: string;
//     details?: any;
//   };
//   timestamp: string;
//   requestId: string;
// }

// /**
//  * Create error response with consistent format
//  */
// function createErrorResponse(
//   code: string,
//   message: string,
//   status: number = 400,
//   details?: any
// ): Response {
//   const errorResponse: ErrorResponse = {
//     error: { code, message, details },
//     timestamp: new Date().toISOString(),
//     requestId: crypto.randomUUID()
//   };

//   return new Response(JSON.stringify(errorResponse), {
//     status,
//     headers: { 'Content-Type': 'application/json' }
//   });
// }

// /**
//  * Authentication middleware - extracts user from session/token
//  */
// async function authenticateRequest(request: Request): Promise<User | null> {
//   try {
//     // TODO: Implement proper session/JWT token validation
//     // For now, check for a simple auth header or cookie
//     const authHeader = request.headers.get('Authorization');
//     const cookies = request.headers.get('Cookie');

//     // Mock authentication for development - in production this would validate JWT/session
//     if (authHeader?.startsWith('Bearer ') || cookies?.includes('session=')) {
//       // Return mock user for now - replace with actual user lookup
//       return {
//         id: 1,
//         login: 'testuser',
//         name: 'Test User',
//         email: 'test@example.com',
//         avatar_url: 'https://github.com/testuser.png'
//       };
//     }

//     return null;
//   } catch (error) {
//     console.error('Authentication error:', error);
//     return null;
//   }
// }

// /**
//  * Require authentication middleware
//  */
// async function requireAuth(request: Request): Promise<{ user: User; error?: never } | { user?: never; error: Response }> {
//   const user = await authenticateRequest(request);

//   if (!user) {
//     return {
//       error: createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
//     };
//   }

//   return { user };
// }

// /**
//  * Handle POST /api/shorten endpoint
//  */
// async function handleShorten(request: Request, env: Env): Promise<Response> {
//   try {
//     // Authentication is optional for shortening URLs
//     const user = await authenticateRequest(request);

//     // Create new request with user context if authenticated
//     const body = await request.json() as any;
//     if (user) {
//       body.userId = user.id; // Add user ID to request body
//     }

//     // Forward to shortener worker using service binding
//     const shortenerRequest = new Request(request.url.replace('/api/shorten', '/shorten'), {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         ...(user && { 'X-User-ID': user.id.toString() })
//       },
//       body: JSON.stringify(body)
//     });

//     const response = await env.SHORTENER.fetch(shortenerRequest);
//     return response;

//   } catch (error) {
//     console.error('Error in handleShorten:', error);
//     return createErrorResponse('INTERNAL_ERROR', 'Failed to process shortening request', 500);
//   }
// }

// /**
//  * Handle GET /api/links endpoint - requires authentication
//  */
// async function handleGetLinks(request: Request, env: Env): Promise<Response> {
//   const authResult = await requireAuth(request);
//   if (authResult.error) return authResult.error;

//   try {
//     const url = new URL(request.url);

//     // Forward to shortener worker with user context
//     const shortenerRequest = new Request(url.toString().replace('/api/links', '/links'), {
//       method: 'GET',
//       headers: {
//         'X-User-ID': authResult.user.id.toString()
//       }
//     });

//     const response = await env.SHORTENER.fetch(shortenerRequest);
//     return response;

//   } catch (error) {
//     console.error('Error in handleGetLinks:', error);
//     return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch links', 500);
//   }
// }

// /**
//  * Handle GET /api/links/:shortCode endpoint
//  */
// async function handleGetLink(shortCode: string, request: Request, env: Env): Promise<Response> {
//   try {
//     // Authentication is optional for viewing individual links
//     const user = await authenticateRequest(request);

//     const shortenerRequest = new Request(`${request.url.replace(`/api/links/${shortCode}`, `/links/${shortCode}`)}`, {
//       method: 'GET',
//       headers: {
//         ...(user && { 'X-User-ID': user.id.toString() })
//       }
//     });

//     const response = await env.SHORTENER.fetch(shortenerRequest);
//     return response;

//   } catch (error) {
//     console.error('Error in handleGetLink:', error);
//     return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch link', 500);
//   }
// }

// /**
//  * Handle DELETE /api/links/:shortCode endpoint - requires authentication
//  */
// async function handleDeleteLink(shortCode: string, request: Request, env: Env): Promise<Response> {
//   const authResult = await requireAuth(request);
//   if (authResult.error) return authResult.error;

//   try {
//     const shortenerRequest = new Request(`${request.url.replace(`/api/links/${shortCode}`, `/links/${shortCode}`)}`, {
//       method: 'DELETE',
//       headers: {
//         'X-User-ID': authResult.user.id.toString()
//       }
//     });

//     const response = await env.SHORTENER.fetch(shortenerRequest);
//     return response;

//   } catch (error) {
//     console.error('Error in handleDeleteLink:', error);
//     return createErrorResponse('INTERNAL_ERROR', 'Failed to delete link', 500);
//   }
// }

// /**
//  * Handle GET /api/links/:shortCode/analytics endpoint - requires authentication
//  */
// async function handleGetAnalytics(shortCode: string, request: Request, env: Env): Promise<Response> {
//   const authResult = await requireAuth(request);
//   if (authResult.error) return authResult.error;

//   try {
//     const url = new URL(request.url);
//     const timeRange = url.searchParams.get('timeRange') || '7d'; // Default to 7 days
//     const granularity = url.searchParams.get('granularity') || 'day'; // Default to daily

//     // TODO: Query Analytics Engine for click statistics
//     // For now, return mock data structure
//     const mockAnalytics = {
//       shortCode,
//       timeRange,
//       granularity,
//       totalClicks: 0,
//       uniqueClicks: 0,
//       clicksByDate: [],
//       topCountries: [],
//       topReferrers: [],
//       deviceTypes: {
//         desktop: 0,
//         mobile: 0,
//         tablet: 0
//       },
//       botTraffic: {
//         human: 0,
//         bot: 0
//       }
//     };

//     return new Response(JSON.stringify(mockAnalytics), {
//       headers: { 'Content-Type': 'application/json' }
//     });

//   } catch (error) {
//     console.error('Error in handleGetAnalytics:', error);
//     return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch analytics', 500);
//   }
// }

// /**
//  * Handle GET /api/system/status endpoint - system monitoring dashboard
//  */
// async function handleSystemStatus(request: Request, env: Env): Promise<Response> {
//   try {
//     const services = ['shortener', 'resolver', 'queue-processor'];
//     const serviceStatus: Record<string, any> = {};

//     // Helper function to get service URLs (in production, these would be actual service URLs)
//     function getServiceUrl(service: string): string {
//       const serviceUrls: Record<string, string> = {
//         'shortener': 'http://localhost:8787', // Wrangler dev server
//         'resolver': 'http://localhost:8788',
//         'queue-processor': 'http://localhost:8789'
//       };
//       return serviceUrls[service] || 'http://localhost:8787';
//     }

//     // Check each service health
//     for (const service of services) {
//       try {
//         const healthUrl = getServiceUrl(service) + '/health';
//         const response = await fetch(healthUrl, {
//           method: 'GET',
//           headers: { 'Content-Type': 'application/json' },
//           signal: AbortSignal.timeout(5000) // 5 second timeout
//         });

//         if (response.ok) {
//           serviceStatus[service] = await response.json();
//         } else {
//           serviceStatus[service] = {
//             status: 'unhealthy',
//             service,
//             timestamp: new Date().toISOString(),
//             error: `HTTP ${response.status}`
//           };
//         }
//       } catch (error) {
//         serviceStatus[service] = {
//           status: 'unhealthy',
//           service,
//           timestamp: new Date().toISOString(),
//           error: error instanceof Error ? error.message : String(error)
//         };
//       }
//     }

//     // Get cache metrics from shortener
//     let cacheMetrics = null;
//     try {
//       const cacheResponse = await fetch(getServiceUrl('shortener') + '/metrics/cache', {
//         signal: AbortSignal.timeout(5000)
//       });
//       if (cacheResponse.ok) {
//         cacheMetrics = await cacheResponse.json();
//       }
//     } catch (error) {
//       console.warn('Failed to fetch cache metrics:', error);
//     }

//     // Get queue metrics from queue processor
//     let queueMetrics = null;
//     try {
//       const queueResponse = await fetch(getServiceUrl('queue-processor') + '/metrics', {
//         signal: AbortSignal.timeout(5000)
//       });
//       if (queueResponse.ok) {
//         queueMetrics = await queueResponse.json();
//       }
//     } catch (error) {
//       console.warn('Failed to fetch queue metrics:', error);
//     }

//     // Determine overall system status
//     const healthyServices = Object.values(serviceStatus).filter(s => s.status === 'healthy').length;
//     const totalServices = services.length;

//     let overallStatus = 'healthy';
//     if (healthyServices === 0) {
//       overallStatus = 'unhealthy';
//     } else if (healthyServices < totalServices) {
//       overallStatus = 'degraded';
//     }

//     const systemStatus = {
//       status: overallStatus,
//       timestamp: new Date().toISOString(),
//       services: serviceStatus,
//       metrics: {
//         cache: cacheMetrics,
//         queue: queueMetrics
//       },
//       summary: {
//         totalServices,
//         healthyServices,
//         degradedServices: totalServices - healthyServices
//       }
//     };

//     return new Response(JSON.stringify(systemStatus), {
//       status: 200,
//       headers: { 'Content-Type': 'application/json' }
//     });

//   } catch (error) {
//     console.error('System status error:', error);
//     return createErrorResponse('INTERNAL_ERROR', 'Failed to get system status', 500);
//   }
// }

// /**
//  * Handle authentication endpoints
//  */
// async function handleAuth(request: Request, pathname: string): Promise<Response> {
//   if (pathname === '/api/auth/user') {
//     // Return current user info
//     const user = await authenticateRequest(request);

//     return new Response(JSON.stringify({
//       authenticated: !!user,
//       user: user || null
//     }), {
//       headers: { 'Content-Type': 'application/json' }
//     });
//   }

//   if (pathname === '/api/auth/logout') {
//     // Handle logout
//     return new Response(JSON.stringify({ success: true }), {
//       status: 200,
//       headers: {
//         'Content-Type': 'application/json',
//         'Set-Cookie': 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict'
//       }
//     });
//   }

//   return createErrorResponse('NOT_FOUND', 'Auth endpoint not found', 404);
// }

// export default {
//   async fetch(request, env: Env, ctx) {
//     const url = new URL(request.url);
//     const method = request.method;
//     const pathname = url.pathname;

//     // CORS headers for all responses
//     const corsHeaders = {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//       'Access-Control-Allow-Credentials': 'true'
//     };

//     // Handle preflight requests
//     if (method === 'OPTIONS') {
//       return new Response(null, { status: 204, headers: corsHeaders });
//     }

//     try {
//       let response: Response;

//       // Route API requests
//       if (pathname === '/api/shorten' && method === 'POST') {
//         response = await handleShorten(request, env);
//       } else if (pathname === '/api/links' && method === 'GET') {
//         response = await handleGetLinks(request, env);
//       } else if (pathname.startsWith('/api/links/') && pathname.includes('/analytics') && method === 'GET') {
//         const shortCode = pathname.split('/')[3]; // /api/links/:shortCode/analytics
//         response = await handleGetAnalytics(shortCode, request, env);
//       } else if (pathname === '/api/system/status' && method === 'GET') {
//         response = await handleSystemStatus(request, env);
//       } else if (pathname.startsWith('/api/links/') && method === 'GET') {
//         const shortCode = pathname.split('/')[3]; // /api/links/:shortCode
//         response = await handleGetLink(shortCode, request, env);
//       } else if (pathname.startsWith('/api/links/') && method === 'DELETE') {
//         const shortCode = pathname.split('/')[3]; // /api/links/:shortCode
//         response = await handleDeleteLink(shortCode, request, env);
//       } else if (pathname.startsWith('/api/auth/')) {
//         response = await handleAuth(request, pathname);
//       } else if (pathname.startsWith('/api/')) {
//         // Fallback API endpoint for testing
//         response = new Response(JSON.stringify({
//           name: "URL Shortener Frontend API",
//           message: "API is working!",
//           path: pathname,
//           method: method
//         }), {
//           headers: { 'Content-Type': 'application/json' }
//         });
//       } else {
//         response = new Response(null, { status: 404 });
//       }

//       // Add CORS headers to response
//       Object.entries(corsHeaders).forEach(([key, value]) => {
//         response.headers.set(key, value);
//       });

//       return response;

//     } catch (error) {
//       console.error('Unhandled error in frontend server:', error);
//       const errorResponse = createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);

//       Object.entries(corsHeaders).forEach(([key, value]) => {
//         errorResponse.headers.set(key, value);
//       });

//       return errorResponse;
//     }
//   },
// } satisfies ExportedHandler<Env>;
