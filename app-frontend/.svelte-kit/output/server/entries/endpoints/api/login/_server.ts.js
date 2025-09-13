const GET = async ({ platform, url }) => {
  const env = platform?.env;
  if (!env?.GITHUB_CLIENT_ID) {
    return new Response("GitHub client ID not configured", { status: 500 });
  }
  const clientId = await env.GITHUB_CLIENT_ID.get();
  if (!clientId) {
    return new Response("GitHub client ID not found", { status: 500 });
  }
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "read:user user:email",
    state,
    redirect_uri: new URL("/api/callback", url).toString()
  });
  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Set-Cookie": `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  });
  return response;
};
export {
  GET
};
