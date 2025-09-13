import type { RequestHandler } from "./$types";

// Simple in-memory stats (in production, use KV or D1)
const SECURITY_STATS = {
  blockedRequests: 0,
  rateLimitHits: 0,
  topBlockedPaths: new Map<string, number>(),
  topBlockedIPs: new Map<string, number>(),
  lastReset: Date.now(),
};

export const GET: RequestHandler = async ({ request, platform }) => {
  // Simple auth check - only allow local or authenticated admin access
  const url = new URL(request.url);
  const adminKey = url.searchParams.get("key");

  if (adminKey !== "valentinofx") {
    return new Response("Unauthorized", { status: 401 });
  }

  const stats = {
    ...SECURITY_STATS,
    topBlockedPaths: Object.fromEntries(SECURITY_STATS.topBlockedPaths),
    topBlockedIPs: Object.fromEntries(SECURITY_STATS.topBlockedIPs),
    uptime: Date.now() - SECURITY_STATS.lastReset,
  };

  return new Response(JSON.stringify(stats, null, 2), {
    headers: { "content-type": "application/json" },
  });
};

// Helper function to track blocked requests (called from hooks)
export function trackBlockedRequest(path: string, ip: string) {
  SECURITY_STATS.blockedRequests++;
  SECURITY_STATS.topBlockedPaths.set(
    path,
    (SECURITY_STATS.topBlockedPaths.get(path) || 0) + 1,
  );
  SECURITY_STATS.topBlockedIPs.set(
    ip,
    (SECURITY_STATS.topBlockedIPs.get(ip) || 0) + 1,
  );
}

export function trackRateLimit() {
  SECURITY_STATS.rateLimitHits++;
}
