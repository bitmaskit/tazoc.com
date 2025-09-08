export default {
  async fetch(request, env: Env, ctx) {
    const url = new URL(request.url);

    // Proxy shortener API requests
    if (url.pathname === "/api/shorten" || 
        url.pathname.startsWith("/api/links")) {
      try {
        // Forward the request to the shortener worker
        const shortenerUrl = new URL(request.url);
        shortenerUrl.hostname = 'shortener.localhost'; // Local development
        shortenerUrl.port = '8787'; // Default wrangler dev port for shortener
        
        // Map frontend API paths to shortener worker paths
        if (url.pathname === "/api/shorten") {
          shortenerUrl.pathname = '/shorten';
        } else if (url.pathname === "/api/links") {
          shortenerUrl.pathname = '/links';
        } else if (url.pathname.startsWith("/api/links/")) {
          // Handle /api/links/:shortCode
          const shortCode = url.pathname.replace("/api/links/", "");
          shortenerUrl.pathname = `/links/${shortCode}`;
        }
        
        const response = await fetch(shortenerUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
        
        return response;
      } catch (error) {
        console.error('Error proxying to shortener:', error);
        return Response.json({
          error: {
            code: 'PROXY_ERROR',
            message: 'Failed to connect to shortener service'
          }
        }, { status: 503 });
      }
    }

    // Simple API endpoint for testing
    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
        message: "API is working!",
        path: url.pathname,
      });
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
