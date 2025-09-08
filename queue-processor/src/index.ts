import type { AnalyticsData } from '@/types/analytics-data';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Utility function for exponential backoff retry
async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = MAX_RETRIES,
	initialDelay: number = INITIAL_RETRY_DELAY
): Promise<T> {
	let lastError: Error;
	
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			
			if (attempt === maxRetries) {
				console.error(`Failed after ${maxRetries + 1} attempts:`, lastError);
				throw lastError;
			}
			
			const delay = initialDelay * Math.pow(2, attempt);
			console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	throw lastError!;
}

// Convert AnalyticsData to Analytics Engine data point format
function mapToDataPoint(analyticsData: AnalyticsData): AnalyticsEngineDataPoint {
	return {
		// String data (up to 8 blobs) - ensure no undefined values
		blobs: [
			analyticsData.shortCode || '',
			analyticsData.country || '',
			analyticsData.userAgent || '',
			analyticsData.referer || '',
			analyticsData.city || '',
			analyticsData.continent || '',
			analyticsData.httpProtocol || '',
			analyticsData.language || ''
		],
		
		// Numeric data (up to 8 doubles) - ensure valid numbers
		doubles: [
			analyticsData.botScore || 0,
			analyticsData.asn || 0,
			analyticsData.isBot ? 1 : 0,
			new Date(analyticsData.timestamp).getTime() / 1000 // Unix timestamp in seconds
		],
		
		// Indexed fields for efficient querying
		indexes: [analyticsData.shortCode || '']
	};
}

// Queue: https://developers.cloudflare.com/queues/get-started/
export default {
	// https://developers.cloudflare.com/queues/platform/javascript-apis/#messagebatch
	async queue(batch: MessageBatch<AnalyticsData>, env: Env): Promise<void> {
		console.log(`Processing batch of ${batch.messages.length} analytics events`);
		
		// Process analytics data and write to Analytics Engine
		const dataPoints: AnalyticsEngineDataPoint[] = [];
		const processedMessages: string[] = [];

		// Convert all messages to data points
		for (const message of batch.messages) {
			try {
				const analyticsData = message.body as AnalyticsData;
				
				// Validate required fields
				if (!analyticsData.shortCode || !analyticsData.timestamp) {
					console.warn('Skipping invalid analytics data - missing required fields:', {
						shortCode: analyticsData.shortCode,
						timestamp: analyticsData.timestamp
					});
					continue;
				}

				console.log(`Processing click for shortCode: ${analyticsData.shortCode}`);
				console.log(`From: ${analyticsData.city}, ${analyticsData.country}`);
				console.log(`Bot score: ${analyticsData.botScore}, Is bot: ${analyticsData.isBot}`);

				const dataPoint = mapToDataPoint(analyticsData);
				dataPoints.push(dataPoint);
				processedMessages.push(analyticsData.shortCode);
				
			} catch (error) {
				console.error('Error processing analytics message:', error, message.body);
				// Continue processing other messages rather than failing the entire batch
			}
		}

		// Write data points to Analytics Engine with retry logic
		if (dataPoints.length > 0) {
			try {
				await retryWithBackoff(async () => {
					// Analytics Engine API requires individual writeDataPoint calls
					for (const dataPoint of dataPoints) {
						env.ANALYTICS_ENGINE.writeDataPoint(dataPoint);
					}
				});
				
				console.log(`Successfully wrote ${dataPoints.length} data points to Analytics Engine for shortCodes: ${processedMessages.join(', ')}`);
			} catch (error) {
				console.error('Failed to write data points to Analytics Engine after retries:', error);
				// Re-throw to trigger queue retry mechanism
				throw error;
			}
		} else {
			console.warn('No valid data points to write to Analytics Engine');
		}
	},
} satisfies ExportedHandler<Env, AnalyticsData>;
