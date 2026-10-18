/** @typedef {{ satHours?: string, sunHours?: string, hours?: string }} HoursFields */

const CHICAGO = "America/Chicago";

/**
 * @param {string} raw e.g. "10am", "10:30am", "5pm", "12" (with inferred am/pm)
 * @returns {number|null} minutes from midnight
 */
export function parseTime12(raw) {
  let s = String(raw || "").trim().toLowerCase();
  let m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
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

/** Real OHC weekend day in Chicago, not the itinerary tab. */
export function ohcCalendarDay(when = new Date()) {
  const ymd = chicagoYmd(when);
  if (ymd === "2026-10-17") return "sat";
  if (ymd === "2026-10-18") return "sun";
  return null;
}

export function chicagoTimeLabel(when = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(when);
}

export function tabMatchesChicagoToday(tabDay, when = new Date()) {
  const cal = ohcCalendarDay(when);
  return cal !== null && cal === tabDay;
}

/**
 * @param {HoursFields} site
 * @param {"sat"|"sun"} hoursDay
 * @param {Date} [when]
 */
export function isWithinHoursNow(site, hoursDay, when = new Date()) {
  const rangeStr = hoursForTab(site, hoursDay);
  if (!rangeStr || /^closed$/i.test(rangeStr)) return false;
  const range = parseHourRange(rangeStr);
  if (!range) return false;
  const now = chicagoNowMinutes(when);
  return now >= range.start && now <= range.end;
}

/**
 * Open now uses **Chicago clock + calendar day** on OHC weekend (not the Sat/Sun tab).
 * Off-weekend: uses itinerary tab for “open that day” only (no time).
 * @param {HoursFields} site
 * @param {"sat"|"sun"} itineraryTab
 * @param {Date} [when]
 */
export function isOpenForNearby(site, itineraryTab, when = new Date()) {
  const cal = ohcCalendarDay(when);
  if (cal) {
    if (!isOpenOnTabDay(site, cal)) return false;
    return isWithinHoursNow(site, cal, when);
  }
  return isOpenOnTabDay(site, itineraryTab);
}

/** @param {HoursFields} site @param {"sat"|"sun"} itineraryTab @param {Date} [when] */
export function closedNowLabel(site, itineraryTab, when = new Date()) {
  const cal = ohcCalendarDay(when);
  const hoursDay = cal ?? itineraryTab;
  if (!isOpenOnTabDay(site, hoursDay)) return "Closed today";
  if (!cal) return "";
  if (isWithinHoursNow(site, hoursDay, when)) return "";
  const range = parseHourRange(hoursForTab(site, hoursDay));
  if (!range) return "Hours unclear";
  return "Closed now";
}
