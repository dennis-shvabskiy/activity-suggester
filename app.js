// Activity Suggester — fetches activities from the Bored API (runs in the browser).
const API_BASE = "https://bored-api.appbrewery.com";

// The Bored API doesn't send CORS headers, so a browser can't read its response
// directly. We route requests through public CORS proxies that add the headers.
// Each entry wraps a target URL; we try them in order until one works.
// No API keys required.
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

// Build the request URL from the selected filters.
// If no filters are set, use /random; otherwise use /filter.
function buildUrl() {
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
  return query ? `${API_BASE}/filter?${query}` : `${API_BASE}/random`;
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

// Fetch JSON, trying a direct request first, then each CORS proxy in turn.
async function fetchActivity(url) {
  // 1) Try the API directly — works if it ever starts sending CORS headers,
  //    or when running on the same origin.
  try {
    const res = await fetch(url);
    if (res.ok) return await readJson(res);
  } catch (err) {
    console.warn("Direct request failed (likely CORS):", err.message);
  }

  // 2) Fall back through the CORS proxies until one succeeds.
  let lastError;
  for (const makeUrl of CORS_PROXIES) {
    try {
      const res = await fetch(makeUrl(url));
      if (!res.ok) {
        lastError = new Error(`Proxy returned ${res.status}`);
        console.warn(`Proxy failed (${res.status}):`, makeUrl(url));
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
    const data = await fetchActivity(buildUrl());
    const activity = pickOne(data);

    if (!activity || !activity.activity) {
      setStatus("No activities matched those filters. Try loosening them.", true);
      return;
    }

    setStatus("");
    renderResult(activity);
  } catch (err) {
    const hint =
      location.protocol === "file:"
        ? "Open this page via a local server (not file://) — see the README."
        : "The activity service (or its CORS proxy) may be temporarily down. Try again in a moment.";
    setStatus(`Couldn't reach the activity service. ${hint}`, true);
    console.error(err);
  } finally {
    els.suggest.disabled = false;
  }
}

els.suggest.addEventListener("click", suggest);

// Give the user a suggestion as soon as the page loads.
suggest();
