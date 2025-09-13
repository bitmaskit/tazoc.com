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

function cookie(name: string, value: string, opts: { expires?: Date; path?: string } = {}): string {
  let str = `${name}=${value}`;
  if (opts.expires) str += `; Expires=${opts.expires.toUTCString()}`;
  if (opts.path) str += `; Path=${opts.path}`;
  str += '; HttpOnly; Secure; SameSite=Lax';
  return str;
}

export const POST: RequestHandler = async ({ platform, request }) => {
  const env = platform?.env;
  if (!env?.SESSIONS) {
    return new Response('Sessions not configured', { status: 500 });
  }

  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const sessionId = cookies.session_id;
  
  if (sessionId) {
    try {
      await env.SESSIONS.delete(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie('session_id', '', { expires: new Date(0), path: '/' })
    }
  });
};