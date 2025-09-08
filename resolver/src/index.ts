import type { AnalyticsData } from '@/types/analytics-data';

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

// Structured logging utility
function logEvent(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
	const logEntry = {
		timestamp: new Date().toISOString(),
		level,
		message,
		service: 'resolver',
		metadata
	};
	console.log(JSON.stringify(logEntry));
}

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
		logEvent('info', 'Circuit breaker transitioning to HALF_OPEN', { operationName });
	}
	
	// Reject immediately if circuit is OPEN
	if (circuitBreaker.state === 'OPEN') {
		logEvent('warn', 'Circuit breaker is OPEN, rejecting call', { operationName });
		return null;
	}
	
	try {
		const result = await operation();
		
		// Success - reset circuit breaker if it was HALF_OPEN
		if (circuitBreaker.state === 'HALF_OPEN') {
			circuitBreaker.state = 'CLOSED';
			circuitBreaker.failures = 0;
			logEvent('info', 'Circuit breaker reset to CLOSED after successful call', { operationName });
		}
		
		return result;
	} catch (error) {
		circuitBreaker.failures++;
		circuitBreaker.lastFailureTime = now;
		
		logEvent('error', `Circuit breaker recorded failure for ${operationName}`, {
			operationName,
			failures: circuitBreaker.failures,
			error: error instanceof Error ? error.message : String(error)
		});
		
		// Open circuit if failure threshold exceeded
		if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
			circuitBreaker.state = 'OPEN';
			logEvent('error', 'Circuit breaker opened due to repeated failures', {
				operationName,
				failures: circuitBreaker.failures
			});
		}
		
		return null;
	}
}

// Resilient KV get with fallback
async function getFromKVWithFallback(env: Env, shortCode: string): Promise<string | null> {
	try {
		const result = await env.URL_CACHE.get(shortCode);
		if (result) {
			logEvent('info', 'KV cache hit', { shortCode });
			return result;
		}
		logEvent('info', 'KV cache miss', { shortCode });
		return null;
	} catch (error) {
		logEvent('warn', 'KV cache unavailable, will fallback to D1', {
			shortCode,
			error: error instanceof Error ? error.message : String(error)
		});
		return null;
	}
}

// Resilient D1 query with circuit breaker
async function getFromD1WithCircuitBreaker(env: Env, shortCode: string): Promise<string | null> {
	return await callWithCircuitBreaker(async () => {
		const result = await env.URL_DB.prepare('SELECT destination FROM links WHERE short_code = ? LIMIT 1')
			.bind(shortCode)
			.first();
		
		if (result?.destination) {
			logEvent('info', 'D1 database hit', { shortCode });
			return result.destination as string;
		}
		
		logEvent('info', 'D1 database miss', { shortCode });
		return null;
	}, 'D1_QUERY');
}

// Resilient cache update (fire-and-forget)
async function updateCacheAsync(env: Env, shortCode: string, url: string, ctx: ExecutionContext) {
	ctx.waitUntil(
		(async () => {
			try {
				await env.URL_CACHE.put(shortCode, url, { expirationTtl: 60 * 60 * 24 });
				logEvent('info', 'Cache updated successfully', { shortCode });
			} catch (error) {
				logEvent('warn', 'Failed to update cache', {
					shortCode,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		})()
	);
}

export default {
	async fetch(req, env, ctx): Promise<Response> {
		const requestId = crypto.randomUUID();
		const startTime = Date.now();
		
		try {
			const url = new URL(req.url);
			
			// Handle root path
			if (url.pathname === '/') {
				return env.ASSETS.fetch('index.html');
			}
			
			const shortCode = url.pathname.slice(1);
			
			// Validate short code format
			if (!shortCode || shortCode.length < 3 || shortCode.length > 10) {
				logEvent('warn', 'Invalid short code format', { shortCode, requestId });
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
			
			logEvent('info', 'Processing redirect request', { shortCode, requestId });
			
			// Step 1: Try KV cache with fallback
			let resolvedUrl = await getFromKVWithFallback(env, shortCode);
			
			// Step 2: If KV miss or unavailable, try D1 with circuit breaker
			if (!resolvedUrl) {
				resolvedUrl = await getFromD1WithCircuitBreaker(env, shortCode);
				
				// If we got a result from D1, update cache asynchronously
				if (resolvedUrl) {
					updateCacheAsync(env, shortCode, resolvedUrl, ctx);
				}
			}
			
			// Step 3: Handle not found case
			if (!resolvedUrl) {
				logEvent('info', 'Short code not found', { shortCode, requestId });
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
			logEvent('info', 'Redirect successful', { 
				shortCode, 
				requestId, 
				processingTimeMs: processingTime,
				destination: resolvedUrl 
			});
			
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
			logEvent('error', 'Unexpected error in resolver', {
				requestId,
				processingTimeMs: processingTime,
				error: error instanceof Error ? {
					name: error.name,
					message: error.message,
					stack: error.stack
				} : String(error)
			});
			
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

				await env.shortener_analytics.send(analyticsData);
				logEvent('info', 'Analytics queued successfully', { shortCode, requestId });
				
			} catch (error) {
				// Log error but don't fail the redirect
				logEvent('error', 'Failed to queue analytics data', {
					shortCode,
					requestId,
					error: error instanceof Error ? error.message : String(error)
				});
				
				// Could implement fallback storage here if needed
				// For now, we prioritize redirect performance over analytics completeness
			}
		})()
	);
}
