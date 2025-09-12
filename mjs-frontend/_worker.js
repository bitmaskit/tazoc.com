// worker.js (Hono + Assets binding; API first, then static)
import { Hono } from 'hono';

const COOKIE_SESSION = 'sid';
const COOKIE_STATE = 'oauth_state';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

const app = new Hono();

// --- API ROUTES ---
app.get('/api/login', async (c) => {
	const state = randomId();
	const redirectUri = new URL('/api/callback', c.req.url).toString();
	c.header('Set-Cookie', cookie(COOKIE_STATE, state, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/' }));
	const clientId = await c.env.GITHUB_CLIENT_ID.get();
	const authURL =
		'https://github.com/login/oauth/authorize?' +
		new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			state,
			scope: 'read:user user:email',
		});
	return c.redirect(authURL);
});

app.get('/api/callback', async (c) => {
	const url = new URL(c.req.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const cookies = parseCookies(c.req.header('Cookie') || '');
	if (!code || !state || cookies[COOKIE_STATE] !== state) {
		return c.text(`OAuth validation failed. Code: ${!!code}, State: ${!!state}, Cookie State: ${cookies[COOKIE_STATE]}, URL State: ${state}`, 400);
	}

	const redirectUri = new URL('/api/callback', c.req.url).toString();
	// in /api/login handler before building the URL
	const clientId = await c.env.GITHUB_CLIENT_ID.get();
	const clientSecret = await c.env.GITHUB_CLIENT_SECRET.get();
	if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
		return c.text(
			'Misconfigured env: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET must be a secret string. Check binding name collisions.',
			500,
		);
	}
	const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			redirect_uri: redirectUri,
			state,
		}),
	});
	if (!tokenRes.ok) return c.text('Token exchange failed', 502);
	const { access_token } = await tokenRes.json();
	if (!access_token) return c.text('No access token', 401);

	const ghUserRes = await fetch('https://api.github.com/user', {
		headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'cf-hono-demo' },
	});
	if (!ghUserRes.ok) return c.text('Failed to fetch GitHub user', 502);
	const ghUser = await ghUserRes.json();

	const sid = randomId();
	await c.env.SESSIONS.put(sid, JSON.stringify({ user: ghUser, token: access_token }), { expirationTtl: SESSION_TTL });

	// clear one-time state + set session cookie
	c.header('Set-Cookie', cookie(COOKIE_STATE, '', { expires: new Date(0), path: '/' }));
	c.header('Set-Cookie', cookie(COOKIE_SESSION, sid, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: SESSION_TTL }));
	return c.redirect('/');
});

app.get('/api/me', async (c) => {
	const sid = parseCookies(c.req.header('Cookie') || '')[COOKIE_SESSION];
	if (!sid) return c.json({ authenticated: false });
	const raw = await c.env.SESSIONS.get(sid);
	if (!raw) return c.json({ authenticated: false });
	const { user } = JSON.parse(raw);
	return c.json({ authenticated: true, user });
});

app.post('/api/logout', async (c) => {
	const sid = parseCookies(c.req.header('Cookie') || '')[COOKIE_SESSION];
	if (sid) await c.env.SESSIONS.delete(sid).catch(() => {});
	c.header('Set-Cookie', cookie(COOKIE_SESSION, '', { expires: new Date(0), path: '/' }));
	return c.json({ ok: true });
});

// --- STATIC (ASSETS) FALLBACK ---
// Put this AFTER API routes. Uses the Assets binding to serve /public files.
app.all('*', async (c) => {
	const res = await c.env.ASSETS.fetch(c.req.raw);
	if (res.status !== 404) return res;
	return c.text('Not Found', 404);
});

export default app;

// helpers
function randomId(bytes = 16) {
	const a = new Uint8Array(bytes);
	crypto.getRandomValues(a);
	return Array.from(a)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
function parseCookies(h) {
	return h.split(/;\s*/).reduce((acc, p) => {
		const i = p.indexOf('=');
		if (i < 0) return acc;
		acc[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
		return acc;
	}, {});
}
function cookie(name, value, opts = {}) {
	const parts = [`${name}=${encodeURIComponent(value)}`];
	if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
	if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
	parts.push(`Path=${opts.path || '/'}`);
	if (opts.httpOnly) parts.push('HttpOnly');
	if (opts.secure !== false) parts.push('Secure');
	if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
	return parts.join('; ');
}
