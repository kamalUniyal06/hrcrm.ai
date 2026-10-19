import { candidateInterviewStatus } from "../interviews/candidateInterviewData.js";
import { candidateId, hasOutcome, interviewDate, roundName } from "../interviews/interviewUtils.js";

const clean = (value) => String(value ?? "").trim();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The candidate's accepted_score as a whole 0–100 percentage, or null when it hasn't been scored. */
export function acceptedScore(record = {}) {
  const text = clean(record.accepted_score).replace(/%$/, "");
  const value = text ? Number(text) : NaN;
  return Number.isFinite(value) ? Math.round(Math.min(Math.max(value, 0), 100)) : null;
}

export function scoreLabel(score) {
  if (score === null) return "Not scored";
  if (score >= 80) return "Strong match";
  if (score >= 50) return "Good match";
  return "Low match";
}

/** "MM/DD/YYYY ..." or ISO -> "YYYY-MM-DD"; anything else is returned as entered. */
export function isoDate(value) {
  const text = clean(value);
  const crm = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (crm) return `${crm[3]}-${crm[1].padStart(2, "0")}-${crm[2].padStart(2, "0")}`;
  return text.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || text;
}

// Workflow names are data-driven, so tone is matched on keywords.
const TONES = [
  [/reject|declin|not selected|fail|withdraw/i, "var(--attendance-absent)"],
  [/hire|select|join|offer|accept|employ|pass/i, "var(--attendance-present)"],
  [/interview|schedul/i, "var(--attendance-leave)"],
  [/screen|assess|test|review|pending/i, "var(--attendance-late)"],
  [/shortlist/i, "var(--primary)"],
];

export function workflowTone(name) {
  const text = clean(name);
  if (!text || /^unassigned$/i.test(text)) return "var(--muted-foreground)";
  return TONES.find(([pattern]) => pattern.test(text))?.[1] || "var(--muted-foreground)";
}

// Stable colour per department/designation for the position icon.
const POSITION_TONES = ["var(--primary)", "var(--attendance-late)", "var(--attendance-present)", "var(--attendance-leave)", "var(--attendance-absent)"];
export function positionTone(label) {
  const text = clean(label).toLowerCase();
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return POSITION_TONES[hash % POSITION_TONES.length];
}

/** "MM/DD/YYYY ..." or ISO -> "Aug 29, 2026". */
export function appliedDate(record = {}) {
  const text = clean(record.date_entered);
  const crm = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [year, month, day] = crm ? [crm[3], crm[1], crm[2]] : iso ? [iso[1], iso[2], iso[3]] : [];
  if (!year || !MONTHS[Number(month) - 1]) return clean(record.date_entered_uni_format) || text || "—";
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

export const readableSource = (value) => clean(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "—";

export function candidateLocation(record = {}) {
  return [record.primary_address_city, record.primary_address_state, record.primary_address_country].map(clean).filter(Boolean).join(", ");
}

/** Every interview for a candidate, newest first, with a display status. */
export function interviewsForCandidate(interviews = [], candidate = {}, now = Date.now()) {
  const id = clean(candidate.id);
  const email = clean(candidate.email1).toLowerCase();
  return interviews
    .filter((record) => String(record.deleted) !== "1")
    .filter((record) => (id && candidateId(record) === id) || (!candidateId(record) && email && clean(record.email).toLowerCase() === email))
    .map((record) => ({ record, round: roundName(record), date: interviewDate(record.interview_datetime), status: candidateInterviewStatus(record, now), open: !hasOutcome(record) }))
    .sort((left, right) => (right.date?.getTime() ?? Infinity) - (left.date?.getTime() ?? Infinity));
}

/** The earliest interview still ahead of `now`. */
export function upcomingInterview(items = [], now = Date.now()) {
  return items
    .filter((item) => item.open && item.date && item.date.getTime() >= now)
    .sort((left, right) => left.date - right.date)[0] || null;
}

/** Page numbers with gaps, e.g. [1, 2, 3, "…", 46]. */
export function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total));
  if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((page) => pages.add(page));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, index) => (index && page - sorted[index - 1] > 1 ? ["…", page] : [page]));
}

/** Friendly "Today, 10:30 AM" / "Tomorrow, …" / "Oct 21, 10:30 AM" for a Date. */
export function friendlyDateTime(date, now = new Date()) {
  if (!date) return "Not scheduled";
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const day = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((day(date) - day(now)) / 86400000);
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  if (diff === -1) return `Yesterday, ${time}`;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}${date.getFullYear() !== now.getFullYear() ? `, ${date.getFullYear()}` : ""}, ${time}`;
}
