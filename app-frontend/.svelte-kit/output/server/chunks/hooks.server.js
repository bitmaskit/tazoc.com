const SUSPICIOUS_PATTERNS = [
  /\.git\//,
  /\.env/,
  /\.vscode\//,
  /actuator\//,
  /actutor\//,
  // Common typo
  /@vite\//,
  /wp-admin/,
  /wp-content/,
  /admin/,
  /phpmyadmin/,
  /\.php$/,
  /\.asp$/,
  /\.aspx$/,
  /\.jsp$/,
  /config\./,
  /backup/,
  /\.sql$/,
  /\.zip$/,
  /\.tar/,
  /\.bak$/,
  /\.old$/,
  /\.tmp$/,
  /\.log$/,
  /robots\.txt$/,
  /sitemap\.xml$/
];
const RATE_LIMIT_MAP = /* @__PURE__ */ new Map();
const RATE_LIMIT_WINDOW = 60 * 1e3;
const RATE_LIMIT_MAX = 100;
function isBlocked(path) {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(path));
}
function checkRateLimit(ip) {
  const now = Date.now();
  const record = RATE_LIMIT_MAP.get(ip);
  if (!record || now > record.resetTime) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  return true;
}
function getClientIP(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
}
const handle = async ({ event, resolve }) => {
  const { request } = event;
  const url = new URL(request.url);
  const path = url.pathname;
  const clientIP = getClientIP(request);
  if (url.hostname === "www.val.io") {
    const redirectUrl = `https://val.io${url.pathname}${url.search}${url.hash}`;
    return new Response(null, {
      status: 301,
      headers: {
        Location: redirectUrl,
        "Cache-Control": "public, max-age=31536000"
        // Cache for 1 year
      }
    });
  }
  if (isBlocked(path)) {
    console.log(
      `🔒 Blocked suspicious request: ${request.method} ${path} from ${clientIP}`
    );
    try {
      globalThis.securityTracker?.trackBlockedRequest(path, clientIP);
    } catch (e) {
    }
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain",
        "x-blocked": "security"
      }
    });
  }
  if (!checkRateLimit(clientIP)) {
    console.log(`🚫 Rate limit exceeded for ${clientIP}`);
    try {
      globalThis.securityTracker?.trackRateLimit();
    } catch (e) {
    }
    return new Response("Too Many Requests", {
      status: 429,
      headers: {
        "retry-after": "60",
        "content-type": "text/plain"
      }
    });
  }
  if (Math.random() < 0.01) {
    const now = Date.now();
    for (const [ip, record] of RATE_LIMIT_MAP.entries()) {
      if (now > record.resetTime) {
        RATE_LIMIT_MAP.delete(ip);
      }
    }
  }
  const response = await resolve(event);
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "permissions-policy",
    "geolocation=(), microphone=(), camera=()"
  );
  if (response.headers.get("content-type")?.includes("text/html")) {
    response.headers.set(
      "content-security-policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.github.com; frame-ancestors 'none'"
    );
  }
  return response;
};
export {
  handle
};
