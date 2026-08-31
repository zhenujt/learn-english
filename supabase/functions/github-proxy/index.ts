// Supabase Edge Function: restricted GitHub proxy for the docs editor.
// Networks that block api.github.com can still reach *.supabase.co.
//
// The browser keeps sending its own GitHub token; this function stores nothing.

const ALLOWED_REPO = "zhenujt/learn-english";
const ALLOWED_ORIGIN = "https://zhenujt.github.io";
const UPSTREAM = "https://api.github.com";

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin":
      origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, X-GitHub-Api-Version, X-GitHub-Token, apikey",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (origin !== ALLOWED_ORIGIN) {
    return reply({ message: "Origin not allowed." }, 403, cors);
  }

  const url = new URL(request.url);
  // Supabase may prefix the path with the function name, so anchor on /repos/.
  const marker = url.pathname.indexOf("/repos/");
  const path = marker === -1 ? "" : url.pathname.slice(marker + 1);
  if (!isAllowed(path, request.method)) {
    return reply({ message: "Request not allowed." }, 403, cors);
  }

  const token =
    request.headers.get("X-GitHub-Token") ??
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!token) return reply({ message: "Missing GitHub token." }, 401, cors);

  const upstream = await fetch(`${UPSTREAM}/${path}${url.search}`, {
    method: request.method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "docs-editor-proxy",
    },
    body: request.method === "PUT" ? await request.text() : undefined,
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

function isAllowed(path: string, method: string): boolean {
  if (path.startsWith(`repos/${ALLOWED_REPO}/contents/`)) {
    return method === "GET" || method === "PUT";
  }
  return path === `repos/${ALLOWED_REPO}/actions/runs` && method === "GET";
}

function reply(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
