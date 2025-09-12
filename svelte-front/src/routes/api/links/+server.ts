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

export const GET: RequestHandler = async ({ platform, request }) => {
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
    const userLinksKey = `user_links_${user.login}`;
    let userLinks = [];

    const existingLinks = await env.SESSIONS.get(userLinksKey);
    if (existingLinks) {
      userLinks = JSON.parse(existingLinks);
    }

    return new Response(JSON.stringify({ links: userLinks }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error fetching links:', err);
    return new Response(JSON.stringify({ error: { message: 'Internal server error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};