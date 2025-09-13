const SECURITY_STATS = {
  blockedRequests: 0,
  rateLimitHits: 0,
  topBlockedPaths: /* @__PURE__ */ new Map(),
  topBlockedIPs: /* @__PURE__ */ new Map(),
  lastReset: Date.now()
};
const GET = async ({ request, platform }) => {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get("key");
  if (adminKey !== "valentinofx") {
    return new Response("Unauthorized", { status: 401 });
  }
  const stats = {
    ...SECURITY_STATS,
    topBlockedPaths: Object.fromEntries(SECURITY_STATS.topBlockedPaths),
    topBlockedIPs: Object.fromEntries(SECURITY_STATS.topBlockedIPs),
    uptime: Date.now() - SECURITY_STATS.lastReset
  };
  return new Response(JSON.stringify(stats, null, 2), {
    headers: { "content-type": "application/json" }
  });
};
function trackBlockedRequest(path, ip) {
  SECURITY_STATS.blockedRequests++;
  SECURITY_STATS.topBlockedPaths.set(
    path,
    (SECURITY_STATS.topBlockedPaths.get(path) || 0) + 1
  );
  SECURITY_STATS.topBlockedIPs.set(
    ip,
    (SECURITY_STATS.topBlockedIPs.get(ip) || 0) + 1
  );
}
function trackRateLimit() {
  SECURITY_STATS.rateLimitHits++;
}
globalThis.securityTracker = {
  trackBlockedRequest,
  trackRateLimit
};
export {
  GET
};
