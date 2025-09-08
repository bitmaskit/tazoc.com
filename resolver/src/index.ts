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

		// Capture comprehensive analytics data
		const analyticsData: AnalyticsData = {
			// Required fields
			shortCode: shortCode,
			timestamp: new Date().toISOString(),
			isBot: req.cf?.botManagement?.verifiedBot || false,
			
			// Geographic data from Cloudflare
			country: req.cf?.country,
			continent: req.cf?.continent,
			region: req.cf?.region,
			city: req.cf?.city,
			
			// Network information
			asn: req.cf?.asn,
			asOrganization: req.cf?.asOrganization,
			colo: req.cf?.colo,
			
			// User agent and device info
			userAgent: req.headers.get('user-agent'),
			language: req.headers.get('accept-language')?.split(',')[0]?.trim(),
			referer: req.headers.get('referer'),
			
			// Bot detection and quality scores
			botScore: req.cf?.botManagement?.score,
			
			// Request metadata
			ipAddress: req.headers.get('cf-connecting-ip'),
			httpProtocol: req.cf?.httpProtocol,
		};

		// Send analytics data to queue using fire-and-forget pattern
		// This ensures redirects are not blocked by analytics processing
		ctx.waitUntil(
			(async () => {
				try {
					await env.shortener_analytics.send(analyticsData);
					console.log(`Analytics queued for shortCode: ${shortCode}`);
				} catch (error) {
					// Log error but don't fail the redirect
					console.error('Failed to queue analytics data:', error, {
						shortCode,
						timestamp: analyticsData.timestamp
					});
					
					// Could implement fallback storage here if needed
					// For now, we prioritize redirect performance over analytics completeness
				}
			})()
		);
		return new Response(null, {
			status: 302,
			headers: {
				Location: resolvedUrl,
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			},
		});
	},
} satisfies ExportedHandler<Env, Error>;
