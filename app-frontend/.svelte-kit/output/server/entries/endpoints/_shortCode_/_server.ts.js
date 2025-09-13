const GET = async ({ platform, params, request }) => {
  const env = platform?.env;
  if (!env?.RESOLVER) {
    return new Response("Resolver service not configured", { status: 500 });
  }
  const { shortCode } = params;
  if (!shortCode) {
    return new Response("Short code is required", { status: 400 });
  }
  try {
    const resolverRequest = new Request(`https://val.io/api/resolve/${shortCode}`, {
      method: "GET",
      headers: request.headers
    });
    const resolverResponse = await env.RESOLVER.fetch(resolverRequest);
    if (resolverResponse.status === 404) {
      return new Response("Short URL not found", { status: 404 });
    }
    if (resolverResponse.status === 200) {
      const urlData = await resolverResponse.json();
      if (urlData.url) {
        console.log(`Redirecting ${shortCode} to ${urlData.url}`);
        return new Response(null, {
          status: 302,
          headers: {
            Location: urlData.url,
            "Cache-Control": "no-cache, no-store, must-revalidate"
          }
        });
      }
    }
    return new Response("Invalid response from resolver", { status: 500 });
  } catch (error) {
    console.error("Error calling resolver:", error);
    return new Response("Internal server error", { status: 500 });
  }
};
export {
  GET
};
