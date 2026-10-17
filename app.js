const STORAGE_PREFIX = "ohc26:";
const WALK_MIN_PER_MILE = 15;
const EARTH_RADIUS_MI = 3958.8;

/** @type {{ days: Record<string, Stop[]>, backupByDay: Record<string, Stop[]> }} */
let DATA = { days: { sat: [], sun: [] }, backupByDay: { sat: [], sun: [] } };

/** @typedef {{ type?: string, name: string, time?: string, duration?: string, note?: string, priority?: string, address?: string, hours?: string, url?: string, coords?: [number, number] }} Stop */

let day = "sat";
/** @type {[number, number] | null} */
let position = null;

function lsGet(key) {
  return localStorage.getItem(STORAGE_PREFIX + key);
}

function lsSet(key, value) {
  localStorage.setItem(STORAGE_PREFIX + key, value);
}

function loadPrefs() {
  const savedDay = lsGet("day");
  if (savedDay === "sat" || savedDay === "sun") day = savedDay;

  const theme = lsGet("theme") || "system";
  applyTheme(theme);

  const includeVisited = lsGet("includeVisited") === "1";
  const incEl = document.getElementById("includeVisited");
  if (incEl) incEl.checked = includeVisited;
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
  const meta = document.getElementById("themeColorMeta");
  if (meta) {
    const dark =
      mode === "dark" ||
      (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    meta.setAttribute("content", dark ? "#0c1725" : "#eef3f8");
  }
  document.querySelectorAll("#themePicker button").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-theme") === mode);
  });
}

function setTheme(mode) {
  lsSet("theme", mode);
  applyTheme(mode);
}

function travelMode() {
  return day === "sat" ? "walking" : "driving";
}

function mapsDir(address, mode) {
  return (
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(address) +
    "&travelmode=" +
    mode
  );
}

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );
}

function visitKey(name) {
  return STORAGE_PREFIX + name;
}

function isDone(stop) {
  return localStorage.getItem(visitKey(stop.name)) === "1";
}

function toggleVisited(name) {
  const k = visitKey(name);
  localStorage.setItem(k, localStorage.getItem(k) === "1" ? "0" : "1");
  render();
  renderNearby();
}

function showDay(d) {
  day = d;
  lsSet("day", d);
  document.getElementById("satTab").classList.toggle("active", d === "sat");
  document.getElementById("sunTab").classList.toggle("active", d === "sun");
  render();
  renderNearby();
}

function haversineMi(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const dlat = toRad(b[0] - a[0]);
  const dlon = toRad(b[1] - a[1]);
  const x =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dlon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(x));
}

function distanceHtml(stop) {
  if (!position || !stop.coords) return "";
  const d = haversineMi(position, stop.coords);
  const walkMin = Math.round(d * WALK_MIN_PER_MILE);
  return ` · <span class="distance">~${d.toFixed(1)} mi · ~${walkMin} min walk*</span>`;
}

function allSitesForDay(includeBackups = true) {
  const main = DATA.days[day] || [];
  const backups = includeBackups ? DATA.backupByDay[day] || [] : [];
  return [...main, ...backups].filter((s) => s.coords);
}

function getNearby() {
  const el = document.getElementById("nearResults");
  if (!navigator.geolocation) {
    el.textContent = "Your browser does not support location access.";
    return;
  }
  el.textContent = "Requesting location permission…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      position = [pos.coords.latitude, pos.coords.longitude];
      render();
      renderNearby();
    },
    (err) => {
      el.textContent =
        err.code === 1
          ? "Location permission denied. You can still use the Directions links."
          : "Could not determine location. Try again outdoors or check location settings.";
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function renderNearby() {
  const el = document.getElementById("nearResults");
  if (!position) return;

  const includeVisited = document.getElementById("includeVisited")?.checked;
  let sites = allSitesForDay(true);
  if (!includeVisited) sites = sites.filter((s) => !isDone(s));

  sites.sort((a, b) => haversineMi(position, a.coords) - haversineMi(position, b.coords));

  const mode = "walking";
  el.innerHTML =
    '<p class="muted">Closest sites on this day (including backups). *Straight-line estimate at 15 min/mile; use Maps for real routes.</p>' +
    sites
      .slice(0, 8)
      .map((s) => {
        const d = haversineMi(position, s.coords);
        const backup = s.priority === "backup" ? " · Backup" : "";
        return `<div class="near-row"><div><strong>${esc(s.name)}</strong><div class="near-meta">~${d.toFixed(1)} mi · ~${Math.round(d * WALK_MIN_PER_MILE)} min pace${backup}</div></div><a class="action detail" target="_blank" rel="noopener" href="${mapsDir(s.address, mode)}">Navigate ↗</a></div>`;
      })
      .join("");
}

function renderCard(s, backup = false) {
  if (s.type === "break") {
    return `<article class="stop break"><div class="time">${esc(s.time)} · ${esc(s.duration)}</div><div class="name">🍽️ ${esc(s.name)}</div><div class="desc">${esc(s.note)}</div></article>`;
  }

  const mode = travelMode();
  const checked = isDone(s) ? "checked" : "";
  const doneClass = isDone(s) ? "done" : "";
  const optionalClass = s.priority === "optional" ? "optional" : "";
  const backupClass = backup ? "backup" : "";
  const badge =
    s.priority === "anchor"
      ? '<span class="badge">Must see</span>'
      : s.priority === "backup"
        ? '<span class="badge">Backup</span>'
        : "";

  return `<article class="stop ${optionalClass} ${doneClass} ${backupClass}">
<div class="topline"><div><span class="time">${esc(s.time)}</span> <span class="duration">· ${esc(s.duration)}</span></div>
<label class="check"><input type="checkbox" ${checked} data-name="${esc(s.name)}" class="visit-check"> Visited</label></div>
<div class="name">${esc(s.name)} ${badge}</div>
<div class="address">${esc(s.address)}${distanceHtml(s)}</div>
<p class="desc">${esc(s.note)}</p>
<div class="actions"><a class="action map" target="_blank" rel="noopener" href="${mapsDir(s.address, mode)}">↗ Directions from here</a>
<a class="action detail" target="_blank" rel="noopener" href="${esc(s.url)}">Site info ↗</a></div>
<div class="hours">Official hours: ${esc(s.hours)}</div></article>`;
}

function bindVisitChecks(root) {
  root.querySelectorAll(".visit-check").forEach((el) => {
    el.addEventListener("change", () => toggleVisited(el.getAttribute("data-name")));
  });
}

function render() {
  const stops = DATA.days[day];
  const sites = stops.filter((s) => s.type !== "break");
  const completed = sites.filter(isDone).length;
  document.getElementById("progressText").textContent =
    completed + " / " + sites.length + " sites visited";
  document.getElementById("bar").style.width =
    sites.length ? (completed / sites.length) * 100 + "%" : "0%";

  const sat = day === "sat";
  let html = `<h2>${sat ? "Saturday · The Loop" : "Sunday · Uptown → Avondale → Ravenswood"}</h2>
<p class="hint">${sat ? "Park once downtown around 9:30–9:45 AM, then walk. Seven possible stops; House of Blues closes at 4 PM." : "Start at Uptown at 9:15 AM, then drive for later clusters. Five possible stops, plus time for queues."}</p>`;
  html += stops.map((x) => renderCard(x)).join("");

  const backups = DATA.backupByDay[day] || [];
  html +=
    '<h2>Backup cards</h2><p class="hint">Same directions, site links, and visited controls as main stops. Swaps, not extra obligations.</p>' +
    backups.map((x) => renderCard(x, true)).join("");

  if (sat) {
    html +=
      '<div class="note"><b>Saturday fallback:</b> If lines run long, cut Fine Arts Building or Board of Trade first. Protect Cliff Dwellers and House of Blues (4 PM closing).</div>';
  }

  const content = document.getElementById("content");
  content.innerHTML = html;
  bindVisitChecks(content);
}

async function init() {
  const res = await fetch("./data/itinerary.json");
  DATA = await res.json();
  if (!DATA.backupByDay) DATA.backupByDay = { sat: [], sun: [] };

  loadPrefs();
  document.getElementById("satTab").addEventListener("click", () => showDay("sat"));
  document.getElementById("sunTab").addEventListener("click", () => showDay("sun"));
  document.getElementById("nearbyBtn").addEventListener("click", getNearby);
  document.getElementById("includeVisited").addEventListener("change", (e) => {
    lsSet("includeVisited", e.target.checked ? "1" : "0");
    renderNearby();
  });

  document.querySelectorAll("#themePicker button").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.getAttribute("data-theme")));
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((lsGet("theme") || "system") === "system") applyTheme("system");
  });

  showDay(day);
}

init();
