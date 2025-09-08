export default {
  async fetch(request, env: Env, ctx) {
    const url = new URL(request.url);

    // Simple API endpoint
    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
        message: "API is working!",
        path: url.pathname,
      });
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
