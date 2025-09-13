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

async function getUserFromSession(request: Request, env: any): Promise<string | null> {
	if (!env?.SESSIONS) return null;
	
	const cookies = parseCookies(request.headers.get('Cookie') || '');
	const sessionId = cookies.session_id;
	
	if (!sessionId) return null;
	
	try {
		const sessionData = await env.SESSIONS.get(sessionId);
		if (!sessionData) return null;
		
		const { user } = JSON.parse(sessionData);
		return user?.login || null;
	} catch (error) {
		console.error('Session check error:', error);
		return null;
	}
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;
	if (!env?.SHORTENER) {
		return new Response(JSON.stringify({ 
			error: { message: 'Shortener service not available' } 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Get user from session
	const userId = await getUserFromSession(request, env);
	if (!userId) {
		return new Response(JSON.stringify({ 
			error: { message: 'Authentication required' } 
		}), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const body = await request.text();
		console.log('Shorten API - Body:', body);
		console.log('Shorten API - User ID:', userId);
		
		const shortenerRequest = new Request('https://val.io/shorten', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-User-ID': userId,
			},
			body
		});

		console.log('Making request to shortener service...');
		const response = await env.SHORTENER.fetch(shortenerRequest);
		console.log('Shortener response status:', response.status);
		
		const data = await response.text();
		console.log('Shortener response data:', data);

		return new Response(data, {
			status: response.status,
			headers: {
				'Content-Type': 'application/json',
			}
		});
	} catch (error) {
		console.error('Shortener proxy error:', error);
		return new Response(JSON.stringify({ 
			error: { message: 'Failed to shorten URL' } 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};