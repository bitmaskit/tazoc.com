import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalyticsData } from '@/types/analytics-data';
import worker from './index';

// Mock Analytics Engine
const mockAnalyticsEngine = {
  writeDataPoint: vi.fn(),
};

// Mock environment
const mockEnv = {
  ANALYTICS_ENGINE: mockAnalyticsEngine,
} as any;

describe('Queue Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process analytics data and write to Analytics Engine', async () => {
    const analyticsData: AnalyticsData = {
      shortCode: 'abc123',
      timestamp: '2023-01-01T00:00:00.000Z',
      country: 'US',
      city: 'San Francisco',
      userAgent: 'Mozilla/5.0',
      isBot: false,
      botScore: 0.1,
      asn: 13335,
    };

    const mockBatch = {
      messages: [
        {
          body: analyticsData,
          id: 'msg-1',
          timestamp: new Date(),
        },
      ],
    } as MessageBatch<AnalyticsData>;

    await worker.queue(mockBatch, mockEnv);

    expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledTimes(1);
    
    const writtenDataPoint = mockAnalyticsEngine.writeDataPoint.mock.calls[0][0];
    expect(writtenDataPoint).toMatchObject({
      blobs: [
        'abc123',
        'US',
        'Mozilla/5.0',
        '',
        'San Francisco',
        '',
        '',
        ''
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

  it('should handle invalid analytics data gracefully', async () => {
    const invalidData = {
      // Missing required shortCode
      timestamp: '2023-01-01T00:00:00.000Z',
      isBot: false,
    } as AnalyticsData;

    const mockBatch = {
      messages: [
        {
          body: invalidData,
          id: 'msg-1',
          timestamp: new Date(),
        },
      ],
    } as MessageBatch<AnalyticsData>;

    await worker.queue(mockBatch, mockEnv);

    // Should not write any data points for invalid data
    expect(mockAnalyticsEngine.writeDataPoint).not.toHaveBeenCalled();
  });

  it('should process multiple messages in batch', async () => {
    const analyticsData1: AnalyticsData = {
      shortCode: 'abc123',
      timestamp: '2023-01-01T00:00:00.000Z',
      isBot: false,
    };

    const analyticsData2: AnalyticsData = {
      shortCode: 'def456',
      timestamp: '2023-01-01T00:01:00.000Z',
      isBot: true,
      botScore: 0.9,
    };

    const mockBatch = {
      messages: [
        { body: analyticsData1, id: 'msg-1', timestamp: new Date() },
        { body: analyticsData2, id: 'msg-2', timestamp: new Date() },
      ],
    } as MessageBatch<AnalyticsData>;

    await worker.queue(mockBatch, mockEnv);

    expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledTimes(2);
  });
});