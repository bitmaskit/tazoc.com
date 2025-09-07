import type { AnalyticsData } from '@/types/analytics-data';

// Queue: https://developers.cloudflare.com/queues/get-started/
export default {
	// https://developers.cloudflare.com/queues/platform/javascript-apis/#messagebatch
	async queue(batch: MessageBatch<AnalyticsData>, env: Env): Promise<void> {
		// A queue consumer can make requests to other endpoints on the Internet,
		// write to R2 object storage, query a D1 Database, and much more.
		for (let message of batch.messages) {
			const analyticsData = message.body as AnalyticsData;

			// Now you have type-safe access to all analytics fields
			console.log(`Processing click for shortCode: ${analyticsData.shortCode}`);
			console.log(`From: ${analyticsData.city}, ${analyticsData.country}`);
			console.log(`Bot score: ${analyticsData.botScore}, Is bot: ${analyticsData.isBot}`);

			// TODO: Store analytics data in D1 database
			// Example:
			// await env.URL_DB.prepare(`
			//   INSERT INTO analytics (short_code, timestamp, country, continent, region, city,
			//     asn, as_organization, colo, user_agent, language, referer, bot_score, is_bot,
			//     ip_address, http_protocol)
			//   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			// `).bind(
			//   analyticsData.shortCode,
			//   analyticsData.timestamp,
			//   analyticsData.country,
			//   analyticsData.continent,
			//   analyticsData.region,
			//   analyticsData.city,
			//   analyticsData.asn,
			//   analyticsData.asOrganization,
			//   analyticsData.colo,
			//   analyticsData.userAgent,
			//   analyticsData.language,
			//   analyticsData.referer,
			//   analyticsData.botScore,
			//   analyticsData.isBot,
			//   analyticsData.ipAddress,
			//   analyticsData.httpProtocol
			// ).run();
		}
	},
} satisfies ExportedHandler<Env, AnalyticsData>;
