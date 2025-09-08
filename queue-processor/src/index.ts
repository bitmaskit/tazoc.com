import type { AnalyticsData } from '@/types/analytics-data';

// Enhanced retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const BATCH_SIZE_LIMIT = 50; // Process up to 50 messages per batch
const DEAD_LETTER_THRESHOLD = 10; // After 10 total failures, send to dead letter

// Performance monitoring thresholds
const PROCESSING_TIME_WARNING_MS = 5000; // Warn if processing takes > 5 seconds
const QUEUE_LAG_WARNING_MS = 60000; // Warn if messages are > 1 minute old

// Structured logging utility
function logEvent(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
	const logEntry = {
		timestamp: new Date().toISOString(),
		level,
		message,
		service: 'queue-processor',
		metadata
	};
	console.log(JSON.stringify(logEntry));
}

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
				logEvent('error', `Operation failed after ${maxRetries + 1} attempts`, {
					context,
					error: lastError.message,
					attempts: maxRetries + 1
				});
				throw lastError;
			}
			
			// Exponential backoff with jitter and max delay cap
			const baseDelay = Math.min(initialDelay * Math.pow(2, attempt), MAX_RETRY_DELAY);
			const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
			const delay = Math.floor(baseDelay + jitter);
			
			logEvent('warn', `Attempt ${attempt + 1} failed, retrying`, {
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
		
		logEvent('warn', 'Message sent to dead letter queue', {
			messageId: message.id,
			shortCode: message.body.shortCode,
			reason,
			attempts: message.attempts
		});
		
	} catch (error) {
		logEvent('error', 'Failed to store dead letter message', {
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
		logEvent('warn', 'High queue processing lag detected', {
			maxLagMs: maxLag,
			laggyMessages,
			totalMessages: messages.length,
			thresholdMs: QUEUE_LAG_WARNING_MS
		});
	}
	
	logEvent('info', 'Queue lag metrics', {
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
				logEvent('warn', 'Invalid analytics data', {
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
			logEvent('error', 'Error processing message', {
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
			
			logEvent('info', 'Successfully processed analytics batch', {
				processed: results.processed,
				dataPointsWritten: dataPoints.length,
				shortCodes: validMessages.map(m => m.body.shortCode).slice(0, 10) // Log first 10
			});
			
		} catch (error) {
			logEvent('error', 'Failed to write analytics batch after retries', {
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
export default {
	async queue(batch: MessageBatch<AnalyticsData>, env: Env): Promise<void> {
		const batchId = crypto.randomUUID();
		const startTime = Date.now();
		
		logEvent('info', 'Starting batch processing', {
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
				logEvent('warn', 'Batch size exceeds limit, processing subset', {
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
				logEvent('warn', 'Slow batch processing detected', {
					batchId,
					processingTimeMs: processingTime,
					threshold: PROCESSING_TIME_WARNING_MS,
					messageCount: messagesToProcess.length
				});
			}
			
			// Log final results
			logEvent('info', 'Batch processing completed', {
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
			
			// If we have failures but some successes, we still consider this a partial success
			// The queue system will retry failed messages automatically
			if (results.failed > 0 && results.processed === 0) {
				throw new Error(`All ${results.failed} messages failed processing`);
			}
			
		} catch (error) {
			const processingTime = Date.now() - startTime;
			
			logEvent('error', 'Batch processing failed', {
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
} satisfies ExportedHandler<Env, AnalyticsData>;
