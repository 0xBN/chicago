/** @typedef {{ satHours?: string, sunHours?: string, hours?: string }} HoursFields */

const CHICAGO = "America/Chicago";
const OHC_SAT = new Date("2026-10-17T00:00:00-05:00");
const OHC_SUN = new Date("2026-10-18T00:00:00-05:00");

/**
 * @param {string} raw e.g. "10am", "10:30am", "5pm"
 * @returns {number|null} minutes from midnight
 */
export function parseTime12(raw) {
  const s = String(raw || "").trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (h === 12) h = ap === "am" ? 0 : 12;
  else if (ap === "pm") h += 12;
  return h * 60 + min;
}

/**
 * @param {string} range e.g. "10am-5pm"
 * @returns {{ start: number, end: number } | null}
 */
export function parseHourRange(range) {
  const s = String(range || "").trim();
  if (!s || /closed/i.test(s)) return null;
  const parts = s.split(/\s*[-–]\s*/);
  if (parts.length !== 2) return null;
  const start = parseTime12(parts[0]);
  const end = parseTime12(parts[1]);
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
    hour12: false,
  }).formatToParts(when);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
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

/**
 * True if site hours for tabDay include `when` (Chicago).
 * Only meaningful when calendar day matches OHC weekend or tab aligns with today.
 */
export function isOpenNow(site, tabDay, when = new Date()) {
  const ymd = chicagoYmd(when);
  const onOhc =
    (ymd === "2026-10-17" && tabDay === "sat") ||
    (ymd === "2026-10-18" && tabDay === "sun");
  if (!onOhc) return true;

  const rangeStr = hoursForTab(site, tabDay);
  const range = parseHourRange(rangeStr);
  if (!range) return false;
  const now = chicagoNowMinutes(when);
  return now >= range.start && now <= range.end;
}

export function tabMatchesChicagoToday(tabDay, when = new Date()) {
  const ymd = chicagoYmd(when);
  if (ymd === "2026-10-17") return tabDay === "sat";
  if (ymd === "2026-10-18") return tabDay === "sun";
  return false;
}
