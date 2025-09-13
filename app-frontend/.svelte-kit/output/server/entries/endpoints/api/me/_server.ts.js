function parseCookies(cookieHeader) {
  return cookieHeader.split(/;\s*/).reduce((acc, pair) => {
    const i = pair.indexOf("=");
    if (i < 0) return acc;
    const key = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    acc[key] = value;
    return acc;
  }, {});
}
const GET = async ({ platform, request }) => {
  const env = platform?.env;
  if (!env?.SESSIONS) {
    return new Response("Sessions not configured", { status: 500 });
  }
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const sessionId = cookies.session_id;
  if (!sessionId) {
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const sessionData = await env.SESSIONS.get(sessionId);
    if (!sessionData) {
      return new Response(JSON.stringify({ authenticated: false }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const { user } = JSON.parse(sessionData);
    return new Response(JSON.stringify({ authenticated: true, user }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Session check error:", error);
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  GET
};
