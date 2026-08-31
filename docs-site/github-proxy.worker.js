// Paste this into a Cloudflare Worker (dashboard → Workers → Create → Edit code).
// It forwards only this repository's Markdown and Actions calls to GitHub, so a
// network that blocks api.github.com can still reach it.
//
// The browser keeps sending its own token; this Worker stores no credentials.

const ALLOWED_REPO = "zhenujt/learn-english";
const ALLOWED_ORIGIN = "https://zhenujt.github.io";
const UPSTREAM = "https://api.github.com";

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin");
    const cors = {
      "Access-Control-Allow-Origin":
        origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, Accept, X-GitHub-Api-Version",
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
    const path = url.pathname.replace(/^\/+/, "");
    if (!isAllowed(path, request.method)) {
      return reply({ message: "Request not allowed." }, 403, cors);
    }

    const upstream = await fetch(`${UPSTREAM}/${path}${url.search}`, {
      method: request.method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: request.headers.get("Authorization") ?? "",
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
  },
};

function isAllowed(path, method) {
  if (path.startsWith(`repos/${ALLOWED_REPO}/contents/`)) {
    return method === "GET" || method === "PUT";
  }
  return path === `repos/${ALLOWED_REPO}/actions/runs` && method === "GET";
}

function reply(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
