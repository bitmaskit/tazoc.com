// Analytics data structure for URL shortener click tracking
export interface AnalyticsData {
  // URL and timing info
  shortCode: string;
  timestamp: string;

  // Geographic data
  country?: string;
  continent?: string;
  region?: string;
  city?: string;

  // Network information
  asn?: number;
  asOrganization?: string;
  colo?: string; // Cloudflare data center

  // User agent and device info
  userAgent?: string | null;
  language?: string | null;
  referer?: string | null;

  // Bot detection and quality
  botScore?: number;
  isBot: boolean;

  // Request metadata
  ipAddress?: string | null;
  httpProtocol?: string;
}

// Database schema interface for analytics table
export interface AnalyticsRecord extends AnalyticsData {
  id?: number;
  created_at?: string;
}

// Queue message interface (what gets sent to the analytics queue)
export interface QueueAnalyticsMessage {
  data: AnalyticsData;
  metadata?: {
    retryCount?: number;
    processingId?: string;
  };
}