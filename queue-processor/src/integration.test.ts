import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalyticsData } from '@/types/analytics-data';
import worker from './index';

// Mock environment for integration tests
const mockEnv = {
  ANALYTICS_ENGINE: {
    writeDataPoint: vi.fn(),
  },
  URL_DB: {
    prepare: vi.fn(),
  } as unknown as D1Database,
} as any;

const mockStatement = {
  bind: vi.fn(),
  run: vi.fn(),
};

describe('Queue Processor Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockEnv.URL_DB.prepare as any).mockReturnValue(mockStatement);
    (mockStatement.bind as any).mockReturnValue(mockStatement);
    (mockStatement.run as any).mockResolvedValue({ success: true });
  });

  describe('End-to-End Analytics Processing', () => {
    it('should process complete analytics workflow from queue to Analytics Engine', async () => {
      const analyticsData: AnalyticsData = {
        shortCode: 'abc123',
        timestamp: '2023-01-01T00:00:00.000Z',
        country: 'US',
        continent: 'NA',
        region: 'CA',
        city: 'San Francisco',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        language: 'en-US',
        referer: 'https://google.com',
        isBot: false,
        botScore: 0.1,
        asn: 13335,
        asOrganization: 'Cloudflare',
        colo: 'SFO',
        httpProtocol: 'HTTP/2',
        ipAddress: '192.168.1.1'
      };

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);

      const mockBatch = {
        messages: [
          {
            body: analyticsData,
            id: 'msg-1',
            timestamp: new Date(),
            attempts: 1,
          },
        ],
        queue: 'test-queue',
        retryAll: vi.fn(),
        ackAll: vi.fn(),
      } as MessageBatch<AnalyticsData>;

      await worker.queue(mockBatch, mockEnv);

      // Verify Analytics Engine was called with correct data structure
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(1);
      
      const writtenDataPoint = (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mock.calls[0][0];
      expect(writtenDataPoint).toMatchObject({
        blobs: [
          'abc123',
          'US',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'https://google.com',
          'San Francisco',
          'NA',
          'HTTP/2',
          'en-US'
        ],
        doubles: [
          0.1,
          13335,
          0,
          expect.any(Number)
        ],
        indexes: ['abc123']
      });
    });

    it('should handle batch processing with mixed valid and invalid data', async () => {
      const validData: AnalyticsData = {
        shortCode: 'abc123',
        timestamp: '2023-01-01T00:00:00.000Z',
        isBot: false,
        country: 'US'
      };

      const invalidData = {
        // Missing required shortCode
        timestamp: '2023-01-01T00:00:00.000Z',
        isBot: false,
      } as AnalyticsData;

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);

      const mockBatch = {
        messages: [
          { body: validData, id: 'msg-1', timestamp: new Date(), attempts: 1 },
          { body: invalidData, id: 'msg-2', timestamp: new Date(), attempts: 1 },
        ],
        queue: 'test-queue',
        retryAll: vi.fn(),
        ackAll: vi.fn(),
      } as MessageBatch<AnalyticsData>;

      try {
        await worker.queue(mockBatch, mockEnv);
      } catch (error) {
        // Should throw because not all messages were processed successfully
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('1 messages failed processing');
      }

      // Should have processed the valid message
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(1);
    });

    it('should handle Analytics Engine failures with retry logic', async () => {
      const analyticsData: AnalyticsData = {
        shortCode: 'abc123',
        timestamp: '2023-01-01T00:00:00.000Z',
        isBot: false,
      };

      // Mock Analytics Engine failure
      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(new Error('Analytics Engine unavailable'));

      const mockBatch = {
        messages: [
          {
            body: analyticsData,
            id: 'msg-1',
            timestamp: new Date(),
            attempts: 3, // Simulate retry attempts
          },
        ],
        queue: 'test-queue',
        retryAll: vi.fn(),
        ackAll: vi.fn(),
      } as MessageBatch<AnalyticsData>;

      try {
        await worker.queue(mockBatch, mockEnv);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('All 1 messages failed processing');
      }

      // Should have attempted to write to Analytics Engine
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(1);
    });

    it('should send messages to dead letter queue after max attempts', async () => {
      const invalidData = {
        timestamp: '2023-01-01T00:00:00.000Z',
        isBot: false,
      } as AnalyticsData;

      const mockBatch = {
        messages: [
          {
            body: invalidData,
            id: 'msg-1',
            timestamp: new Date(),
            attempts: 15, // Exceeds DEAD_LETTER_THRESHOLD (10)
          },
        ],
        queue: 'test-queue',
        retryAll: vi.fn(),
        ackAll: vi.fn(),
      } as MessageBatch<AnalyticsData>;

      await worker.queue(mockBatch, mockEnv);

      // Should have attempted to insert into dead letter queue
      expect(mockEnv.URL_DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dead_letter_queue')
      );
      
      // Should not have written to Analytics Engine for invalid data
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batches efficiently', async () => {
      const batchSize = 50;
      const messages = Array.from({ length: batchSize }, (_, i) => ({
        body: {
          shortCode: `code${i}`,
          timestamp: '2023-01-01T00:00:00.000Z',
          isBot: false,
          country: 'US'
        } as AnalyticsData,
        id: `msg-${i}`,
        timestamp: new Date(),
        attempts: 1,
      }));

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);

      const mockBatch = {
        messages,
        queue: 'test-queue',
        retryAll: vi.fn(),
        ackAll: vi.fn(),
      } as MessageBatch<AnalyticsData>;

      await worker.queue(mockBatch, mockEnv);

      // Should have processed all messages
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(batchSize);
    });

    it('should handle concurrent batch processing', async () => {
      const analyticsData: AnalyticsData = {
        shortCode: 'abc123',
        timestamp: '2023-01-01T00:00:00.000Z',
        isBot: false,
      };

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);

      // Create multiple batches
      const batches = Array.from({ length: 5 }, (_, i) => ({
        messages: [{
          body: { ...analyticsData, shortCode: `code${i}` },
          id: `msg-${i}`,
          timestamp: new Date(),
          attempts: 1,
          retry: vi.fn(),
          ack: vi.fn(),
        }],
        queue: 'test-queue',
        retryAll: vi.fn(),
        ackAll: vi.fn(),
      })) as MessageBatch<AnalyticsData>[];

      // Process batches concurrently
      const promises = batches.map(batch => worker.queue(batch, mockEnv));
      await Promise.all(promises);

      // Should have processed all batches
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(5);
    });
  });

  describe('Data Validation and Transformation', () => {
    it('should properly transform analytics data to Analytics Engine format', async () => {
      const analyticsData: AnalyticsData = {
        shortCode: 'abc123',
        timestamp: '2023-01-01T00:00:00.000Z',
        country: 'US',
        continent: 'NA',
        city: 'San Francisco',
        userAgent: 'Mozilla/5.0 Test Browser',
        referer: 'https://google.com',
        language: 'en-US',
        httpProtocol: 'HTTP/2',
        isBot: true,
        botScore: 0.9,
        asn: 13335,
        ipAddress: '192.168.1.1'
      };

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);

      const mockBatch = {
        messages: [{
          body: analyticsData,
          id: 'msg-1',
          timestamp: new Date(),
          attempts: 1,
          retry: vi.fn(),
          ack: vi.fn(),
        }],
        queue: 'test-queue',
        retryAll: vi.fn(),
        ackAll: vi.fn(),
      } as MessageBatch<AnalyticsData>;

      await worker.queue(mockBatch, mockEnv);

      const dataPoint = (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mock.calls[0][0];
      
      // Verify blob data (strings)
      expect(dataPoint.blobs[0]).toBe('abc123'); // shortCode
      expect(dataPoint.blobs[1]).toBe('US'); // country
      expect(dataPoint.blobs[2]).toBe('Mozilla/5.0 Test Browser'); // userAgent
      expect(dataPoint.blobs[3]).toBe('https://google.com'); // referer
      expect(dataPoint.blobs[4]).toBe('San Francisco'); // city
      expect(dataPoint.blobs[5]).toBe('NA'); // continent
      expect(dataPoint.blobs[6]).toBe('HTTP/2'); // httpProtocol
      expect(dataPoint.blobs[7]).toBe('en-US'); // language

      // Verify double data (numbers)
      expect(dataPoint.doubles[0]).toBe(0.9); // botScore
      expect(dataPoint.doubles[1]).toBe(13335); // asn
      expect(dataPoint.doubles[2]).toBe(1); // isBot (converted to 1)
      expect(dataPoint.doubles[3]).toBeTypeOf('number'); // timestamp

      // Verify indexes
      expect(dataPoint.indexes[0]).toBe('abc123');
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalData: AnalyticsData = {
        shortCode: 'abc123',
        timestamp: '2023-01-01T00:00:00.000Z',
        isBot: false,
      };

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);

      const mockBatch = {
        messages: [{
          body: minimalData,
          id: 'msg-1',
          timestamp: new Date(),
          attempts: 1,
          retry: vi.fn(),
          ack: vi.fn(),
        }],
        queue: 'test-queue',
        retryAll: vi.fn(),
        ackAll: vi.fn(),
      } as MessageBatch<AnalyticsData>;

      await worker.queue(mockBatch, mockEnv);

      const dataPoint = (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mock.calls[0][0];
      
      // Should fill missing fields with empty strings or default values
      expect(dataPoint.blobs[0]).toBe('abc123');
      expect(dataPoint.blobs[1]).toBe(''); // country (missing)
      expect(dataPoint.doubles[2]).toBe(0); // isBot (false -> 0)
    });
  });
});