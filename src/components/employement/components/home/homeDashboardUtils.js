import {
  calendarDateKey,
  dateKey,
  daySummary,
  isRowOnLeave,
  parseActivityTime,
} from "../attendance/adminAttendanceUtils.js";

const clean = (value) => String(value ?? "").trim();
const mean = (values) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null);
const isWeekend = (key) => [0, 6].includes(new Date(`${key}T00:00:00`).getDay());

export const STATUS_KEYS = ["present", "late", "leave", "absent"];

export function eachDay(from, to) {
  const days = [];
  const cursor = new Date(`${from}T00:00:00`);
  const last = new Date(`${to}T00:00:00`);
  while (cursor <= last) {
    days.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Minutes after midnight -> "09:41 AM".
export function formatClock(minutes) {
  if (minutes === null || minutes === undefined) return "—";
  const hour = Math.floor(minutes / 60) % 24;
  const minute = Math.round(minutes % 60);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export function formatHours(minutes) {
  if (minutes === null || minutes === undefined) return "—";
  return `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, "0")}m`;
}

const activityDate = (record) => parseActivityTime(record.login)?.date || parseActivityTime(record.date_entered)?.date;

/**
 * Personal attendance for a date range. Weekends and public holidays without a
 * login are not counted as absences; today is never absent while it is in progress.
 */
export function employeeAttendanceStats({ records = [], from, to, today, lateAfter = 600, leaveDays = new Set(), holidays = new Set() }) {
  const byDay = {};
  for (const record of records) {
    if (String(record.deleted) === "1") continue;
    const day = activityDate(record);
    if (day) (byDay[day] ||= []).push(record);
  }
  const counts = { present: 0, late: 0, leave: 0, absent: 0 };
  const checkIns = [];
  const checkOuts = [];
  const worked = [];
  const last = to < today ? to : today;
  for (const day of from <= last ? eachDay(from, last) : []) {
    const summary = daySummary(byDay[day], day, today, leaveDays.has(day), lateAfter);
    if (summary.status === "onTime") counts.present += 1;
    else if (summary.status === "late") counts.late += 1;
    else if (summary.status === "leave") counts.leave += 1;
    else if (summary.status === "missing" && day < today && !isWeekend(day) && !holidays.has(day)) counts.absent += 1;
    if (summary.first) checkIns.push(summary.first.minutes);
    const logouts = summary.sessions.map((session) => session.logout).filter(Boolean);
    if (logouts.length) checkOuts.push(Math.max(...logouts.map((logout) => logout.minutes)));
    if (summary.worked !== null && summary.worked > 0) worked.push(summary.worked);
  }
  const attended = counts.present + counts.late;
  return {
    counts,
    total: STATUS_KEYS.reduce((sum, key) => sum + counts[key], 0),
    avgCheckIn: mean(checkIns),
    avgCheckOut: mean(checkOuts),
    avgWorked: mean(worked),
    onTimeRate: attended ? Math.round((counts.present / attended) * 100) : null,
  };
}

/**
 * Organisation snapshot for one day, built from buildAttendanceRows() output.
 * Matches the admin attendance page so each count equals the list its link opens.
 */
export function adminDayStats({ rows = [], leaveDays = new Set(), day, today, lateAfter = 600 }) {
  const counts = { present: 0, late: 0, leave: 0, absent: 0 };
  const checkIns = [];
  let employees = 0;
  for (const row of rows) {
    if (row.matched) employees += 1;
    const records = row.days[day] || [];
    if (!row.matched && !records.length) continue;
    const onLeave = isRowOnLeave(leaveDays, row, day);
    const summary = daySummary(records, day, today, onLeave, lateAfter);
    if (summary.status === "onTime") counts.present += 1;
    else if (summary.status === "late") counts.late += 1;
    else if (summary.status === "leave") counts.leave += 1;
    if (row.matched && !onLeave && !records.some((record) => clean(record.login))) counts.absent += 1;
    if (summary.first) checkIns.push(summary.first.minutes);
  }
  const attended = counts.present + counts.late;
  return {
    counts,
    employees,
    total: STATUS_KEYS.reduce((sum, key) => sum + counts[key], 0),
    avgCheckIn: mean(checkIns),
    onTimeRate: attended ? Math.round((counts.present / attended) * 100) : null,
  };
}

// Employee dates are saved as DD/MM/YYYY; ISO values are also accepted.
export function employeeDateKey(value) {
  const text = clean(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : dmy ? `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}` : null;
}

export const employeeName = (employee = {}) =>
  [employee.first_name, employee.last_name].map(clean).filter(Boolean).join(" ") || clean(employee.name) || clean(employee.email1) || "Employee";

const birthDate = (employee) => employeeDateKey(employee.dob || employee.birthdate || employee.date_of_birth);

/**
 * Events on a day: public holidays, birthdays, work anniversaries and accepted leave.
 * `leaveLabel` maps an accepted leave record to the title shown for it.
 */
export function scheduleEventsForDay(day, { employees = [], holidays = [], leaves = [], leaveLabel = () => "Leave" } = {}) {
  const events = [];
  const monthDay = day.slice(5);
  const year = Number(day.slice(0, 4));
  for (const holiday of holidays) {
    if (String(holiday.deleted) === "1") continue;
    if (calendarDateKey(holiday.holiday_date) === day) {
      events.push({ id: `holiday:${holiday.id}`, type: "holiday", title: clean(holiday.name) || "Public holiday", detail: "Public holiday" });
    }
  }
  for (const employee of employees) {
    if (String(employee.deleted) === "1") continue;
    const birth = birthDate(employee);
    if (birth && birth.slice(5) === monthDay) {
      events.push({ id: `birthday:${employee.id}`, type: "birthday", title: employeeName(employee), detail: "Birthday" });
    }
    const joined = employeeDateKey(employee.joining_date);
    const years = joined ? year - Number(joined.slice(0, 4)) : 0;
    if (joined && joined.slice(5) === monthDay && years > 0) {
      events.push({ id: `anniversary:${employee.id}`, type: "anniversary", title: employeeName(employee), detail: `${years} year${years === 1 ? "" : "s"} completed` });
    }
  }
  for (const leave of leaves) {
    if (clean(leave.status).toLowerCase() !== "accepted") continue;
    const from = calendarDateKey(leave.leave_from);
    const to = calendarDateKey(leave.leave_to) || from;
    if (from && from <= day && day <= to) {
      events.push({ id: `leave:${leave.id}`, type: "leave", title: leaveLabel(leave), detail: clean(leave.type_of_leave || leave.leave_type) || "Approved leave" });
    }
  }
  return events;
}

const stampOf = (value) => parseActivityTime(value)?.stamp ?? (calendarDateKey(value) ? Date.parse(`${calendarDateKey(value)}T00:00:00Z`) : null);

const leaveStatusText = { accepted: "approved", rejected: "rejected", applied: "submitted" };

/** Activity feed: attendance events, leave updates and announcements, newest first. */
export function buildFeed({ activity = [], leaves = [], alerts = [], personLabel = () => "You", leaveLabel = () => "Your", limit = 12 }) {
  const items = [];
  const steps = [
    ["login", "checkin", "checked in"],
    ["lunch_in", "lunch", "started lunch"],
    ["lunch_out", "lunch", "returned from lunch"],
    ["logout", "checkout", "checked out"],
  ];
  for (const record of activity) {
    if (String(record.deleted) === "1") continue;
    for (const [field, type, verb] of steps) {
      const time = parseActivityTime(record[field]);
      if (time) items.push({ id: `${record.id}:${field}`, type, at: time.stamp, title: `${personLabel(record)} ${verb}`, detail: time.time });
    }
  }
  for (const leave of leaves) {
    if (String(leave.deleted) === "1") continue;
    const status = clean(leave.status).toLowerCase();
    const at = stampOf(status === "applied" ? leave.date_entered : leave.date_modified || leave.date_entered);
    if (at === null) continue;
    const from = calendarDateKey(leave.leave_from);
    const to = calendarDateKey(leave.leave_to);
    const range = from ? (to && to !== from ? `${shortDate(from)} – ${shortDate(to)}` : shortDate(from)) : "";
    items.push({
      id: `leave:${leave.id}`,
      type: status === "rejected" ? "leaveRejected" : status === "accepted" ? "leaveApproved" : "leave",
      at,
      title: `${leaveLabel(leave)} ${clean(leave.type_of_leave || leave.leave_type).toLowerCase() || "leave"} request ${leaveStatusText[status] || status || "updated"}`,
      detail: range,
    });
  }
  for (const alert of alerts) {
    const at = stampOf(alert.date_entered);
    if (at !== null) items.push({ id: `alert:${alert.id}`, type: "announcement", at, title: clean(alert.name) || "Announcement", detail: "Announcement" });
  }
  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (key) => `${Number(key.slice(8, 10))} ${MONTHS[Number(key.slice(5, 7)) - 1]}`;

/** "Today", "Yesterday" or "12 Oct" for a wall-clock UTC stamp. */
export function feedDayLabel(stamp, today) {
  const key = new Date(stamp).toISOString().slice(0, 10);
  if (key === today) return "Today";
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return key === yesterday.toISOString().slice(0, 10) ? "Yesterday" : shortDate(key);
}
