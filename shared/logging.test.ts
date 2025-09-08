/**
 * Tests for structured logging and monitoring utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger, MetricsCollector, HealthChecker, createLogger } from './logging';

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

describe('Structured Logging', () => {
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    logger = createLogger('test-service', 'test', '1.0.0');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger', () => {
    it('should log structured messages with correct format', () => {
      logger.info('Test message', { requestId: '123', shortCode: 'abc' });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"service":"test-service"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test message"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"123"')
      );
    });

    it('should log errors to both console.log and console.error', () => {
      logger.error('Error message', { error: { name: 'TestError', message: 'Test error' } });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] test-service: Error message'),
        expect.any(Object)
      );
    });

    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ requestId: '456' });
      childLogger.info('Child message');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"456"')
      );
    });

    it('should time operations and log duration', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result');
      
      const result = await logger.timeOperation('test-op', mockOperation, { shortCode: 'abc' });

      expect(result).toBe('result');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"test-op"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"duration"')
      );
    });

    it('should log operation failures with error details', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);
      
      await expect(logger.timeOperation('failing-op', mockOperation)).rejects.toThrow('Operation failed');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"failing-op"')
      );
    });
  });

  describe('MetricsCollector', () => {
    let metrics: MetricsCollector;

    beforeEach(() => {
      metrics = new MetricsCollector('test-service');
    });

    it('should record timing metrics', () => {
      metrics.recordTiming('response_time', 100);
      metrics.recordTiming('response_time', 200);
      metrics.recordTiming('response_time', 150);

      const result = metrics.getMetrics();
      expect(result.averageResponseTime).toBe(150);
    });

    it('should increment counters', () => {
      metrics.incrementCounter('requests', 5);
      metrics.incrementCounter('requests', 3);
      metrics.incrementCounter('errors', 1);

      const result = metrics.getMetrics();
      expect(result.requestCount).toBe(8);
      expect(result.errorCount).toBe(1);
    });

    it('should calculate percentiles correctly', () => {
      // Add 100 measurements from 1-100ms
      for (let i = 1; i <= 100; i++) {
        metrics.recordTiming('response_time', i);
      }

      const result = metrics.getMetrics();
      expect(result.p95ResponseTime).toBe(95);
      expect(result.p99ResponseTime).toBe(99);
    });

    it('should calculate cache hit ratio', () => {
      metrics.incrementCounter('cache_hits', 80);
      metrics.incrementCounter('cache_misses', 20);

      const result = metrics.getMetrics();
      expect(result.cacheHitRatio).toBe(0.8);
    });

    it('should limit timing measurements to prevent memory leaks', () => {
      // Add more than 1000 measurements
      for (let i = 0; i < 1500; i++) {
        metrics.recordTiming('response_time', i);
      }

      // Should only keep the last 1000
      const result = metrics.getMetrics();
      expect(result.averageResponseTime).toBeGreaterThan(500); // Should be around 999 (last 1000 measurements)
    });

    it('should reset all metrics', () => {
      metrics.incrementCounter('requests', 10);
      metrics.recordTiming('response_time', 100);

      metrics.reset();

      const result = metrics.getMetrics();
      expect(result.requestCount).toBe(0);
      expect(result.averageResponseTime).toBe(0);
    });

    it('should log metrics with structured format', () => {
      metrics.incrementCounter('requests', 5);
      metrics.logMetrics();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"service":"test-service-metrics"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"requestCount":5')
      );
    });
  });

  describe('HealthChecker', () => {
    let healthChecker: HealthChecker;

    beforeEach(() => {
      healthChecker = new HealthChecker('test-service');
    });

    it('should register and run health checks', async () => {
      const mockCheck = vi.fn().mockResolvedValue({ status: 'pass', message: 'All good' });
      healthChecker.registerCheck('test-check', mockCheck);

      const result = await healthChecker.runHealthChecks();

      expect(result.status).toBe('healthy');
      expect(result.checks['test-check'].status).toBe('pass');
      expect(result.checks['test-check'].message).toBe('All good');
      expect(result.checks['test-check'].duration).toBeGreaterThan(0);
    });

    it('should mark overall status as unhealthy if any check fails', async () => {
      const passingCheck = vi.fn().mockResolvedValue({ status: 'pass' });
      const failingCheck = vi.fn().mockResolvedValue({ status: 'fail', message: 'Something wrong' });

      healthChecker.registerCheck('passing', passingCheck);
      healthChecker.registerCheck('failing', failingCheck);

      const result = await healthChecker.runHealthChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.passing.status).toBe('pass');
      expect(result.checks.failing.status).toBe('fail');
    });

    it('should mark overall status as degraded if any check warns', async () => {
      const passingCheck = vi.fn().mockResolvedValue({ status: 'pass' });
      const warningCheck = vi.fn().mockResolvedValue({ status: 'warn', message: 'Performance degraded' });

      healthChecker.registerCheck('passing', passingCheck);
      healthChecker.registerCheck('warning', warningCheck);

      const result = await healthChecker.runHealthChecks();

      expect(result.status).toBe('degraded');
      expect(result.checks.passing.status).toBe('pass');
      expect(result.checks.warning.status).toBe('warn');
    });

    it('should handle check timeouts', async () => {
      const slowCheck = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ status: 'pass' }), 6000))
      );

      healthChecker.registerCheck('slow', slowCheck);

      const result = await healthChecker.runHealthChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.slow.status).toBe('fail');
      expect(result.checks.slow.message).toContain('timeout');
    });

    it('should handle check exceptions', async () => {
      const errorCheck = vi.fn().mockRejectedValue(new Error('Check failed'));

      healthChecker.registerCheck('error', errorCheck);

      const result = await healthChecker.runHealthChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.error.status).toBe('fail');
      expect(result.checks.error.message).toBe('Check failed');
    });

    it('should include uptime in health check results', async () => {
      const result = await healthChecker.runHealthChecks();

      expect(result.uptime).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should log health check results', async () => {
      const failingCheck = vi.fn().mockResolvedValue({ status: 'fail', message: 'Database down' });
      healthChecker.registerCheck('database', failingCheck);

      await healthChecker.runHealthChecks();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"level":"warn"')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"service":"test-service-health"')
      );
    });
  });
});