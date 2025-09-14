export async function handleAuth(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);

  switch (url.pathname) {
    case "/api/login":
      return handleLogin(request, env);
    case "/api/callback":
      return handleCallback(request, env);
    case "/api/logout":
      return handleLogout(request, env);
    default:
      return new Response("Not Found", { status: 404 });
  }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const redirectUrl = url.searchParams.get("redirect");

  const clientId = await env.GITHUB_CLIENT_ID.get();
  if (!clientId) {
    return new Response("GitHub client ID not configured", { status: 500 });
  }

  const stateData = {
    uuid: crypto.randomUUID(),
    redirect: redirectUrl,
  };
  const state = btoa(JSON.stringify(stateData));

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "read:user user:email",
    state,
    redirect_uri: `https://val.io/api/callback`,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Set-Cookie": `oauth_state=${stateData.uuid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response("Missing code or state parameter", { status: 400 });
  }

  // Verify state parameter
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  let stateData: { uuid: string; redirect?: string };

  try {
    stateData = JSON.parse(atob(state));
  } catch {
    return new Response("Invalid state parameter", { status: 400 });
  }

  if (cookies.oauth_state !== stateData.uuid) {
    return new Response("Invalid state parameter", { status: 400 });
  }

  try {
    const clientId = await env.GITHUB_CLIENT_ID.get();
    const clientSecret = await env.GITHUB_CLIENT_SECRET.get();

    if (!clientId || !clientSecret) {
      return new Response("GitHub credentials not configured", { status: 500 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: `https://val.io/api/callback`,
        }),
      },
    );

    const tokenData = (await tokenResponse.json()) as any;

    if (!tokenData.access_token) {
      throw new Error("Failed to get access token");
    }

    // Get user info from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Val.io URL Shortener",
      },
    });

    const userData = (await userResponse.json()) as any;

    if (!userData.id) {
      throw new Error("Failed to get user data");
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const sessionData = {
      userId: userData.id.toString(),
      user: userData,
      expires: expires.toISOString(),
    };

    // Store session in KV
    await env.SESSIONS.put(sessionId, JSON.stringify(sessionData), {
      expirationTtl: 30 * 24 * 60 * 60,
    });

    // Redirect to destination
    const finalRedirect = stateData.redirect || "https://app.val.io";

    return new Response(null, {
      status: 302,
      headers: {
        Location: finalRedirect,
        "Set-Cookie": cookie("session_id", sessionId, {
          expires,
          path: "/",
          domain: ".val.io",
        }),
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response("Authentication failed", { status: 500 });
  }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const sessionId = getSessionFromCookie(request.headers.get("Cookie"));

  if (sessionId) {
    // Delete session from KV
    await env.SESSIONS.delete(sessionId);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "https://val.io",
      "Set-Cookie":
        "session_id=; Path=/; Domain=.val.io; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
    },
  });
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );
}

function getSessionFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  return cookies.session_id || null;
}

function cookie(
  name: string,
  value: string,
  opts: { expires?: Date; path?: string; domain?: string } = {},
): string {
  let str = `${name}=${value}`;
  if (opts.expires) str += `; Expires=${opts.expires.toUTCString()}`;
  if (opts.path) str += `; Path=${opts.path}`;
  if (opts.domain) str += `; Domain=${opts.domain}`;
  str += "; HttpOnly; Secure; SameSite=Lax";
  return str;
}
