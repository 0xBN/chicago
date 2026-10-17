const STORAGE_PREFIX = "ohc26:";

/** @type {{ days: Record<string, Stop[]>, backups: Stop[] }} */
let DATA = { days: { sat: [], sun: [] }, backups: [] };

/** @typedef {{ type?: string, name: string, time?: string, duration?: string, note?: string, priority?: string, address?: string, hours?: string, url?: string }} Stop */

let day = "sat";

function dir(address, mode) {
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

function storageKey(stop) {
  return STORAGE_PREFIX + stop.name;
}

function isDone(stop) {
  return localStorage.getItem(storageKey(stop)) === "1";
}

function toggle(name) {
  const k = STORAGE_PREFIX + name;
  localStorage.setItem(k, localStorage.getItem(k) === "1" ? "0" : "1");
  render();
}

function showDay(d) {
  day = d;
  document.getElementById("satTab").classList.toggle("active", d === "sat");
  document.getElementById("sunTab").classList.toggle("active", d === "sun");
  render();
}

function renderCard(s, backup = false) {
  if (s.type === "break") {
    return `<article class="stop break"><div class="time">${esc(s.time)} · ${esc(s.duration)}</div><div class="name">🍽️ ${esc(s.name)}</div><div class="desc">${esc(s.note)}</div></article>`;
  }

  const mode = day === "sat" ? "walking" : "driving";
  const checked = isDone(s) ? "checked" : "";
  const doneClass = isDone(s) ? "done" : "";
  const optionalClass = s.priority === "optional" ? "optional" : "";
  const backupClass = backup ? "backup" : "";
  const badge =
    s.priority === "anchor" ? '<span class="badge">Must see</span>' : "";

  return `<article class="stop ${optionalClass} ${doneClass} ${backupClass}">
<div class="topline"><div><span class="time">${esc(s.time)}</span> <span class="duration">· ${esc(s.duration)}</span></div>
<label class="check"><input type="checkbox" ${checked} data-name="${esc(s.name)}" class="visit-check"> Visited</label></div>
<div class="name">${esc(s.name)} ${badge}</div>
<div class="address">${esc(s.address)}</div>
<p class="desc">${esc(s.note)}</p>
<div class="actions"><a class="action map" target="_blank" rel="noopener" href="${dir(s.address, mode)}">↗ Directions from here</a>
<a class="action detail" target="_blank" rel="noopener" href="${esc(s.url)}">Site info ↗</a></div>
<div class="hours">Official hours: ${esc(s.hours)}</div></article>`;
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

  if (!sat) {
    html +=
      '<h2>Backup ideas</h2><p class="hint">Trade one stop for another; don’t try to cram them all in.</p>' +
      DATA.backups.map((x) => renderCard(x, true)).join("");
  } else {
    html +=
      '<div class="note"><b>Saturday fallback:</b> If lines run long, cut Fine Arts Building or Board of Trade first. Protect Cliff Dwellers and House of Blues (4 PM closing).</div>';
  }

  const content = document.getElementById("content");
  content.innerHTML = html;
  content.querySelectorAll(".visit-check").forEach((el) => {
    el.addEventListener("change", () => toggle(el.getAttribute("data-name")));
  });
}

async function init() {
  const res = await fetch("./data/itinerary.json");
  DATA = await res.json();
  document.getElementById("satTab").addEventListener("click", () => showDay("sat"));
  document.getElementById("sunTab").addEventListener("click", () => showDay("sun"));
  render();
}

init();
