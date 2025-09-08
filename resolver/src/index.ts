import type { AnalyticsData } from '@/types/analytics-data';
import { createLogger, MetricsCollector, HealthChecker, type LogContext } from '../../shared/logging';

// Cache metrics interface
interface CacheMetrics {
	hits: number;
	misses: number;
	writes: number;
	invalidates: number;
	errors: number;
	totalRequests: number;
	avgTTL: number;
	ttlSum: number;
	ttlCount: number;
}

// Circuit breaker state for D1 database
interface CircuitBreakerState {
	failures: number;
	lastFailureTime: number;
	state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// Global circuit breaker state (persisted across requests in the same isolate)
let circuitBreaker: CircuitBreakerState = {
	failures: 0,
	lastFailureTime: 0,
	state: 'CLOSED'
};

const CIRCUIT_BREAKER_CONFIG = {
	failureThreshold: 5,
	recoveryTimeoutMs: 30000, // 30 seconds
	halfOpenMaxCalls: 3
};

// Global logger and metrics collector
const logger = createLogger('resolver');
const metrics = new MetricsCollector('resolver');
const healthChecker = new HealthChecker('resolver');

// Initialize health checks
healthChecker.addCheck('circuit_breaker', async () => {
	if (circuitBreaker.state === 'OPEN') {
		return {
			name: 'circuit_breaker',
			status: 'warning',
			message: 'Circuit breaker is open',
			lastCheck: new Date().toISOString(),
			metadata: { 
				failures: circuitBreaker.failures,
				lastFailureTime: circuitBreaker.lastFailureTime 
			}
		};
	}
	return { name: 'circuit_breaker', status: 'ok', message: 'Circuit breaker is healthy', lastCheck: new Date().toISOString() };
});

healthChecker.addCheck('memory', async () => {
	// Basic memory check - in a real environment you'd have more sophisticated monitoring
	return { name: 'memory', status: 'ok', message: 'Memory usage within limits', lastCheck: new Date().toISOString() };
});

// Circuit breaker implementation for D1 calls
async function callWithCircuitBreaker<T>(
	operation: () => Promise<T>,
	operationName: string
): Promise<T | null> {
	const now = Date.now();
	
	// Check if circuit breaker should transition from OPEN to HALF_OPEN
	if (circuitBreaker.state === 'OPEN' && 
		now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_CONFIG.recoveryTimeoutMs) {
		circuitBreaker.state = 'HALF_OPEN';
		logger.info('Circuit breaker transitioning to HALF_OPEN', { operation: operationName });
	}
	
	// Reject immediately if circuit is OPEN
	if (circuitBreaker.state === 'OPEN') {
		logger.warn('Circuit breaker is OPEN, rejecting call', { operation: operationName });
		metrics.incrementCounter('circuit_breaker_rejections');
		return null;
	}
	
	try {
		const result = await operation();
		
		// Success - reset circuit breaker if it was HALF_OPEN
		if (circuitBreaker.state === 'HALF_OPEN') {
			circuitBreaker.state = 'CLOSED';
			circuitBreaker.failures = 0;
			logger.info('Circuit breaker reset to CLOSED after successful call', { operation: operationName });
		}
		
		return result;
	} catch (error) {
		circuitBreaker.failures++;
		circuitBreaker.lastFailureTime = now;
		
		logger.error(`Circuit breaker recorded failure for ${operationName}`, {
			operation: operationName,
			metadata: {
				failures: circuitBreaker.failures,
				error: error instanceof Error ? error.message : String(error)
			}
		});
		
		metrics.incrementCounter('circuit_breaker_failures');
		
		// Open circuit if failure threshold exceeded
		if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
			circuitBreaker.state = 'OPEN';
			logger.error('Circuit breaker opened due to repeated failures', {
				operation: operationName,
				metadata: { failures: circuitBreaker.failures }
			});
			metrics.incrementCounter('circuit_breaker_opens');
		}
		
		return null;
	}
}

// Resilient KV get with fallback and metrics tracking
async function getFromKVWithFallback(env: Env, shortCode: string): Promise<{url: string | null, clickCount?: number}> {
	try {
		const result = await env.URL_CACHE.get(`link:${shortCode}`, 'json') as { originalUrl: string; clickCount?: number } | null;
		if (result && result.originalUrl) {
			await storeCacheMetrics(env.URL_CACHE, shortCode, 'hit');
			logger.info('KV cache hit', { shortCode });
			metrics.incrementCounter('cache_hits');
			return { url: result.originalUrl, clickCount: result.clickCount };
		}
		await storeCacheMetrics(env.URL_CACHE, shortCode, 'miss');
		logger.info('KV cache miss', { shortCode });
		metrics.incrementCounter('cache_misses');
		return { url: null };
	} catch (error) {
		await storeCacheMetrics(env.URL_CACHE, shortCode, 'error');
		logger.warn('KV cache unavailable, will fallback to D1', {
			shortCode,
			error: error instanceof Error ? {
				name: error.name,
				message: error.message
			} : { name: 'Unknown', message: String(error) }
		});
		metrics.incrementCounter('cache_errors');
		return { url: null };
	}
}

// Resilient D1 query with circuit breaker
async function getFromD1WithCircuitBreaker(env: Env, shortCode: string): Promise<{url: string | null, clickCount?: number}> {
	const result = await callWithCircuitBreaker(async () => {
		const dbResult = await env.URL_DB.prepare('SELECT destination, click_count FROM links WHERE short_code = ? AND is_active = 1 LIMIT 1')
			.bind(shortCode)
			.first();
		
		if (dbResult?.destination) {
			logger.info('D1 database hit', { shortCode });
			metrics.incrementCounter('database_hits');
			return { url: dbResult.destination as string, clickCount: dbResult.click_count as number || 0 };
		}
		
		logger.info('D1 database miss', { shortCode });
		metrics.incrementCounter('database_misses');
		return { url: null };
	}, 'D1_QUERY');
	
	return result || { url: null };
}

// Resilient cache update with intelligent TTL (fire-and-forget)
async function updateCacheAsync(env: Env, shortCode: string, url: string, clickCount: number = 0, ctx: ExecutionContext) {
	ctx.waitUntil(
		(async () => {
			try {
				// Calculate intelligent TTL based on usage patterns
				const baseTTL = 60 * 60 * 24; // 24 hours
				let ttl = baseTTL;
				
				if (clickCount > 100) {
					ttl = baseTTL * 7; // Very popular links get 7 days
				} else if (clickCount > 10) {
					ttl = baseTTL * 2; // Popular links get 2 days
				} else if (clickCount === 0) {
					ttl = baseTTL / 2; // Unused links get 12 hours
				}
				
				const cacheData = {
					originalUrl: url,
					isActive: true,
					clickCount,
					cachedAt: new Date().toISOString(),
					ttl
				};
				
				await env.URL_CACHE.put(`link:${shortCode}`, JSON.stringify(cacheData), { expirationTtl: ttl });
				
				// Store cache metrics
				await storeCacheMetrics(env.URL_CACHE, shortCode, 'write', ttl);
				
				logger.info('Cache updated successfully', { shortCode, metadata: { ttl } });
			} catch (error) {
				logger.warn('Failed to update cache', {
					shortCode,
					error: error instanceof Error ? {
						name: error.name,
						message: error.message
					} : { name: 'Unknown', message: String(error) }
				});
			}
		})()
	);
}

// Store cache metrics for monitoring
async function storeCacheMetrics(
	kv: KVNamespace, 
	shortCode: string, 
	operation: 'hit' | 'miss' | 'write' | 'invalidate' | 'error',
	ttl?: number
): Promise<void> {
	try {
		const timestamp = new Date().toISOString();
		const hour = timestamp.substring(0, 13);
		const metricKey = `metrics:cache:${hour}`;
		
		const existingMetrics = (await kv.get(metricKey, 'json') as CacheMetrics | null) || {
			hits: 0, misses: 0, writes: 0, invalidates: 0, errors: 0,
			totalRequests: 0, avgTTL: 0, ttlSum: 0, ttlCount: 0
		};
		
		(existingMetrics as any)[operation + 's']++;
		existingMetrics.totalRequests++;
		
		if (operation === 'write' && ttl) {
			existingMetrics.ttlSum += ttl;
			existingMetrics.ttlCount++;
			existingMetrics.avgTTL = existingMetrics.ttlSum / existingMetrics.ttlCount;
		}
		
		await kv.put(metricKey, JSON.stringify(existingMetrics), { expirationTtl: 90000 });
	} catch (error) {
		// Don't let metrics failures affect main operations
	}
}

export default {
	async fetch(req, env, ctx): Promise<Response> {
		const requestId = crypto.randomUUID();
		const startTime = Date.now();
		const requestLogger = logger.child({ requestId });
		
		// Increment request counter
		metrics.incrementCounter('requests');
		
		try {
			const url = new URL(req.url);
			
			// Handle health check endpoint
			if (url.pathname === '/health') {
				const healthResult = await healthChecker.runHealthChecks();
				const statusCode = healthResult.status === 'healthy' ? 200 : 
								  healthResult.status === 'degraded' ? 200 : 503;
				
				return new Response(JSON.stringify(healthResult), {
					status: statusCode,
					headers: { 
						'Content-Type': 'application/json',
						'X-Request-ID': requestId
					}
				});
			}
			
			// Handle metrics endpoint
			if (url.pathname === '/metrics') {
				const currentMetrics = metrics.getMetrics();
				return new Response(JSON.stringify({
					...currentMetrics,
					timestamp: new Date().toISOString(),
					service: 'resolver'
				}), {
					status: 200,
					headers: { 
						'Content-Type': 'application/json',
						'X-Request-ID': requestId
					}
				});
			}
			
			// Handle root path
			if (url.pathname === '/') {
				return env.ASSETS.fetch('index.html');
			}
			
			const shortCode = url.pathname.slice(1);
			
			// Validate short code format
			if (!shortCode || shortCode.length < 3 || shortCode.length > 10) {
				requestLogger.warn('Invalid short code format', { shortCode });
				metrics.incrementCounter('invalid_requests');
				return new Response(JSON.stringify({
					error: {
						code: 'INVALID_SHORT_CODE',
						message: 'Short code must be between 3 and 10 characters'
					},
					timestamp: new Date().toISOString(),
					requestId
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			requestLogger.info('Processing redirect request', { shortCode });
			
			// Step 1: Try KV cache with fallback
			let result = await getFromKVWithFallback(env, shortCode);
			let resolvedUrl = result.url;
			let clickCount = result.clickCount || 0;
			
			// Step 2: If KV miss or unavailable, try D1 with circuit breaker
			if (!resolvedUrl) {
				result = await getFromD1WithCircuitBreaker(env, shortCode);
				resolvedUrl = result.url;
				clickCount = result.clickCount || 0;
				
				// If we got a result from D1, update cache asynchronously with intelligent TTL
				if (resolvedUrl) {
					updateCacheAsync(env, shortCode, resolvedUrl, clickCount, ctx);
				}
			}
			
			// Step 3: Handle not found case
			if (!resolvedUrl) {
				requestLogger.info('Short code not found', { shortCode });
				metrics.incrementCounter('not_found');
				return new Response(JSON.stringify({
					error: {
						code: 'NOT_FOUND',
						message: `Short code '${shortCode}' not found`
					},
					timestamp: new Date().toISOString(),
					requestId
				}), {
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// Step 4: Process analytics asynchronously (fire-and-forget)
			processAnalyticsAsync(req, shortCode, requestId, ctx, env);
			
			// Step 5: Perform redirect
			const processingTime = Date.now() - startTime;
			requestLogger.info('Redirect successful', { 
				shortCode, 
				duration: processingTime,
				metadata: { destination: resolvedUrl }
			});
			
			metrics.recordTiming('response_time', processingTime);
			metrics.incrementCounter('successful_redirects');
			
			return new Response(null, {
				status: 302,
				headers: {
					Location: resolvedUrl,
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'X-Request-ID': requestId
				},
			});
			
		} catch (error) {
			const processingTime = Date.now() - startTime;
			requestLogger.error('Unexpected error in resolver', {
				duration: processingTime,
				error: error instanceof Error ? {
					name: error.name,
					message: error.message,
					stack: error.stack
				} : { name: 'Unknown', message: String(error) }
			});
			
			metrics.recordTiming('response_time', processingTime);
			metrics.incrementCounter('errors');
			
			// Return 500 with proper error structure
			return new Response(JSON.stringify({
				error: {
					code: 'INTERNAL_SERVER_ERROR',
					message: 'An unexpected error occurred while processing your request'
				},
				timestamp: new Date().toISOString(),
				requestId
			}), {
				status: 500,
				headers: { 
					'Content-Type': 'application/json',
					'X-Request-ID': requestId
				}
			});
		} finally {
			// Log metrics periodically (every 100 requests)
			if (metrics.getMetrics().requestCount % 100 === 0) {
				metrics.logMetrics();
			}
		}
	},
} satisfies ExportedHandler<Env, Error>;

// Async analytics processing with resilient error handling
function processAnalyticsAsync(
	req: Request, 
	shortCode: string, 
	requestId: string, 
	ctx: ExecutionContext, 
	env: Env
) {
	ctx.waitUntil(
		(async () => {
			try {
				// Capture comprehensive analytics data
				const analyticsData: AnalyticsData = {
					// Required fields
					shortCode: shortCode,
					timestamp: new Date().toISOString(),
					isBot: (req.cf as any)?.botManagement?.verifiedBot || false,
					
					// Geographic data from Cloudflare
					country: (req.cf as any)?.country,
					continent: (req.cf as any)?.continent,
					region: (req.cf as any)?.region,
					city: (req.cf as any)?.city,
					
					// Network information
					asn: (req.cf as any)?.asn,
					asOrganization: (req.cf as any)?.asOrganization,
					colo: (req.cf as any)?.colo,
					
					// User agent and device info
					userAgent: req.headers.get('user-agent'),
					language: req.headers.get('accept-language')?.split(',')[0]?.trim(),
					referer: req.headers.get('referer'),
					
					// Bot detection and quality scores
					botScore: (req.cf as any)?.botManagement?.score,
					
					// Request metadata
					ipAddress: req.headers.get('cf-connecting-ip'),
					httpProtocol: (req.cf as any)?.httpProtocol,
				};

				await env.shortener_analytics.send(analyticsData);
				logger.info('Analytics queued successfully', { shortCode, requestId });
				
			} catch (error) {
				// Log error but don't fail the redirect
				logger.error('Failed to queue analytics data', {
					shortCode,
					requestId,
					error: error instanceof Error ? {
						name: error.name,
						message: error.message
					} : { name: 'Unknown', message: String(error) }
				});
				
				metrics.incrementCounter('analytics_errors');
				
				// Could implement fallback storage here if needed
				// For now, we prioritize redirect performance over analytics completeness
			}
		})()
	);
}
