import { landingPageHTML } from "./templates/landing";
import { handleAuth } from "./auth";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    // Handle www.val.io -> val.io redirect
    if (url.hostname === "www.val.io") {
      return Response.redirect(
        `https://val.io${url.pathname}${url.search}`,
        301,
      );
    }

    // Handle API routes
    if (url.pathname.startsWith("/api/")) {
      return handleAuth(request, env, ctx);
    }

    // Handle root path
    if (url.pathname === "/") {
      return handleRootPath(request, env);
    }

    // Handle shortcode resolution
    if (url.pathname.length > 1) {
      const shortCode = url.pathname.slice(1);
      return await env.RESOLVER.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function handleRootPath(request: Request, env: Env): Promise<Response> {
  // Check if user is authenticated
  const sessionId = getSessionFromCookie(request.headers.get("Cookie"));

  if (sessionId) {
    const sessionData = await env.SESSIONS.get(sessionId);
    if (sessionData) {
      // Authenticated user -> redirect to dashboard
      return Response.redirect("https://app.val.io", 302);
    }
  }

  // Not authenticated -> show landing page
  return new Response(landingPageHTML, {
    headers: { "Content-Type": "text/html" },
  });
}

function getSessionFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );

  return cookies.session_id || null;
}
