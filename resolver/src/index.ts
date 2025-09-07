import type { AnalyticsData } from '@/types/analytics-data';

export default {
	async fetch(req, env, ctx): Promise<Response> {
		const url = new URL(req.url);
		if (url.pathname === '/') {
			return env.ASSETS.fetch('index.html');
		}
		const shortCode = url.pathname.slice(1);

		let resolvedUrl = await env.URL_CACHE.get(shortCode);

		if (!resolvedUrl) {
			console.log('Cache miss for shortCode:', shortCode);
			// Try to get url from D1 Database
			const result = await env.URL_DB.prepare('SELECT destination FROM links WHERE short_code = ? LIMIT 1').bind(shortCode).first();

			if (result?.destination) {
				resolvedUrl = result.destination as string;

				if (resolvedUrl) {
					await env.URL_CACHE.put(shortCode, resolvedUrl, { expirationTtl: 60 * 60 * 24 });
				}
			}
		}

		if (!resolvedUrl) {
			console.log(`Pathname: ${url.pathname}, Short code: ${shortCode}`);
			return new Response(`Not found: ${shortCode}`, { status: 404 });
		}

		const analyticsData: AnalyticsData = {
			shortCode: new URL(req.url).pathname.slice(1),
			timestamp: new Date().toISOString(),
			country: req.cf?.country,
			continent: req.cf?.continent,
			region: req.cf?.region,
			city: req.cf?.city,
			asn: req.cf?.asn,
			asOrganization: req.cf?.asOrganization,
			colo: req.cf?.colo,
			userAgent: req.headers.get('user-agent'),
			language: req.headers.get('accept-language')?.split(',')[0],
			referer: req.headers.get('referer'),
			botScore: req.cf?.botManagement?.score,
			isBot: req.cf?.botManagement?.verifiedBot || false,
			ipAddress: req.headers.get('cf-connecting-ip'),
			httpProtocol: req.cf?.httpProtocol,
		};

		await env.shortener_analytics.send(analyticsData);
		return new Response(null, {
			status: 302,
			headers: {
				Location: resolvedUrl,
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			},
		});
	},
} satisfies ExportedHandler<Env, Error>;
