/**
 * Shared logging and monitoring utilities for URL shortener workers
 */

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  context?: LogContext;
}

export class Logger {
  constructor(private service: string, private context: LogContext = {}) {}

  private log(level: LogEntry['level'], message: string, context: LogContext = {}) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      context: { ...this.context, ...context }
    };
    
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  child(context: LogContext): Logger {
    return new Logger(this.service, { ...this.context, ...context });
  }
}

export function createLogger(service: string, context?: LogContext): Logger {
  return new Logger(service, context);
}

export interface MetricData {
  counters: Record<string, number>;
  timings: Record<string, { count: number; total: number; avg: number; min: number; max: number }>;
  gauges: Record<string, number>;
  requestCount: number;
  errorCount: number;
  lastReset: string;
}

export class MetricsCollector {
  private metrics: MetricData = {
    counters: {},
    timings: {},
    gauges: {},
    requestCount: 0,
    errorCount: 0,
    lastReset: new Date().toISOString()
  };

  constructor(private service: string) {}

  incrementCounter(name: string, value: number = 1) {
    this.metrics.counters[name] = (this.metrics.counters[name] || 0) + value;
    
    if (name === 'requests') {
      this.metrics.requestCount += value;
    } else if (name === 'errors') {
      this.metrics.errorCount += value;
    }
  }

  recordTiming(name: string, value: number) {
    if (!this.metrics.timings[name]) {
      this.metrics.timings[name] = { count: 0, total: 0, avg: 0, min: Infinity, max: 0 };
    }
    
    const timing = this.metrics.timings[name];
    timing.count++;
    timing.total += value;
    timing.avg = timing.total / timing.count;
    timing.min = Math.min(timing.min, value);
    timing.max = Math.max(timing.max, value);
  }

  setGauge(name: string, value: number) {
    this.metrics.gauges[name] = value;
  }

  getMetrics(): MetricData {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      counters: {},
      timings: {},
      gauges: {},
      requestCount: 0,
      errorCount: 0,
      lastReset: new Date().toISOString()
    };
  }

  logMetrics() {
    const logger = createLogger(this.service);
    logger.info('Periodic metrics report', {
      metrics: this.getMetrics(),
      uptime: Date.now() - new Date(this.metrics.lastReset).getTime()
    });
  }
}

export interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'critical';
  message?: string;
  responseTime?: number;
  lastCheck: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  checks: HealthCheck[];
  uptime: number;
}

export class HealthChecker {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  private startTime = Date.now();

  constructor(private service: string) {}

  addCheck(name: string, checkFn: () => Promise<HealthCheck>) {
    this.checks.set(name, checkFn);
  }

  async runHealthChecks(): Promise<HealthStatus> {
    const results: HealthCheck[] = [];
    
    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results.push(result);
      } catch (error) {
        results.push({
          name,
          status: 'critical',
          message: error instanceof Error ? error.message : String(error),
          lastCheck: new Date().toISOString()
        });
      }
    }

    // Determine overall status
    const criticalCount = results.filter(r => r.status === 'critical').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    
    let status: HealthStatus['status'] = 'healthy';
    if (criticalCount > 0) {
      status = 'unhealthy';
    } else if (warningCount > 0) {
      status = 'degraded';
    }

    return {
      status,
      service: this.service,
      timestamp: new Date().toISOString(),
      checks: results,
      uptime: Date.now() - this.startTime
    };
  }
}

// Alert thresholds and configuration
export interface AlertConfig {
  errorRateThreshold: number; // Percentage (0-100)
  responseTimeThreshold: number; // Milliseconds
  cacheHitRateThreshold: number; // Percentage (0-100)
  queueLagThreshold: number; // Milliseconds
  checkIntervalMs: number; // How often to check
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  errorRateThreshold: 5, // 5% error rate
  responseTimeThreshold: 1000, // 1 second
  cacheHitRateThreshold: 80, // 80% cache hit rate
  queueLagThreshold: 60000, // 1 minute queue lag
  checkIntervalMs: 60000 // Check every minute
};

export class AlertManager {
  private alerts: Map<string, { lastTriggered: number; count: number }> = new Map();
  
  constructor(
    private service: string,
    private config: AlertConfig = DEFAULT_ALERT_CONFIG,
    private logger: Logger = createLogger('alert-manager')
  ) {}

  checkMetrics(metrics: MetricData, additionalData?: Record<string, number>) {
    const now = Date.now();
    
    // Check error rate
    if (metrics.requestCount > 0) {
      const errorRate = (metrics.errorCount / metrics.requestCount) * 100;
      if (errorRate > this.config.errorRateThreshold) {
        this.triggerAlert('high_error_rate', `Error rate ${errorRate.toFixed(2)}% exceeds threshold ${this.config.errorRateThreshold}%`, {
          errorRate,
          threshold: this.config.errorRateThreshold,
          errorCount: metrics.errorCount,
          requestCount: metrics.requestCount
        });
      }
    }

    // Check response time
    const responseTime = metrics.timings.response_time;
    if (responseTime && responseTime.avg > this.config.responseTimeThreshold) {
      this.triggerAlert('slow_response_time', `Average response time ${responseTime.avg.toFixed(2)}ms exceeds threshold ${this.config.responseTimeThreshold}ms`, {
        avgResponseTime: responseTime.avg,
        threshold: this.config.responseTimeThreshold,
        maxResponseTime: responseTime.max
      });
    }

    // Check cache hit rate if provided
    if (additionalData?.cacheHitRate !== undefined) {
      const hitRate = additionalData.cacheHitRate * 100;
      if (hitRate < this.config.cacheHitRateThreshold) {
        this.triggerAlert('low_cache_hit_rate', `Cache hit rate ${hitRate.toFixed(2)}% below threshold ${this.config.cacheHitRateThreshold}%`, {
          hitRate,
          threshold: this.config.cacheHitRateThreshold
        });
      }
    }

    // Check queue lag if provided
    if (additionalData?.queueLag !== undefined && additionalData.queueLag > this.config.queueLagThreshold) {
      this.triggerAlert('high_queue_lag', `Queue lag ${additionalData.queueLag}ms exceeds threshold ${this.config.queueLagThreshold}ms`, {
        queueLag: additionalData.queueLag,
        threshold: this.config.queueLagThreshold
      });
    }
  }

  private triggerAlert(alertType: string, message: string, context: Record<string, any>) {
    const now = Date.now();
    const alertKey = `${this.service}:${alertType}`;
    const existingAlert = this.alerts.get(alertKey);
    
    // Rate limiting: don't trigger the same alert more than once per 5 minutes
    if (existingAlert && (now - existingAlert.lastTriggered) < 300000) {
      existingAlert.count++;
      return;
    }

    // Log the alert
    this.logger.error(`ALERT: ${message}`, {
      alertType,
      service: this.service,
      context,
      previousCount: existingAlert?.count || 0
    });

    // Update alert tracking
    this.alerts.set(alertKey, {
      lastTriggered: now,
      count: (existingAlert?.count || 0) + 1
    });

    // In a real implementation, you would send this to an external alerting system
    // For now, we just log it with a special format that can be picked up by log aggregation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'alert',
      service: this.service,
      alertType,
      message,
      context
    }));
  }

  getActiveAlerts(): Array<{ alertType: string; lastTriggered: number; count: number }> {
    const now = Date.now();
    const activeAlerts: Array<{ alertType: string; lastTriggered: number; count: number }> = [];
    
    for (const [alertKey, alert] of this.alerts) {
      // Consider alerts active if they were triggered in the last hour
      if ((now - alert.lastTriggered) < 3600000) {
        activeAlerts.push({
          alertType: alertKey,
          lastTriggered: alert.lastTriggered,
          count: alert.count
        });
      }
    }
    
    return activeAlerts;
  }
}

// Utility function to create a comprehensive monitoring setup
export function createMonitoringSetup(service: string) {
  const logger = createLogger(service);
  const metrics = new MetricsCollector(service);
  const healthChecker = new HealthChecker(service);
  const alertManager = new AlertManager(service, DEFAULT_ALERT_CONFIG, logger);
  
  return {
    logger,
    metrics,
    healthChecker,
    alertManager
  };
}