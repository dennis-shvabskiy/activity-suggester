// Activity Suggester — fetches activities from the Bored API (runs in the browser).
const API_BASE = "https://bored-api.appbrewery.com";

// RECOMMENDED: your own Cloudflare Worker proxy (see worker/README.md).
// Once deployed, paste its URL here, e.g.
//   "https://bored-api-proxy.your-name.workers.dev"
// This is the reliable path. Leave empty to rely on public proxies below.
const WORKER_BASE = "";

// The Bored API doesn't send CORS headers, so a browser can't read its response
// directly. If no Worker is configured (or it fails), we fall back to public
// CORS proxies. These are free but unreliable — prefer the Worker above.
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

const els = {
  type: document.getElementById("type"),
  participants: document.getElementById("participants"),
  price: document.getElementById("price"),
  accessibility: document.getElementById("accessibility"),
  suggest: document.getElementById("suggest"),
  status: document.getElementById("status"),
  result: document.getElementById("result"),
};

// Build the API path (+query) from the selected filters.
// If no filters are set, use /random; otherwise use /filter.
function buildPath() {
  const params = new URLSearchParams();

  if (els.type.value) params.set("type", els.type.value);

  if (els.participants.value) {
    // "5+" option: the API supports an exact participant count, so cap at 5.
    params.set("participants", els.participants.value);
  }

  if (els.price.value !== "") {
    params.set("minprice", "0");
    params.set("maxprice", els.price.value);
  }

  if (els.accessibility.value !== "") {
    // Lower accessibility value = easier to do.
    params.set("minaccessibility", "0");
    params.set("maxaccessibility", els.accessibility.value);
  }

  const query = params.toString();
  return query ? `/filter?${query}` : `/random`;
}

function pickOne(data) {
  // /random returns a single object; /filter returns an array.
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  }
  // Some error responses come back as objects with an `error` field.
  if (data && data.error) return null;
  return data;
}

function priceLabel(price) {
  if (price === 0) return "Free";
  if (price <= 0.3) return "$";
  if (price <= 0.6) return "$$";
  return "$$$";
}

function accessibilityLabel(a) {
  if (a == null) return "—";
  if (a <= 0.3) return "Easy";
  if (a <= 0.6) return "Moderate";
  return "Hard";
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("status--error", isError);
}

function renderResult(activity) {
  const type = activity.type || "activity";
  const participants = activity.participants ?? "—";
  const price = typeof activity.price === "number" ? priceLabel(activity.price) : "—";
  const access = accessibilityLabel(activity.accessibility);

  const linkHtml =
    activity.link && activity.link.trim()
      ? `<a class="result__link" href="${activity.link}" target="_blank" rel="noopener noreferrer">Learn more →</a>`
      : "";

  els.result.innerHTML = `
    <span class="result__type">${type}</span>
    <h3 class="result__activity">${escapeHtml(activity.activity)}</h3>
    <div class="result__meta">
      <div class="meta">
        <div class="meta__value">${participants}</div>
        <span class="meta__label">Participants</span>
      </div>
      <div class="meta">
        <div class="meta__value">${price}</div>
        <span class="meta__label">Price</span>
      </div>
      <div class="meta">
        <div class="meta__value">${access}</div>
        <span class="meta__label">Effort</span>
      </div>
    </div>
    ${linkHtml}
  `;
  els.result.hidden = false;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Parse a response as JSON. Some proxies return the body as a quoted/escaped
// string, so fall back to parsing the raw text if res.json() comes back as text.
async function readJson(res) {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    // A few proxies wrap the payload as a JSON string; unwrap once if needed.
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    throw new Error("Response was not valid JSON");
  }
}

// Fetch activity JSON for an API path like "/random" or "/filter?type=...".
// Order of preference: your Cloudflare Worker → direct → public CORS proxies.
async function fetchActivity(path) {
  const apiUrl = `${API_BASE}${path}`;

  // 1) Preferred: your own Worker proxy (reliable, no CORS issues).
  if (WORKER_BASE) {
    try {
      const res = await fetch(`${WORKER_BASE}${path}`);
      if (res.ok) return await readJson(res);
      console.warn(`Worker returned ${res.status}`);
    } catch (err) {
      console.warn("Worker request failed:", err.message);
    }
  }

  // 2) Try the API directly — works only if it sends CORS headers.
  try {
    const res = await fetch(apiUrl);
    if (res.ok) return await readJson(res);
  } catch (err) {
    console.warn("Direct request failed (likely CORS):", err.message);
  }

  // 3) Last resort: public CORS proxies (free but unreliable).
  let lastError;
  for (const makeUrl of CORS_PROXIES) {
    try {
      const res = await fetch(makeUrl(apiUrl));
      if (!res.ok) {
        lastError = new Error(`Proxy returned ${res.status}`);
        console.warn(`Proxy failed (${res.status}):`, makeUrl(apiUrl));
        continue;
      }
      return await readJson(res);
    } catch (err) {
      lastError = err;
      console.warn("Proxy request failed:", err.message);
    }
  }

  throw lastError || new Error("All requests failed");
}

async function suggest() {
  els.suggest.disabled = true;
  els.result.hidden = true;
  setStatus("Finding something for you…");

  try {
    const data = await fetchActivity(buildPath());
    const activity = pickOne(data);

    if (!activity || !activity.activity) {
      setStatus("No activities matched those filters. Try loosening them.", true);
      return;
    }

    setStatus("");
    renderResult(activity);
  } catch (err) {
    const hint = WORKER_BASE
      ? "The proxy may be temporarily unreachable. Try again in a moment."
      : "Public CORS proxies are down. Set up your own proxy for reliability — see worker/README.md.";
    setStatus(`Couldn't reach the activity service. ${hint}`, true);
    console.error(err);
  } finally {
    els.suggest.disabled = false;
  }
}

els.suggest.addEventListener("click", suggest);

// Give the user a suggestion as soon as the page loads.
suggest();
