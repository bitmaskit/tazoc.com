import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, platform, request }) => {
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
		const shortenerRequest = new Request(`https://shortener/links/${params.shortCode}`, {
			method: 'DELETE',
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
		console.error('Delete link proxy error:', error);
		return new Response(JSON.stringify({ 
			error: { message: 'Failed to delete link' } 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};