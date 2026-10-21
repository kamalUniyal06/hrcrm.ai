const clean = value => String(value ?? "").trim();

// Teams Presence API timestamps are UTC; its dates and our display are Asia/Kolkata.
export const TEAMS_TIMEZONE = "Asia/Kolkata";

// Microsoft availability -> the API's bucket, as listed in the Teams Presence API reference.
const BUCKETS = {
  Available: "available",
  Busy: "busy",
  DoNotDisturb: "busy",
  Away: "away",
  BeRightBack: "away",
  AvailableIdle: "away",
  BusyIdle: "away",
  Offline: "offline",
  PresenceUnknown: "unknown",
  NotTracked: "untracked",
};

export const presenceBucket = availability => BUCKETS[clean(availability)] || "unknown";

// Theme tokens, so presence colours follow the selected theme.
export const PRESENCE_COLORS = {
  available: "var(--attendance-present)",
  busy: "var(--attendance-absent)",
  away: "var(--attendance-late)",
  offline: "var(--muted-foreground)",
  unknown: "var(--muted-foreground)",
  untracked: "var(--border)",
};

// "InAMeeting" -> "In a meeting", "DoNotDisturb" -> "Do not disturb".
export function presenceLabel(value) {
  const words = clean(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  return words ? words.charAt(0) + words.slice(1).toLowerCase() : "";
}

// The activity ("In a call") when it adds detail, otherwise the availability ("Away").
export function presenceStatus(record = {}) {
  const activity = clean(record.activity);
  const availability = clean(record.availability);
  return presenceLabel(activity && activity !== availability ? activity : availability) || "Unknown";
}

// Teams records keyed like attendance rows ("employee:<id>") and by email as a fallback.
export function indexPresence(records = []) {
  const index = new Map();
  for (const record of records) {
    const id = clean(record.employee_id);
    const email = clean(record.email).toLowerCase();
    if (id) index.set(`employee:${id}`, record);
    if (email && !index.has(`email:${email}`)) index.set(`email:${email}`, record);
  }
  return index;
}

export const presenceForRow = (index, row) =>
  index.get(row.key) || (row.email ? index.get(`email:${row.email}`) : undefined);

// "5:41 PM" in IST for a UTC ISO timestamp; empty when missing.
export function teamsClock(iso) {
  const date = new Date(clean(iso));
  if (!clean(iso) || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: TEAMS_TIMEZONE, hour: "numeric", minute: "2-digit" })
    .format(date)
    .replace(/\s+/g, " ");
}

// Minutes after IST midnight of `day` (YYYY-MM-DD) for a UTC ISO timestamp.
export const istMinutes = (iso, day) =>
  (Date.parse(clean(iso)) - Date.parse(`${day}T00:00:00+05:30`)) / 60000;

// Whole-hour window for a day bar: at least 09:00–19:00, widened to fit every period.
export function timelineWindow(periods = [], day) {
  const minutes = periods
    .flatMap(period => [istMinutes(period.started_at, day), istMinutes(period.ended_at, day)])
    .filter(Number.isFinite);
  return {
    start: Math.max(0, Math.floor(Math.min(9 * 60, ...minutes) / 60) * 60),
    end: Math.min(24 * 60, Math.ceil(Math.max(19 * 60, ...minutes) / 60) * 60),
  };
}
