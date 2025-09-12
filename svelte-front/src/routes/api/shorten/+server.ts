import type { RequestHandler } from './$types';

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(/;\s*/).reduce((acc, pair) => {
    const i = pair.indexOf('=');
    if (i < 0) return acc;
    const key = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

function generateShortCode(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const a = new Uint8Array(length);
  crypto.getRandomValues(a);
  return Array.from(a)
    .map((b) => chars[b % chars.length])
    .join('');
}

export const POST: RequestHandler = async ({ platform, request, url }) => {
  const env = platform?.env;
  if (!env?.SESSIONS) {
    return new Response(JSON.stringify({ error: { message: 'Sessions not configured' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check authentication
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const sessionId = cookies.session_id;
  
  if (!sessionId) {
    return new Response(JSON.stringify({ error: { message: 'Authentication required' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const sessionData = await env.SESSIONS.get(sessionId);
  if (!sessionData) {
    return new Response(JSON.stringify({ error: { message: 'Invalid session' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { user } = JSON.parse(sessionData);

  try {
    const body = await request.json();
    const { url: targetUrl } = body;

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: { message: 'URL is required' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch (err) {
      return new Response(JSON.stringify({ error: { message: 'Invalid URL format' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate short code
    const shortCode = generateShortCode();
    const shortUrl = `${url.origin}/${shortCode}`;

    // Store in KV (temporary - should use D1 in production)
    const linkData = {
      shortCode,
      shortUrl,
      originalUrl: targetUrl,
      createdAt: new Date().toISOString(),
      createdBy: user.login,
      clicks: 0
    };

    // Store link data
    await env.SESSIONS.put(`link_${shortCode}`, JSON.stringify(linkData), { 
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });

    // Also store user's links list
    const userLinksKey = `user_links_${user.login}`;
    let userLinks = [];
    try {
      const existingLinks = await env.SESSIONS.get(userLinksKey);
      if (existingLinks) {
        userLinks = JSON.parse(existingLinks);
      }
    } catch (e) {
      // If parsing fails, start with empty array
    }

    userLinks.unshift(linkData);
    // Keep only the last 100 links per user
    userLinks = userLinks.slice(0, 100);

    await env.SESSIONS.put(userLinksKey, JSON.stringify(userLinks), { 
      expirationTtl: 30 * 24 * 60 * 60 
    });

    return new Response(JSON.stringify(linkData), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error shortening URL:', err);
    return new Response(JSON.stringify({ error: { message: 'Internal server error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};