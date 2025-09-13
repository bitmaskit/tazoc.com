import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform, request }) => {
	const env = platform?.env;
	if (!env?.SHORTENER) {
		return new Response(JSON.stringify({ 
			error: { message: 'Shortener service not available' } 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const shortenerRequest = new Request(`https://shortener/links${url.search}`, {
			method: 'GET',
			headers: {
				'X-User-ID': request.headers.get('X-User-ID') || '',
			}
		});

		const response = await env.SHORTENER.fetch(shortenerRequest);
		const data = await response.text();

		return new Response(data, {
			status: response.status,
			headers: {
				'Content-Type': 'application/json',
			}
		});
	} catch (error) {
		console.error('Links proxy error:', error);
		return new Response(JSON.stringify({ 
			error: { message: 'Failed to fetch links' } 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};