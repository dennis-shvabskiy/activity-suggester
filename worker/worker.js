/**
 * Cloudflare Worker: CORS proxy for the Bored API.
 *
 * The Bored API (https://bored-api.appbrewery.com) does not send CORS headers,
 * so browsers can't read its responses directly. This Worker runs server-side
 * (where CORS doesn't apply), fetches the API, and re-serves the JSON with the
 * CORS headers a browser needs.
 *
 * Usage from the browser:
 *   fetch("https://<your-worker>.workers.dev/random")
 *   fetch("https://<your-worker>.workers.dev/filter?type=education&participants=1")
 *
 * The path and query string are forwarded as-is to the Bored API.
 */

const API_BASE = "https://bored-api.appbrewery.com";

// Lock this down to your site(s) in production. "*" allows any origin.
const ALLOWED_ORIGIN = "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);
    // Forward the path + query to the Bored API (e.g. /random, /filter?type=...).
    const target = `${API_BASE}${url.pathname}${url.search}`;

    try {
      const upstream = await fetch(target, {
        headers: { Accept: "application/json" },
        // Cache successful responses briefly at the edge.
        cf: { cacheTtl: 30, cacheEverything: true },
      });

      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    } catch (err) {
      return json({ error: "Upstream request failed", detail: String(err) }, 502);
    }
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
