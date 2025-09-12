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

// URL Shortening API
app.post('/api/shorten', async (c) => {
	// Check authentication
	const sid = parseCookies(c.req.header('Cookie') || '')[COOKIE_SESSION];
	if (!sid) {
		return c.json({ error: { message: 'Authentication required' } }, 401);
	}
	
	const sessionData = await c.env.SESSIONS.get(sid);
	if (!sessionData) {
		return c.json({ error: { message: 'Invalid session' } }, 401);
	}
	
	const { user } = JSON.parse(sessionData);
	
	try {
		const body = await c.req.json();
		const { url } = body;
		
		if (!url) {
			return c.json({ error: { message: 'URL is required' } }, 400);
		}
		
		// Validate URL format
		try {
			new URL(url);
		} catch (err) {
			return c.json({ error: { message: 'Invalid URL format' } }, 400);
		}
		
		// Generate short code
		const shortCode = generateShortCode();
		const shortUrl = `${new URL(c.req.url).origin}/${shortCode}`;
		
		// Store in KV (temporary - should use D1 in production)
		const linkData = {
			shortCode,
			shortUrl,
			originalUrl: url,
			createdAt: new Date().toISOString(),
			createdBy: user.login,
			clicks: 0
		};
		
		// Store in both KV for fast access and session storage for this demo
		await c.env.SESSIONS.put(`link_${shortCode}`, JSON.stringify(linkData), { expirationTtl: 30 * 24 * 60 * 60 }); // 30 days
		
		// Also store user's links list (in production, this would be in D1)
		const userLinksKey = `user_links_${user.login}`;
		let userLinks = [];
		try {
			const existingLinks = await c.env.SESSIONS.get(userLinksKey);
			if (existingLinks) {
				userLinks = JSON.parse(existingLinks);
			}
		} catch (e) {
			// If parsing fails, start with empty array
		}
		
		userLinks.unshift(linkData);
		// Keep only the last 100 links per user
		userLinks = userLinks.slice(0, 100);
		
		await c.env.SESSIONS.put(userLinksKey, JSON.stringify(userLinks), { expirationTtl: 30 * 24 * 60 * 60 });
		
		return c.json(linkData);
		
	} catch (err) {
		console.error('Error shortening URL:', err);
		return c.json({ error: { message: 'Internal server error' } }, 500);
	}
});

// Get user's links
app.get('/api/links', async (c) => {
	// Check authentication
	const sid = parseCookies(c.req.header('Cookie') || '')[COOKIE_SESSION];
	if (!sid) {
		return c.json({ error: { message: 'Authentication required' } }, 401);
	}
	
	const sessionData = await c.env.SESSIONS.get(sid);
	if (!sessionData) {
		return c.json({ error: { message: 'Invalid session' } }, 401);
	}
	
	const { user } = JSON.parse(sessionData);
	
	try {
		const userLinksKey = `user_links_${user.login}`;
		let userLinks = [];
		
		const existingLinks = await c.env.SESSIONS.get(userLinksKey);
		if (existingLinks) {
			userLinks = JSON.parse(existingLinks);
		}
		
		return c.json({ links: userLinks });
		
	} catch (err) {
		console.error('Error fetching links:', err);
		return c.json({ error: { message: 'Internal server error' } }, 500);
	}
});

// Delete a link
app.delete('/api/links/:shortCode', async (c) => {
	// Check authentication
	const sid = parseCookies(c.req.header('Cookie') || '')[COOKIE_SESSION];
	if (!sid) {
		return c.json({ error: { message: 'Authentication required' } }, 401);
	}
	
	const sessionData = await c.env.SESSIONS.get(sid);
	if (!sessionData) {
		return c.json({ error: { message: 'Invalid session' } }, 401);
	}
	
	const { user } = JSON.parse(sessionData);
	const { shortCode } = c.req.param();
	
	try {
		// Remove from KV store
		await c.env.SESSIONS.delete(`link_${shortCode}`);
		
		// Remove from user's links list
		const userLinksKey = `user_links_${user.login}`;
		let userLinks = [];
		
		const existingLinks = await c.env.SESSIONS.get(userLinksKey);
		if (existingLinks) {
			userLinks = JSON.parse(existingLinks);
		}
		
		userLinks = userLinks.filter(link => link.shortCode !== shortCode);
		await c.env.SESSIONS.put(userLinksKey, JSON.stringify(userLinks), { expirationTtl: 30 * 24 * 60 * 60 });
		
		return c.json({ ok: true });
		
	} catch (err) {
		console.error('Error deleting link:', err);
		return c.json({ error: { message: 'Internal server error' } }, 500);
	}
});

// Handle short URL redirects
app.get('/:shortCode', async (c) => {
	const { shortCode } = c.req.param();
	
	// Skip if this looks like a static asset or API route
	if (shortCode.includes('.') || shortCode.startsWith('api/') || shortCode.startsWith('src/') || shortCode.startsWith('dist/')) {
		// Let the static assets handler deal with this
		const res = await c.env.ASSETS.fetch(c.req.raw);
		return res;
	}
	
	try {
		const linkData = await c.env.SESSIONS.get(`link_${shortCode}`);
		if (!linkData) {
			// Return 404 for non-existent short codes
			return c.text('Short URL not found', 404);
		}
		
		const link = JSON.parse(linkData);
		
		// Increment click count (in production, this would be handled by analytics queue)
		link.clicks = (link.clicks || 0) + 1;
		await c.env.SESSIONS.put(`link_${shortCode}`, JSON.stringify(link), { expirationTtl: 30 * 24 * 60 * 60 });
		
		// Also update in user's links list
		const userLinksKey = `user_links_${link.createdBy}`;
		const existingLinks = await c.env.SESSIONS.get(userLinksKey);
		if (existingLinks) {
			let userLinks = JSON.parse(existingLinks);
			userLinks = userLinks.map(userLink => 
				userLink.shortCode === shortCode 
					? { ...userLink, clicks: link.clicks }
					: userLink
			);
			await c.env.SESSIONS.put(userLinksKey, JSON.stringify(userLinks), { expirationTtl: 30 * 24 * 60 * 60 });
		}
		
		// Redirect to original URL
		return c.redirect(link.originalUrl, 302);
		
	} catch (err) {
		console.error('Error handling redirect:', err);
		return c.text('Internal server error', 500);
	}
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

function generateShortCode(length = 6) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	const a = new Uint8Array(length);
	crypto.getRandomValues(a);
	return Array.from(a)
		.map((b) => chars[b % chars.length])
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
