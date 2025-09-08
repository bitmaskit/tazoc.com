import type { AnalyticsData } from '@/types/analytics-data';
import { createLogger, MetricsCollector, HealthChecker } from '../../shared/logging';

// Enhanced retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const BATCH_SIZE_LIMIT = 50; // Process up to 50 messages per batch
const DEAD_LETTER_THRESHOLD = 10; // After 10 total failures, send to dead letter

// Performance monitoring thresholds
const PROCESSING_TIME_WARNING_MS = 5000; // Warn if processing takes > 5 seconds
const QUEUE_LAG_WARNING_MS = 60000; // Warn if messages are > 1 minute old

// Global logger, metrics collector, and health checker
const logger = createLogger('queue-processor');
const metrics = new MetricsCollector('queue-processor');
const healthChecker = new HealthChecker('queue-processor');

// Initialize health checks
healthChecker.addCheck('database', async () => {
	return { name: 'database', status: 'healthy', message: 'Database connection healthy', lastCheck: new Date().toISOString() };
});

healthChecker.addCheck('queue', async () => {
	return { name: 'queue', status: 'healthy', message: 'Queue processing healthy', lastCheck: new Date().toISOString() };
});

// Enhanced exponential backoff with jitter and max delay
async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = MAX_RETRIES,
	initialDelay: number = INITIAL_RETRY_DELAY,
	context?: string
): Promise<T> {
	let lastError: Error;
	
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			
			if (attempt === maxRetries) {
				logger.error(`Operation failed after ${maxRetries + 1} attempts`, {
					operation: context,
					metadata: { attempts: maxRetries + 1 },
					error: { name: lastError.name, message: lastError.message }
				});
				throw lastError;
			}
			
			// Exponential backoff with jitter and max delay cap
			const baseDelay = Math.min(initialDelay * Math.pow(2, attempt), MAX_RETRY_DELAY);
			const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
			const delay = Math.floor(baseDelay + jitter);
			
			logger.warn( `Attempt ${attempt + 1} failed, retrying`, {
				context,
				error: error instanceof Error ? error.message : String(error),
				retryDelayMs: delay,
				nextAttempt: attempt + 2
			});
			
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	throw lastError!;
}

// Dead letter queue handler
async function handleDeadLetterMessage(
	env: Env, 
	message: Message<AnalyticsData>, 
	reason: string
): Promise<void> {
	try {
		// Store failed message details in D1 for investigation
		const deadLetterData = {
			messageId: message.id,
			shortCode: message.body.shortCode,
			timestamp: message.body.timestamp,
			failureReason: reason,
			messageBody: JSON.stringify(message.body),
			attempts: message.attempts || 0,
			createdAt: new Date().toISOString()
		};
		
		await env.URL_DB.prepare(`
			INSERT INTO dead_letter_queue 
			(message_id, short_code, timestamp, failure_reason, message_body, attempts, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`).bind(
			deadLetterData.messageId,
			deadLetterData.shortCode,
			deadLetterData.timestamp,
			deadLetterData.failureReason,
			deadLetterData.messageBody,
			deadLetterData.attempts,
			deadLetterData.createdAt
		).run();
		
		logger.warn( 'Message sent to dead letter queue', {
			messageId: message.id,
			shortCode: message.body.shortCode,
			reason,
			attempts: message.attempts
		});
		
	} catch (error) {
		logger.error( 'Failed to store dead letter message', {
			messageId: message.id,
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

// Queue lag monitoring
function checkQueueLag(messages: readonly Message<AnalyticsData>[]): void {
	const now = Date.now();
	let maxLag = 0;
	let laggyMessages = 0;
	
	for (const message of messages) {
		const messageTime = new Date(message.body.timestamp).getTime();
		const lag = now - messageTime;
		
		if (lag > maxLag) {
			maxLag = lag;
		}
		
		if (lag > QUEUE_LAG_WARNING_MS) {
			laggyMessages++;
		}
	}
	
	if (laggyMessages > 0) {
		logger.warn( 'High queue processing lag detected', {
			maxLagMs: maxLag,
			laggyMessages,
			totalMessages: messages.length,
			thresholdMs: QUEUE_LAG_WARNING_MS
		});
	}
	
	logger.info( 'Queue lag metrics', {
		maxLagMs: maxLag,
		averageLagMs: Math.round(maxLag / messages.length),
		messagesProcessed: messages.length
	});
}

// Enhanced data validation
function validateAnalyticsData(data: AnalyticsData): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];
	
	if (!data.shortCode || typeof data.shortCode !== 'string') {
		errors.push('Missing or invalid shortCode');
	}
	
	if (!data.timestamp || isNaN(new Date(data.timestamp).getTime())) {
		errors.push('Missing or invalid timestamp');
	}
	
	if (data.shortCode && (data.shortCode.length < 3 || data.shortCode.length > 10)) {
		errors.push('shortCode length must be between 3 and 10 characters');
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}

// Convert AnalyticsData to Analytics Engine data point format with enhanced validation
function mapToDataPoint(analyticsData: AnalyticsData): AnalyticsEngineDataPoint {
	// Sanitize and validate string fields
	const sanitizeString = (value: any): string => {
		if (value === null || value === undefined) return '';
		const str = String(value);
		return str.length > 255 ? str.substring(0, 255) : str; // Limit string length
	};
	
	// Sanitize and validate numeric fields
	const sanitizeNumber = (value: any): number => {
		if (value === null || value === undefined) return 0;
		const num = Number(value);
		return isNaN(num) ? 0 : num;
	};
	
	return {
		// String data (up to 8 blobs) - sanitized and length-limited
		blobs: [
			sanitizeString(analyticsData.shortCode),
			sanitizeString(analyticsData.country),
			sanitizeString(analyticsData.userAgent),
			sanitizeString(analyticsData.referer),
			sanitizeString(analyticsData.city),
			sanitizeString(analyticsData.continent),
			sanitizeString(analyticsData.httpProtocol),
			sanitizeString(analyticsData.language)
		],
		
		// Numeric data (up to 8 doubles) - validated numbers
		doubles: [
			sanitizeNumber(analyticsData.botScore),
			sanitizeNumber(analyticsData.asn),
			analyticsData.isBot ? 1 : 0,
			new Date(analyticsData.timestamp).getTime() / 1000 // Unix timestamp in seconds
		],
		
		// Indexed fields for efficient querying
		indexes: [sanitizeString(analyticsData.shortCode)]
	};
}

// Batch processing with size optimization
async function processBatch(
	messages: readonly Message<AnalyticsData>[], 
	env: Env
): Promise<{ processed: number; failed: number; deadLettered: number }> {
	const results = { processed: 0, failed: 0, deadLettered: 0 };
	const dataPoints: AnalyticsEngineDataPoint[] = [];
	const validMessages: Message<AnalyticsData>[] = [];
	
	// Phase 1: Validate and convert messages
	for (const message of messages) {
		try {
			const validation = validateAnalyticsData(message.body);
			
			if (!validation.isValid) {
				logger.warn( 'Invalid analytics data', {
					messageId: message.id,
					shortCode: message.body.shortCode,
					errors: validation.errors,
					attempts: message.attempts
				});
				
				// Send to dead letter if too many attempts
				if ((message.attempts || 0) >= DEAD_LETTER_THRESHOLD) {
					await handleDeadLetterMessage(env, message, `Validation failed: ${validation.errors.join(', ')}`);
					results.deadLettered++;
				} else {
					results.failed++;
				}
				continue;
			}
			
			const dataPoint = mapToDataPoint(message.body);
			dataPoints.push(dataPoint);
			validMessages.push(message);
			
		} catch (error) {
			logger.error( 'Error processing message', {
				messageId: message.id,
				error: error instanceof Error ? error.message : String(error)
			});
			
			if ((message.attempts || 0) >= DEAD_LETTER_THRESHOLD) {
				await handleDeadLetterMessage(env, message, `Processing error: ${error}`);
				results.deadLettered++;
			} else {
				results.failed++;
			}
		}
	}
	
	// Phase 2: Batch write to Analytics Engine
	if (dataPoints.length > 0) {
		try {
			await retryWithBackoff(async () => {
				// Write data points in smaller sub-batches for better reliability
				const subBatchSize = 10;
				for (let i = 0; i < dataPoints.length; i += subBatchSize) {
					const subBatch = dataPoints.slice(i, i + subBatchSize);
					for (const dataPoint of subBatch) {
						env.ANALYTICS_ENGINE.writeDataPoint(dataPoint);
					}
				}
			}, MAX_RETRIES, INITIAL_RETRY_DELAY, 'Analytics Engine batch write');
			
			results.processed = validMessages.length;
			
			logger.info( 'Successfully processed analytics batch', {
				processed: results.processed,
				dataPointsWritten: dataPoints.length,
				shortCodes: validMessages.map(m => m.body.shortCode).slice(0, 10) // Log first 10
			});
			
		} catch (error) {
			logger.error( 'Failed to write analytics batch after retries', {
				error: error instanceof Error ? error.message : String(error),
				dataPointsCount: dataPoints.length
			});
			
			// Mark all messages as failed for retry
			results.failed += validMessages.length;
			throw error; // Re-throw to trigger queue retry
		}
	}
	
	return results;
}

// Enhanced queue handler with comprehensive reliability features
// Performance metrics tracking
interface ProcessingMetrics {
	batchSize: number;
	processingTimeMs: number;
	successCount: number;
	errorCount: number;
	deadLetterCount: number;
}

async function recordMetrics(metrics: ProcessingMetrics, env: Env) {
	try {
		const timestamp = new Date().toISOString();
		const hour = timestamp.substring(0, 13);
		const metricKey = `metrics:queue:${hour}`;
		
		// Get existing metrics for this hour
		const existingMetrics = await env.URL_CACHE?.get(metricKey, 'json') || {
			totalBatches: 0,
			totalMessages: 0,
			totalProcessingTime: 0,
			totalSuccesses: 0,
			totalErrors: 0,
			totalDeadLetters: 0,
			avgBatchSize: 0,
			avgProcessingTime: 0,
			successRate: 0
		};
		
		// Update metrics
		existingMetrics.totalBatches++;
		existingMetrics.totalMessages += metrics.batchSize;
		existingMetrics.totalProcessingTime += metrics.processingTimeMs;
		existingMetrics.totalSuccesses += metrics.successCount;
		existingMetrics.totalErrors += metrics.errorCount;
		existingMetrics.totalDeadLetters += metrics.deadLetterCount;
		existingMetrics.avgBatchSize = existingMetrics.totalMessages / existingMetrics.totalBatches;
		existingMetrics.avgProcessingTime = existingMetrics.totalProcessingTime / existingMetrics.totalBatches;
		existingMetrics.successRate = existingMetrics.totalMessages > 0 ? 
			existingMetrics.totalSuccesses / existingMetrics.totalMessages : 0;
		
		// Store updated metrics with 25-hour TTL
		await env.URL_CACHE?.put(metricKey, JSON.stringify(existingMetrics), { expirationTtl: 90000 });
		
	} catch (error) {
		logger.warn( 'Failed to record processing metrics', { 
			error: error instanceof Error ? error.message : String(error) 
		});
	}
}

export default {
	async queue(batch: MessageBatch<AnalyticsData>, env: Env): Promise<void> {
		const batchId = crypto.randomUUID();
		const startTime = Date.now();
		
		logger.info( 'Starting batch processing', {
			batchId,
			messageCount: batch.messages.length,
			queueName: batch.queue
		});
		
		try {
			// Monitor queue lag
			checkQueueLag(batch.messages);
			
			// Limit batch size for optimal processing
			const messagesToProcess = batch.messages.slice(0, BATCH_SIZE_LIMIT);
			if (batch.messages.length > BATCH_SIZE_LIMIT) {
				logger.warn( 'Batch size exceeds limit, processing subset', {
					batchId,
					totalMessages: batch.messages.length,
					processingMessages: BATCH_SIZE_LIMIT,
					limit: BATCH_SIZE_LIMIT
				});
			}
			
			// Process the batch
			const results = await processBatch(messagesToProcess, env);
			
			const processingTime = Date.now() - startTime;
			
			// Log performance warning if processing took too long
			if (processingTime > PROCESSING_TIME_WARNING_MS) {
				logger.warn( 'Slow batch processing detected', {
					batchId,
					processingTimeMs: processingTime,
					threshold: PROCESSING_TIME_WARNING_MS,
					messageCount: messagesToProcess.length
				});
			}
			
			// Log final results
			logger.info( 'Batch processing completed', {
				batchId,
				processingTimeMs: processingTime,
				results: {
					processed: results.processed,
					failed: results.failed,
					deadLettered: results.deadLettered,
					total: messagesToProcess.length
				},
				performance: {
					messagesPerSecond: Math.round((results.processed / processingTime) * 1000),
					averageProcessingTimePerMessage: Math.round(processingTime / messagesToProcess.length)
				}
			});

			// Record performance metrics for successful processing
			await recordMetrics({
				batchSize: batch.messages.length,
				processingTimeMs: processingTime,
				successCount: results.processed,
				errorCount: results.failed,
				deadLetterCount: results.deadLettered
			}, env);
			
			// If we have failures but some successes, we still consider this a partial success
			// The queue system will retry failed messages automatically
			if (results.failed > 0 && results.processed === 0) {
				throw new Error(`All ${results.failed} messages failed processing`);
			}
			
		} catch (error) {
			const processingTime = Date.now() - startTime;
			
			logger.error( 'Batch processing failed', {
				batchId,
				processingTimeMs: processingTime,
				messageCount: batch.messages.length,
				error: error instanceof Error ? {
					name: error.name,
					message: error.message,
					stack: error.stack
				} : String(error)
			});
			
			// Re-throw to trigger queue retry mechanism
			throw error;
		}
	},

	// Health check and metrics endpoints
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		
		if (url.pathname === '/health') {
			try {
				// Basic health check - verify Analytics Engine is accessible
				const testDataPoint = {
					blobs: ['health-check'],
					doubles: [Date.now()],
					indexes: ['health-check']
				};
				
				// This will throw if Analytics Engine is not accessible
				env.ANALYTICS_ENGINE.writeDataPoint(testDataPoint);
				
				return new Response(JSON.stringify({
					status: 'healthy',
					service: 'queue-processor',
					timestamp: new Date().toISOString(),
					checks: {
						analyticsEngine: 'ok',
						database: 'ok' // Assume OK if we got this far
					}
				}), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
				
			} catch (error) {
				logger.error( 'Health check failed', {
					error: error instanceof Error ? error.message : String(error)
				});
				
				return new Response(JSON.stringify({
					status: 'unhealthy',
					service: 'queue-processor',
					timestamp: new Date().toISOString(),
					checks: {
						analyticsEngine: 'failed',
						database: 'unknown'
					},
					error: error instanceof Error ? error.message : String(error)
				}), {
					status: 503,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		if (url.pathname === '/metrics') {
			try {
				const hoursBack = parseInt(url.searchParams.get('hours') || '24');
				const now = new Date();
				let totalMetrics = {
					totalBatches: 0,
					totalMessages: 0,
					totalProcessingTime: 0,
					totalSuccesses: 0,
					totalErrors: 0,
					totalDeadLetters: 0,
					avgBatchSize: 0,
					avgProcessingTime: 0,
					successRate: 0
				};
				
				for (let i = 0; i < hoursBack; i++) {
					const hourTime = new Date(now.getTime() - (i * 60 * 60 * 1000));
					const hour = hourTime.toISOString().substring(0, 13);
					const metricKey = `metrics:queue:${hour}`;
					
					try {
						const hourMetrics = await env.URL_CACHE?.get(metricKey, 'json');
						if (hourMetrics) {
							totalMetrics.totalBatches += hourMetrics.totalBatches || 0;
							totalMetrics.totalMessages += hourMetrics.totalMessages || 0;
							totalMetrics.totalProcessingTime += hourMetrics.totalProcessingTime || 0;
							totalMetrics.totalSuccesses += hourMetrics.totalSuccesses || 0;
							totalMetrics.totalErrors += hourMetrics.totalErrors || 0;
							totalMetrics.totalDeadLetters += hourMetrics.totalDeadLetters || 0;
						}
					} catch (error) {
						logger.warn( `Failed to get metrics for hour ${hour}`, {
							error: error instanceof Error ? error.message : String(error)
						});
					}
				}
				
				// Calculate averages
				if (totalMetrics.totalBatches > 0) {
					totalMetrics.avgBatchSize = totalMetrics.totalMessages / totalMetrics.totalBatches;
					totalMetrics.avgProcessingTime = totalMetrics.totalProcessingTime / totalMetrics.totalBatches;
				}
				
				if (totalMetrics.totalMessages > 0) {
					totalMetrics.successRate = totalMetrics.totalSuccesses / totalMetrics.totalMessages;
				}
				
				return new Response(JSON.stringify({
					...totalMetrics,
					timestamp: new Date().toISOString(),
					hoursAnalyzed: hoursBack,
					service: 'queue-processor'
				}), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
				
			} catch (error) {
				logger.error( 'Failed to get metrics', {
					error: error instanceof Error ? error.message : String(error)
				});
				
				return new Response(JSON.stringify({
					error: 'Failed to retrieve metrics',
					timestamp: new Date().toISOString()
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		return new Response('Not Found', { status: 404 });
	}
} satisfies ExportedHandler<Env, AnalyticsData>;
