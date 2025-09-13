import type { RequestHandler } from './$types';

// Interface for resolver response
interface ResolverResponse {
  shortCode: string;
  url: string;
  timestamp: string;
}

export const GET: RequestHandler = async ({ platform, params, request }) => {
  const env = platform?.env;
  if (!env?.RESOLVER) {
    return new Response('Resolver service not configured', { status: 500 });
  }

  const { shortCode } = params;
  if (!shortCode) {
    return new Response('Short code is required', { status: 400 });
  }

  try {
    // Create a request to the resolver's JSON API endpoint
    const resolverRequest = new Request(`https://dummy.com/api/resolve/${shortCode}`, {
      method: 'GET',
      headers: request.headers
    });
    
    const resolverResponse = await env.RESOLVER.fetch(resolverRequest);
    
    if (resolverResponse.status === 404) {
      return new Response('Short URL not found', { status: 404 });
    }
    
    if (resolverResponse.status === 200) {
      // Resolver returned URL data as JSON
      const urlData = await resolverResponse.json() as ResolverResponse;
      if (urlData.url) {
        // svelte-front now has full control over the redirect
        // Could add analytics, logging, or other processing here
        console.log(`Redirecting ${shortCode} to ${urlData.url}`);
        
        return new Response(null, {
          status: 302,
          headers: {
            Location: urlData.url,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        });
      }
    }
    
    return new Response('Invalid response from resolver', { status: 500 });
    
  } catch (error) {
    console.error('Error calling resolver:', error);
    return new Response('Internal server error', { status: 500 });
  }
};