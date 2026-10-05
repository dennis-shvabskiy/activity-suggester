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

In the repo: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
It'll be live at `https://<your-username>.github.io/activity-suggester/`.

## How it works

Everything runs in the browser — there's no backend. `app.js` calls the Bored API
directly. If the direct call is blocked by CORS, it automatically retries through a
public CORS proxy so the app keeps working.

| File | Purpose |
|------|---------|
| `index.html` | Page structure and filter controls |
| `styles.css` | Styling |
| `app.js` | API calls and rendering |
