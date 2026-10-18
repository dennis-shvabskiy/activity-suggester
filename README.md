# Activity Suggester

A simple web app that suggests something to do when you're bored, powered by the
[Bored API](https://bored-api.appbrewery.com). Filter by type, number of
participants, price, and accessibility — or just hit the button for a random idea.

## Running it

> **Important:** Don't open `index.html` directly by double-clicking it
> (a `file://` URL). Browsers block API requests from `file://` pages, so the app
> won't be able to load activities. Serve it over `http://` instead.

Pick any one of these:

**Python (built in on most systems):**
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000

**Node.js:**
```bash
npx serve .
```

**VS Code:** use the "Live Server" extension.

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow
(`.github/workflows/deploy-pages.yml`) that deploys the site automatically on
every push to `main`.

**One-time setup:** in the repo, go to **Settings → Pages → Source** and select
**GitHub Actions**. After that, each push to `main` publishes the site to
`https://<your-username>.github.io/activity-suggester/`.

You can also trigger a deployment manually from the **Actions** tab
("Deploy to GitHub Pages" → *Run workflow*).

## How it works

Everything runs in the browser — there's no backend by default. `app.js` calls
the Bored API. Because that API doesn't send CORS headers, the request is routed
through a proxy.

### Reliability: use your own proxy (recommended)

Public CORS proxies are free but unreliable (rate limits, downtime). For a stable
app, deploy the included **Cloudflare Worker** — a free proxy you control — and
point the app at it. See [`worker/README.md`](worker/README.md). Once deployed,
set `WORKER_BASE` in `app.js` to your Worker URL. The public proxies remain as an
automatic fallback.

| File | Purpose |
|------|---------|
| `index.html` | Page structure and filter controls |
| `styles.css` | Styling |
| `app.js` | API calls and rendering |
