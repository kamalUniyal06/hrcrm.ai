import he from "he";
import { calendarDateKey } from "../attendance/adminAttendanceUtils.js";
import { announcementPreview } from "../home/homeDashboardUtils.js";

// Pure helpers for system alerts: response types, answers, targeting, dates and HR forms.
const clean = (value) => String(value ?? "").trim();
const pad = (value) => String(value).padStart(2, "0");
const truthy = (value) => value === true || value === 1 || ["1", "true"].includes(clean(value).toLowerCase());

// Each response type decides the popup buttons and whether an unanswered alert holds up logout.
export const RESPONSE_TYPES = {
  none: { label: "Information only", answers: ["seen"], blocksLogout: false },
  acknowledge: { label: "Acknowledge", answers: ["acknowledged"], blocksLogout: true },
  yes_no: { label: "Yes / No", answers: ["yes", "no"], blocksLogout: true },
};
export const RESPONSE_TYPE_KEYS = ["none", "acknowledge", "yes_no"];
export const AUDIENCES = { all: "All employees", selected: "Selected employees" };

const ANSWER_LABELS = { yes: "Yes", no: "No", acknowledged: "Acknowledged", seen: "Seen" };
const BUTTON_LABELS = { seen: "Close", acknowledged: "I have read this", yes: "Yes", no: "No" };
const capitalize = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);

export const responseTypeOf = (alert) => {
  const type = clean(alert?.response_type).toLowerCase();
  return RESPONSE_TYPES[type] ? type : "yes_no";
};
export const audienceOf = (alert) => (clean(alert?.audience).toLowerCase() === "selected" ? "selected" : "all");
// Alerts saved before the active field existed have no value, and count as active.
export const isAlertActive = (alert) => !["0", "false", "off", "no"].includes(clean(alert?.active).toLowerCase());
export const answerLabel = (answer) => ANSWER_LABELS[clean(answer).toLowerCase()] || capitalize(clean(answer)) || "Unknown";
export const answerButtonLabel = (answer) => BUTTON_LABELS[clean(answer).toLowerCase()] || capitalize(clean(answer));
export const alertTitle = (alert) => he.decode(clean(alert?.name)) || "Untitled alert";
const endOfDay = (year, month, day) => new Date(year, month - 1, day, 23, 59, 59);
const asDate = (now) => (now instanceof Date ? now : new Date());

// When an alert stops showing. expires_on may be a date (shows until the end of that day),
// a gateway "MM/DD/YYYY HH:mm" in local time, or an hrc "YYYY-MM-DD HH:MM:SS" in UTC.
export function alertExpiresAt(alert) {
  const text = clean(alert?.expires_on);
  if (!text) return null;
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (slash) {
    let [month, day] = [+slash[1], +slash[2]];
    if (month > 12) [month, day] = [day, month];
    return slash[4] === undefined ? endOfDay(+slash[3], month, day) : new Date(+slash[3], month - 1, day, +slash[4], +slash[5]);
  }
  const utc = parseUtc(text);
  if (utc) return utc;
  const key = calendarDateKey(text);
  if (!key) return null;
  const [year, month, day] = key.split("-").map(Number);
  return endOfDay(year, month, day);
}

// The local day the alert expires, as YYYY-MM-DD.
export function alertExpiry(alert) {
  const at = alertExpiresAt(alert);
  return at ? `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` : null;
}

const isEndOfDay = (date) => date.getHours() === 23 && date.getMinutes() === 59;

// "31 Oct 2026" for an end-of-day expiry, "31 Oct 2026, 3:00 pm" otherwise.
export function formatExpiry(date) {
  if (!date) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(isEndOfDay(date) ? {} : { hour: "numeric", minute: "2-digit" }),
  });
}

export const isAlertExpired = (alert, now = new Date()) => {
  const at = alertExpiresAt(alert);
  return Boolean(at && at < asDate(now));
};

// "Live" = active, not deleted, and not past its expiry time.
export function isAlertLive(alert, now = new Date()) {
  if (String(alert?.deleted) === "1" || !isAlertActive(alert)) return false;
  return !isAlertExpired(alert, now);
}

// A date and an optional "HH:mm" in local time; no time = the end of that day.
export function localExpiry(dateKeyValue, time) {
  if (!dateKeyValue) return null;
  const [year, month, day] = dateKeyValue.split("-").map(Number);
  if (!time) return endOfDay(year, month, day);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

// A Date as the UTC "YYYY-MM-DD HH:MM:SS" the backend uses for timestamps.
export const toUtcStamp = (date) => date.toISOString().slice(0, 19).replace("T", " ");

// The hrc calls return UTC "YYYY-MM-DD HH:MM:SS" strings.
export function parseUtc(value) {
  const match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [year, month, day, hour, minute, second = "0"] = match.slice(1);
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Local wall-clock "YYYY-MM-DD HH:mm", the form the home schedule and feed read.
export function utcToLocalStamp(value) {
  const date = parseUtc(value);
  if (!date) return clean(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatUtcTime(value) {
  const date = parseUtc(value);
  return date
    ? date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
}

export function formatDateKey(key) {
  if (!key) return "";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function normalizeMyAlert(alert) {
  const responseType = responseTypeOf(alert);
  const allowed = (Array.isArray(alert?.allowed_answers) ? alert.allowed_answers : [])
    .map((answer) => clean(answer).toLowerCase())
    .filter(Boolean);
  const answer = clean(alert?.answer).toLowerCase() || null;
  const responded = truthy(alert?.responded) || Boolean(answer);
  return {
    ...alert,
    id: clean(alert?.id),
    response_type: responseType,
    allowed_answers: allowed.length ? allowed : RESPONSE_TYPES[responseType].answers,
    answer,
    responded,
    blocks_logout: alert?.blocks_logout === undefined || alert?.blocks_logout === null
      ? !responded && RESPONSE_TYPES[responseType].blocksLogout
      : !responded && truthy(alert.blocks_logout),
  };
}

const summarize = (alerts) => ({
  alerts,
  pendingCount: alerts.filter((alert) => !alert.responded).length,
  blockingCount: alerts.filter((alert) => alert.blocks_logout).length,
});

// my_alerts response → { alerts, pendingCount, blockingCount }. Counts are worked out
// from the alerts so they stay right after an answer is saved locally. Alerts past their
// expiry time are dropped here too, since the backend only checks the expiry date.
export function readMyAlerts(response, now = new Date()) {
  const alerts = (Array.isArray(response?.alerts) ? response.alerts : [])
    .map(normalizeMyAlert)
    .filter((alert) => alert.id && !isAlertExpired(alert, now));
  return summarize(alerts);
}

export function markAlertAnswered(data, alertId, answer, answeredAt = new Date()) {
  const stamp = answeredAt.toISOString().slice(0, 19).replace("T", " ");
  return summarize((data?.alerts || []).map((alert) =>
    alert.id === alertId
      ? { ...alert, responded: true, answer: clean(answer).toLowerCase(), answered_at: stamp, blocks_logout: false }
      : alert,
  ));
}

// Unanswered alerts for the popup, oldest first.
export function popupQueue(alerts = [], { snoozed = new Set(), blockingOnly = false } = {}) {
  return alerts
    .filter((alert) => !alert.responded && !snoozed.has(alert.id) && (!blockingOnly || alert.blocks_logout))
    .sort((a, b) => (parseUtc(a.date_entered)?.getTime() ?? 0) - (parseUtc(b.date_entered)?.getTime() ?? 0));
}

export function respondErrorKind(error) {
  const message = clean(error?.message).toLowerCase();
  if (message.includes("already responded")) return "duplicate";
  if (message.includes("not available")) return "unavailable";
  return "other";
}

export function readAlertStatus(response) {
  const people = (list) => (Array.isArray(list) ? list : []).map((person) => ({
    id: clean(person.id),
    name: clean(person.name) || clean(person.email) || "Unnamed employee",
    email: clean(person.email),
    answer: clean(person.answer).toLowerCase() || null,
    answeredAt: clean(person.answered_at) || null,
  }));
  const responded = people(response?.responded);
  const pending = people(response?.pending);
  const count = (value, fallback) => (clean(value) !== "" && Number.isFinite(Number(value)) ? Number(value) : fallback);
  return {
    alert: response?.alert || null,
    targetCount: count(response?.target_count, responded.length + pending.length),
    respondedCount: count(response?.responded_count, responded.length),
    pendingCount: count(response?.pending_count, pending.length),
    answerCounts: response?.answer_counts && typeof response.answer_counts === "object" ? response.answer_counts : {},
    responded,
    pending,
  };
}

export function countAnswers(responses = []) {
  const counts = {};
  for (const response of responses) {
    const answer = clean(response.description).toLowerCase();
    if (answer) counts[answer] = (counts[answer] || 0) + 1;
  }
  return counts;
}

export function diffTargets(currentIds = [], nextIds = []) {
  const current = new Set(currentIds.map(clean).filter(Boolean));
  const next = new Set(nextIds.map(clean).filter(Boolean));
  return {
    add: [...next].filter((id) => !current.has(id)),
    remove: [...current].filter((id) => !next.has(id)),
  };
}

// Employees HR can target: no deleted records and no former employees.
export function employeeOptions(employees = []) {
  return employees
    .filter((employee) =>
      String(employee.deleted) !== "1" &&
      clean(employee.id) &&
      !(clean(employee.stage_id_name) === "Ex Employee" && clean(employee.hrc_phase_id_name) === "Exit"))
    .map((employee) => ({
      id: clean(employee.id),
      name: [employee.first_name, employee.last_name].map(clean).filter(Boolean).join(" ") || clean(employee.name) || clean(employee.email1) || "Unnamed employee",
      email: clean(employee.email1 || employee.email).toLowerCase(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const hasMessage = (html) => Boolean(announcementPreview(html)) || /<img\b/i.test(String(html ?? ""));

export function validateAlertForm(values, now = new Date()) {
  const errors = {};
  if (!clean(values.name)) errors.name = "Add a title.";
  if (!hasMessage(values.description)) errors.description = "Write the message employees will see.";
  if (values.audience === "selected" && !(values.employeeIds || []).length) errors.employees = "Pick at least one employee.";
  if (!RESPONSE_TYPES[values.responseType]) errors.responseType = "Choose how employees respond.";
  if (values.expiresTime && !values.expiresOn) errors.expiresOn = "Pick a date for the time you set.";
  else if (values.expiresOn && localExpiry(values.expiresOn, values.expiresTime) <= asDate(now)) {
    errors.expiresOn = values.expiresTime ? "Pick a time later than now." : "Pick today or a later date.";
  }
  return errors;
}

// Form values → hrc_system_alert fields for the gateway create/update.
// The expiry goes as a UTC timestamp so a same-day time survives.
export function alertPayload(values) {
  const expiresAt = localExpiry(values.expiresOn, values.expiresTime);
  return {
    name: clean(values.name),
    description: String(values.description ?? ""),
    audience: values.audience === "selected" ? "selected" : "all",
    response_type: RESPONSE_TYPES[values.responseType] ? values.responseType : "yes_no",
    active: values.active ? 1 : 0,
    expires_on: expiresAt ? toUtcStamp(expiresAt) : "",
  };
}

export const emptyAlertForm = () => ({
  name: "",
  description: "",
  audience: "all",
  employeeIds: [],
  responseType: "yes_no",
  active: true,
  expiresOn: "",
  expiresTime: "",
});

export function alertFormFromRecord(alert, employeeIds = []) {
  const expiresAt = alertExpiresAt(alert);
  return {
    name: clean(alert?.name) ? alertTitle(alert) : "",
    description: he.decode(String(alert?.description ?? "")),
    audience: audienceOf(alert),
    employeeIds,
    responseType: responseTypeOf(alert),
    active: isAlertActive(alert),
    expiresOn: alertExpiry(alert) || "",
    expiresTime: expiresAt && !isEndOfDay(expiresAt) ? `${pad(expiresAt.getHours())}:${pad(expiresAt.getMinutes())}` : "",
  };
}

// Badges shown on each alert row for HR.
export function alertBadges(alert, now = new Date()) {
  const expiresAt = alertExpiresAt(alert);
  const status = !isAlertActive(alert)
    ? { key: "status", label: "Inactive", tone: "muted" }
    : isAlertExpired(alert, now)
      ? { key: "status", label: "Expired", tone: "warning" }
      : { key: "status", label: "Live", tone: "success" };
  return [
    status,
    { key: "audience", label: AUDIENCES[audienceOf(alert)], tone: "neutral" },
    { key: "type", label: RESPONSE_TYPES[responseTypeOf(alert)].label, tone: "info" },
    ...(expiresAt && status.label === "Live" ? [{ key: "expiry", label: `Until ${formatExpiry(expiresAt)}`, tone: "neutral" }] : []),
  ];
}
