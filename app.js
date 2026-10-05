// Activity Suggester — fetches activities from the Bored API (runs in the browser).
const API_BASE = "https://bored-api.appbrewery.com";

// If a direct request fails (e.g. CORS), we retry through a public CORS proxy.
// This keeps the app working even if the API doesn't send CORS headers.
const CORS_PROXY = "https://corsproxy.io/?url=";

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

// Fetch JSON, retrying through a CORS proxy if the direct call is blocked.
async function fetchActivity(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  } catch (directErr) {
    // Likely a CORS failure (TypeError: Failed to fetch). Retry via proxy.
    console.warn("Direct request failed, retrying via CORS proxy:", directErr);
    const proxied = CORS_PROXY + encodeURIComponent(url);
    const res = await fetch(proxied);
    if (!res.ok) throw new Error(`Proxy request failed (${res.status})`);
    return await res.json();
  }
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
        : "Open the browser console (F12) for details.";
    setStatus(`Couldn't reach the activity service. ${hint}`, true);
    console.error(err);
  } finally {
    els.suggest.disabled = false;
  }
}

els.suggest.addEventListener("click", suggest);

// Give the user a suggestion as soon as the page loads.
suggest();
