/** @typedef {{ satHours?: string, sunHours?: string, hours?: string }} HoursFields */

const CHICAGO = "America/Chicago";

/**
 * @param {string} raw e.g. "10am", "10:30am", "5pm", "12" (with inferred am/pm)
 * @param {"am"|"pm"|null} [inferPeriod]
 * @returns {number|null} minutes from midnight
 */
export function parseTime12(raw, inferPeriod = null) {
  let s = String(raw || "").trim().toLowerCase();
  let m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!m && inferPeriod) {
    m = s.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (m) s = `${m[1]}${m[2] ? ":" + m[2] : ""}${inferPeriod}`;
    m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  }
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (h === 12) h = ap === "am" ? 0 : 12;
  else if (ap === "pm") h += 12;
  return h * 60 + min;
}

/**
 * @param {string} range e.g. "10am-5pm", "12-5pm", "12:30-4:30pm"
 * @returns {{ start: number, end: number } | null}
 */
export function parseHourRange(range) {
  const s = String(range || "").trim();
  if (!s || /^closed$/i.test(s)) return null;
  const parts = s.split(/\s*[-–]\s*/);
  if (parts.length !== 2) return null;
  let startStr = parts[0].trim();
  const endStr = parts[1].trim();
  const endAp = endStr.match(/(am|pm)$/i)?.[1]?.toLowerCase();
  if (endAp && !/(am|pm)$/i.test(startStr)) {
    startStr = `${startStr}${endAp}`;
  }
  const start = parseTime12(startStr);
  const end = parseTime12(endStr);
  if (start == null || end == null) return null;
  return { start, end };
}

/** @param {HoursFields} site @param {"sat"|"sun"} tabDay */
export function hoursForTab(site, tabDay) {
  if (tabDay === "sat") return (site.satHours || "").trim();
  return (site.sunHours || "").trim();
}

/** Open on the selected weekend day (has hours, not closed). */
export function isOpenOnTabDay(site, tabDay) {
  const h = hoursForTab(site, tabDay);
  return Boolean(h) && !/^closed$/i.test(h);
}

/**
 * Chicago local minutes-from-midnight for a Date.
 * @param {Date} [when]
 */
export function chicagoNowMinutes(when = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).formatToParts(when);
  let hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const ap = parts.find((p) => p.type === "dayPeriod")?.value?.toLowerCase();
  if (ap === "pm" && hour !== 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** @param {Date} [when] */
export function chicagoYmd(when = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHICAGO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(when);
}

export function tabMatchesChicagoToday(tabDay, when = new Date()) {
  const ymd = chicagoYmd(when);
  if (ymd === "2026-10-17") return tabDay === "sat";
  if (ymd === "2026-10-18") return tabDay === "sun";
  return false;
}

/**
 * @param {HoursFields} site
 * @param {"sat"|"sun"} tabDay
 * @param {Date} [when]
 */
export function isOpenNow(site, tabDay, when = new Date()) {
  if (!tabMatchesChicagoToday(tabDay, when)) return null;

  const rangeStr = hoursForTab(site, tabDay);
  if (!rangeStr || /^closed$/i.test(rangeStr)) return false;
  const range = parseHourRange(rangeStr);
  if (!range) return null;
  const now = chicagoNowMinutes(when);
  return now >= range.start && now <= range.end;
}

/**
 * Open now: hours on selected tab; on OHC weekend matching today, must be inside hours.
 * @param {HoursFields} site
 * @param {"sat"|"sun"} tabDay
 * @param {Date} [when]
 */
export function isOpenForNearby(site, tabDay, when = new Date()) {
  if (!isOpenOnTabDay(site, tabDay)) return false;
  const open = isOpenNow(site, tabDay, when);
  if (open === null) return true;
  return open;
}

/** @param {HoursFields} site @param {"sat"|"sun"} tabDay @param {Date} [when] */
export function closedNowLabel(site, tabDay, when = new Date()) {
  const open = isOpenNow(site, tabDay, when);
  if (open === null) return "";
  if (open) return "";
  const range = parseHourRange(hoursForTab(site, tabDay));
  if (!range) return "Hours unclear";
  return "Closed now";
}
