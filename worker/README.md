# Bored API CORS Proxy (Cloudflare Worker)

A tiny Cloudflare Worker that proxies the [Bored API](https://bored-api.appbrewery.com)
and adds CORS headers, so the Activity Suggester web app can read it from the browser.

Free tier: 100,000 requests/day — far more than this app needs.

## Why this exists

The Bored API doesn't send `Access-Control-Allow-Origin` headers, so browsers
block the response. Public CORS proxies are unreliable (rate limits, downtime,
sudden API-key requirements). This Worker is a proxy **you control** — fast,
stable, and free.

## Deploy (5 minutes)

1. **Create a free Cloudflare account:** https://dash.cloudflare.com/sign-up
2. **Install Wrangler** (Cloudflare's CLI) and deploy, from inside this folder:
   ```bash
   cd worker
   npx wrangler login      # opens a browser to authorize
   npx wrangler deploy
   ```
3. Wrangler prints your Worker URL, e.g.
   `https://bored-api-proxy.your-name.workers.dev`
4. **Wire it into the app:** open `../app.js`, find `WORKER_BASE`, and paste your
   Worker URL there. Commit and push — GitHub Pages redeploys automatically.

## Test it

Open these in your browser (replace with your URL):
- `https://bored-api-proxy.your-name.workers.dev/random`
- `https://bored-api-proxy.your-name.workers.dev/filter?type=education&participants=1`

You should see JSON. If so, the app will work reliably.

## Lock it down (optional, recommended)

In `worker.js`, change `ALLOWED_ORIGIN` from `"*"` to your site, e.g.
`"https://dennis-shvabskiy.github.io"`, then `npx wrangler deploy` again.
