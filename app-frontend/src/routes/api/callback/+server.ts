import type { RequestHandler } from './$types';

// GitHub OAuth interfaces
interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email?: string;
}

// Helper functions
function randomId(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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

function cookie(name: string, value: string, opts: { expires?: Date; path?: string } = {}): string {
  let str = `${name}=${value}`;
  if (opts.expires) str += `; Expires=${opts.expires.toUTCString()}`;
  if (opts.path) str += `; Path=${opts.path}`;
  str += '; HttpOnly; Secure; SameSite=Lax';
  return str;
}

export const GET: RequestHandler = async ({ platform, url, request }) => {
  const env = platform?.env;
  if (!env?.GITHUB_CLIENT_ID || !env?.GITHUB_CLIENT_SECRET || !env?.SESSIONS) {
    return new Response('Server configuration error', { status: 500 });
  }

  const clientId = await env.GITHUB_CLIENT_ID.get();
  const clientSecret = await env.GITHUB_CLIENT_SECRET.get();
  
  if (!clientId || !clientSecret) {
    return new Response('GitHub credentials not found', { status: 500 });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }

  // Verify state parameter
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  if (cookies.oauth_state !== state) {
    return new Response('Invalid state parameter', { status: 400 });
  }

  try {
    // Exchange code for access token
    const redirectUri = new URL('/api/callback', url).toString();
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        state
      })
    });

    const tokenData = await tokenResponse.json() as GitHubTokenResponse;
    if (!tokenData.access_token) {
      return new Response('Failed to get access token', { status: 400 });
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'Val.io'
      }
    });

    if (!userResponse.ok) {
      return new Response('Failed to get user info', { status: 400 });
    }

    const userData = await userResponse.json() as GitHubUser;
    
    // Create session
    const sessionId = randomId();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await env.SESSIONS.put(sessionId, JSON.stringify({
      user: userData,
      expires: expires.toISOString()
    }), { expirationTtl: 30 * 24 * 60 * 60 }); // 30 days

    const response = new Response(null, {
      status: 302,
      headers: {
        Location: '/app',
        'Set-Cookie': cookie('session_id', sessionId, { expires, path: '/' })
      }
    });

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
};