import type { AnalyticsData } from '@/types/analytics-data';

// Queue: https://developers.cloudflare.com/queues/get-started/
export default {
	// https://developers.cloudflare.com/queues/platform/javascript-apis/#messagebatch
	async queue(batch: MessageBatch<AnalyticsData>, env: Env): Promise<void> {
		// Process analytics data and write to Analytics Engine
		const dataPoints: AnalyticsEngineDataPoint[] = [];

		for (let message of batch.messages) {
			const analyticsData = message.body as AnalyticsData;

			console.log(`Processing click for shortCode: ${analyticsData.shortCode}`);
			console.log(`From: ${analyticsData.city}, ${analyticsData.country}`);
			console.log(`Bot score: ${analyticsData.botScore}, Is bot: ${analyticsData.isBot}`);

			// Convert AnalyticsData to Analytics Engine data point format
			const dataPoint: AnalyticsEngineDataPoint = {
				// String data (up to 8 blobs)
				blobs: [
					analyticsData.shortCode,
					analyticsData.country || null,
					analyticsData.userAgent || null,
					analyticsData.referer || null,
					analyticsData.city || null,
					analyticsData.continent || null,
					analyticsData.httpProtocol || null,
					analyticsData.language || null
				],
				
				// Numeric data (up to 8 doubles)
				doubles: [
					analyticsData.botScore || 0,
					analyticsData.asn || 0,
					analyticsData.isBot ? 1 : 0,
					new Date(analyticsData.timestamp).getTime()
				],
				
				// Indexed fields for efficient querying
				indexes: [analyticsData.shortCode]
			};

			dataPoints.push(dataPoint);
		}

		// Write data points to Analytics Engine in batch
		if (dataPoints.length > 0) {
			try {
				for (const dataPoint of dataPoints) {
					env.ANALYTICS_ENGINE.writeDataPoint(dataPoint);
				}
				console.log(`Successfully wrote ${dataPoints.length} data points to Analytics Engine`);
			} catch (error) {
				console.error('Failed to write data points to Analytics Engine:', error);
				// Re-throw to trigger queue retry mechanism
				throw error;
			}
		}
	},
} satisfies ExportedHandler<Env, AnalyticsData>;
