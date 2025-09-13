import type { RequestHandler } from './$types';

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

	try {
		const body = await request.text();
		const shortenerRequest = new Request('https://shortener/shorten', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-User-ID': request.headers.get('X-User-ID') || '',
			},
			body
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
		console.error('Shortener proxy error:', error);
		return new Response(JSON.stringify({ 
			error: { message: 'Failed to shorten URL' } 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};