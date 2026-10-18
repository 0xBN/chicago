import {
  isOpenNow,
  isOpenOnTabDay,
  tabMatchesChicagoToday,
} from "./js/hours.js";
import { renderNearbyMap } from "./js/map.js";

const STORAGE_PREFIX = "ohc26:";
const WALK_MIN_PER_MILE = 15;
const EARTH_RADIUS_MI = 3958.8;
const NEARBY_LIMIT = 10;

/** @type {{ days: Record<string, Stop[]>, backupByDay: Record<string, Stop[]> }} */
let DATA = { days: { sat: [], sun: [] }, backupByDay: { sat: [], sun: [] } };

/** @type {Array<DirectorySite>} */
let DIRECTORY = [];

/** @typedef {{ type?: string, name: string, time?: string, duration?: string, note?: string, priority?: string, address?: string, hours?: string, url?: string, coords?: [number, number], satHours?: string, sunHours?: string }} Stop */

/** @typedef {{ id: string, name: string, address: string, note: string, siteType?: string, satHours: string, sunHours: string, hours: string, url: string, coords: [number, number] }} DirectorySite */

let day = "sat";
/** @type {[number, number] | null} */
let position = null;

const isDev =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.search.includes("dev=1");

function lsGet(key) {
  return localStorage.getItem(STORAGE_PREFIX + key);
}

function lsSet(key, value) {
  localStorage.setItem(STORAGE_PREFIX + key, value);
}

function loadPrefs() {
  const savedDay = lsGet("day");
  if (savedDay === "sat" || savedDay === "sun") day = savedDay;

  applyTheme(lsGet("theme") || "system");

  const inc = document.getElementById("includeVisited");
  const openDay = document.getElementById("onlyOpenDay");
  const now = document.getElementById("openNow");
  if (inc) inc.checked = lsGet("includeVisited") === "1";
  if (openDay) openDay.checked = lsGet("onlyOpenDay") !== "0";
  if (now) now.checked = lsGet("openNow") === "1";
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);

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

function siteIdFromUrl(url) {
  const m = String(url || "").match(/sites\/([^/?#]+)/);
  return m ? m[1] : "";
}

/** Sites already on today's itinerary or static backup cards — skip in nearby directory. */
function scheduledKeys() {
  const keys = new Set();
  const add = (list) => {
    for (const s of list) {
      if (s.type === "break") continue;
      keys.add(s.name);
      const id = siteIdFromUrl(s.url);
      if (id) keys.add(id);
    }
  };
  add(DATA.days[day] || []);
  add(DATA.backupByDay[day] || []);
  return keys;
}

function isScheduledDirectorySite(site) {
  const keys = scheduledKeys();
  return keys.has(site.name) || keys.has(site.id);
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
  return ` · <span class="distance">~${d.toFixed(1)} mi · ~${Math.round(d * WALK_MIN_PER_MILE)} min walk*</span>`;
}

function nearbyCandidates() {
  const onlyOpenDay = document.getElementById("onlyOpenDay")?.checked;
  const openNow = document.getElementById("openNow")?.checked;
  const includeVisited = document.getElementById("includeVisited")?.checked;

  let sites = DIRECTORY.filter((s) => !isScheduledDirectorySite(s));

  if (onlyOpenDay) sites = sites.filter((s) => isOpenOnTabDay(s, day));
  if (openNow) {
    if (tabMatchesChicagoToday(day)) {
      sites = sites.filter((s) => isOpenNow(s, day));
    }
  }
  if (!includeVisited) sites = sites.filter((s) => !isDone(s));

  if (position) {
    sites.sort(
      (a, b) => haversineMi(position, a.coords) - haversineMi(position, b.coords)
    );
  }
  return sites.slice(0, NEARBY_LIMIT);
}

function directoryAsCard(site) {
  const d = position ? haversineMi(position, site.coords) : null;
  return {
    name: site.name,
    address: site.address,
    note: site.note || site.siteType || "",
    hours: site.hours,
    url: site.url,
    coords: site.coords,
    priority: "backup",
    time: d != null ? `~${d.toFixed(1)} mi away` : "Nearby",
    duration: d != null ? `~${Math.round(d * WALK_MIN_PER_MILE)} min walk*` : "",
  };
}

function getNearby() {
  const el = document.getElementById("nearResults");
  if (!navigator.geolocation) {
    el.textContent = "Your browser does not support location access.";
    return;
  }
  el.innerHTML = '<p class="muted">Requesting location permission…</p>';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      position = [pos.coords.latitude, pos.coords.longitude];
      render();
      renderNearby();
    },
    (err) => {
      el.innerHTML =
        err.code === 1
          ? "<p class='muted'>Location permission denied. You can still use Directions on each card.</p>"
          : "<p class='muted'>Could not determine location. Try again outdoors.</p>";
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function renderNearby() {
  const el = document.getElementById("nearResults");
  const mapWrap = document.getElementById("nearMapWrap");
  if (!position) {
    if (mapWrap) mapWrap.classList.add("hidden");
    return;
  }

  const sites = nearbyCandidates();
  const openNowOn = document.getElementById("openNow")?.checked;
  const onOhcDay = tabMatchesChicagoToday(day);
  let filterNote =
    "Other Open House sites near you (not on today’s schedule). Full cards — same as backups below.";
  if (document.getElementById("onlyOpenDay")?.checked) {
    filterNote += ` Showing sites open ${day === "sat" ? "Saturday" : "Sunday"}.`;
  }
  if (openNowOn && !onOhcDay) {
    filterNote +=
      " “Open now” only applies on OHC weekend (Oct 17–18) when the tab matches today — using day-open filter only.";
  } else if (openNowOn) {
    filterNote += " Also filtered to sites open right now (Chicago time).";
  }

  if (!sites.length) {
    el.innerHTML = `<p class="muted">${filterNote}</p><p class="muted">No sites match filters nearby. Try turning off “Open now” or including visited.</p>`;
    if (mapWrap) mapWrap.classList.add("hidden");
    return;
  }

  el.innerHTML =
    `<p class="muted">${filterNote}</p>` +
    sites.map((s) => renderCard(directoryAsCard(s), { backup: true })).join("");

  bindVisitChecks(el);

  if (mapWrap) {
    mapWrap.classList.remove("hidden");
    renderNearbyMap(
      "nearMap",
      position,
      sites.map((s) => ({
        name: s.name,
        coords: s.coords,
        scheduled: false,
      }))
    );
  }
}

function renderCard(s, opts = {}) {
  const backup = opts.backup ?? false;
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

  const timeLine =
    s.time && s.duration
      ? `<span class="time">${esc(s.time)}</span> <span class="duration">· ${esc(s.duration)}</span>`
      : "";

  return `<article class="stop ${optionalClass} ${doneClass} ${backupClass}">
<div class="topline"><div>${timeLine}</div>
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
    '<h2>Planned backup cards</h2><p class="hint">Hand-picked swaps for this day’s route. Nearby (above) pulls from the full OHC directory.</p>' +
    backups.map((x) => renderCard(x, { backup: true })).join("");

  if (sat) {
    html +=
      '<div class="note"><b>Saturday fallback:</b> If lines run long, cut Fine Arts Building or Board of Trade first. Protect Cliff Dwellers and House of Blues (4 PM closing).</div>';
  }

  const content = document.getElementById("content");
  content.innerHTML = html;
  bindVisitChecks(content);
}

async function init() {
  if (isDev) {
    const banner = document.getElementById("devBanner");
    if (banner) banner.classList.remove("hidden");
  }

  const [itinRes, dirRes] = await Promise.all([
    fetch("./data/itinerary.json"),
    fetch("./data/sites.json"),
  ]);
  DATA = await itinRes.json();
  const dirPayload = await dirRes.json();
  DIRECTORY = dirPayload.sites || [];
  if (!DATA.backupByDay) DATA.backupByDay = { sat: [], sun: [] };

  loadPrefs();
  document.getElementById("satTab").addEventListener("click", () => showDay("sat"));
  document.getElementById("sunTab").addEventListener("click", () => showDay("sun"));
  document.getElementById("nearbyBtn").addEventListener("click", getNearby);

  document.getElementById("includeVisited").addEventListener("change", (e) => {
    lsSet("includeVisited", e.target.checked ? "1" : "0");
    renderNearby();
  });
  document.getElementById("onlyOpenDay").addEventListener("change", (e) => {
    lsSet("onlyOpenDay", e.target.checked ? "1" : "0");
    renderNearby();
  });
  document.getElementById("openNow").addEventListener("change", (e) => {
    lsSet("openNow", e.target.checked ? "1" : "0");
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
