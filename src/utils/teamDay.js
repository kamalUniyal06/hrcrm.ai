import {
  buildLeaveDays,
  daySummary,
  formatMinutes,
  isHalfDayLeave,
  parseActivityTime,
} from "../components/employement/components/attendance/adminAttendanceUtils.js";
import { indexPresence, presenceBucket, presenceStatus, teamsClock } from "../components/employement/components/attendance/teamsPresenceUtils.js";

const clean = (value) => String(value ?? "").trim();
const employeeLink = "hrc_employees_hrc_daily_activity_1hrc_employees_ida";

/** Where someone is today, most useful first in counts and lists. */
export const DAY_STATES = {
  working: "Working",
  lunch: "On lunch",
  left: "Left for the day",
  leave: "On leave",
  notIn: "Not checked in",
};

const sorted = (times) => times.filter(Boolean).sort((a, b) => a.stamp - b.stamp);

/**
 * Today's status for team members from the day's clock-in records, accepted leaves and live Teams
 * presence (any may be missing). Returns `statusOf(person)` → { state, label, detail, late, leave
 * ("full" | "half" | ""), lunchMinutes, longLunch, teams: { bucket, label, since } | null }.
 * `lateAfter` and `lunchLimit` are minutes, as on the attendance page.
 */
export function teamDayStatus({ activity = [], leaves = [], presence = [], day, lateAfter = 600, lunchLimit = 40 }) {
  const byId = new Map();
  const byEmail = new Map();
  const seen = new Set();
  for (const record of activity) {
    if (String(record.deleted) === "1" || (record.id && seen.has(record.id))) continue;
    if (record.id) seen.add(record.id);
    if ((parseActivityTime(record.login)?.date || parseActivityTime(record.date_entered)?.date) !== day) continue;
    const id = clean(record[employeeLink]);
    const email = clean(record.name).toLowerCase();
    const add = (map, key) => map.set(key, [...(map.get(key) ?? []), record]);
    if (id) add(byId, id);
    else if (email) add(byEmail, email);
  }
  const fullLeave = buildLeaveDays(leaves.filter((leave) => !isHalfDayLeave(leave)));
  const halfLeave = buildLeaveDays(leaves.filter(isHalfDayLeave));
  const teams = indexPresence(presence);

  return (person) => {
    const id = clean(person?.id ?? person?.employee_id);
    const email = clean(person?.email ?? person?.email1).toLowerCase();
    const records = [...(byId.get(id) ?? []), ...(email ? byEmail.get(email) ?? [] : [])];
    const onLeave = (set) => set.has(`employee:${id}|${day}`) || (email && set.has(`email:${email}|${day}`));
    const leave = onLeave(fullLeave) ? "full" : onLeave(halfLeave) ? "half" : "";
    const summary = daySummary(records, day, day, false, lateAfter);
    const open = summary.sessions.filter((session) => session.login && !session.logout);
    const lunch = open.find((session) => session.lunchIn && !session.lunchOut);
    const lunchMinutes = summary.sessions.reduce(
      (sum, session) => (session.lunchIn && session.lunchOut && session.lunchOut.stamp >= session.lunchIn.stamp ? sum + (session.lunchOut.stamp - session.lunchIn.stamp) / 60000 : sum),
      0,
    );
    const lastOut = sorted(summary.sessions.map((session) => session.logout)).at(-1);

    let state = "notIn";
    let detail = leave === "half" ? "Half-day leave" : "";
    if (lunch) {
      state = "lunch";
      detail = `Since ${lunch.lunchIn.time}`;
    } else if (open.length) {
      state = "working";
      detail = `In at ${summary.first.time}`;
    } else if (summary.first) {
      state = "left";
      detail = `${summary.first.time} – ${lastOut?.time ?? "?"}${summary.worked !== null ? ` · ${formatMinutes(summary.worked)}` : ""}`;
    } else if (leave === "full") {
      state = "leave";
      detail = "";
    }
    const record = teams.get(`employee:${id}`) || (email ? teams.get(`email:${email}`) : undefined);
    return {
      state,
      label: leave === "half" && state === "notIn" ? "Half-day leave" : DAY_STATES[state],
      detail: leave === "half" && state !== "notIn" ? `${detail} · Half-day leave` : detail,
      late: summary.status === "late",
      leave,
      lunchMinutes,
      longLunch: lunchMinutes > lunchLimit,
      teams: record ? { bucket: presenceBucket(record.availability), label: presenceStatus(record), since: teamsClock(record.status_since) } : null,
    };
  };
}

/** How many people are in each state, plus how many came in late. Each person counts once. */
export function countDayStates(people, statusOf) {
  const counts = Object.fromEntries([...Object.keys(DAY_STATES), "late"].map((key) => [key, 0]));
  const seen = new Set();
  for (const person of people) {
    const id = clean(person?.id ?? person?.employee_id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const status = statusOf(person);
    counts[status.state] += 1;
    if (status.late) counts.late += 1;
  }
  return counts;
}
