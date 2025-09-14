export async function handleShortcode(
  shortCode: string,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    // First check KV cache
    const cachedUrl = await env.LINKS.get(shortCode);
    if (cachedUrl) {
      return Response.redirect(cachedUrl, 302);
    }

    // Fallback to D1 database
    const result = await env.DB.prepare(
      "SELECT destination FROM links WHERE short_code = ? AND is_active = 1",
    )
      .bind(shortCode)
      .first();

    if (result?.destination) {
      const destination = result.destination as string;

      // Cache in KV for future requests (24 hours TTL)
      ctx.waitUntil(
        env.LINKS.put(shortCode, destination, { expirationTtl: 24 * 60 * 60 }),
      );

      return Response.redirect(destination, 302);
    }

    // Shortcode not found - redirect to homepage
    return Response.redirect("https://val.io", 302);
  } catch (error) {
    console.error("Error resolving shortcode:", error);
    return Response.redirect("https://val.io", 302);
  }
}
