const clean = value => String(value ?? "").trim();
const employeeLink = "hrc_employees_hrc_daily_activity_1hrc_employees_ida";
const employeeLabel = "hrc_employees_hrc_daily_activity_1_name";

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// CRM timestamps are MM/DD/YYYY HH:mm. Keep their displayed wall-clock time.
export function parseActivityTime(value) {
  const text = clean(value);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match && !iso) return null;
  const [year, month, day, hour, minute] = match
    ? [match[3], match[1], match[2], match[4], match[5]].map(Number)
    : iso.slice(1).map(Number);
  const stamp = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (stamp.getUTCFullYear() !== year || stamp.getUTCMonth() !== month - 1 || stamp.getUTCDate() !== day || hour > 23 || minute > 59) return null;
  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    minutes: hour * 60 + minute,
    stamp: stamp.getTime(),
    time: `${String(hour % 12 || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`,
  };
}

export function weekDays(anchor) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return "—";
  // Under an hour reads "40m" rather than "0h 40m".
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function sessionSummary(record) {
  const login = parseActivityTime(record.login);
  const logout = parseActivityTime(record.logout);
  const lunchIn = parseActivityTime(record.lunch_in);
  const lunchOut = parseActivityTime(record.lunch_out);
  const gross = login && logout && logout.stamp >= login.stamp ? (logout.stamp - login.stamp) / 60000 : null;
  const noLunch = !clean(record.lunch_in) && !clean(record.lunch_out);
  const validLunch = lunchIn && lunchOut && lunchOut.stamp >= lunchIn.stamp && login && logout && lunchIn.stamp >= login.stamp && lunchOut.stamp <= logout.stamp;
  const breakMinutes = validLunch ? (lunchOut.stamp - lunchIn.stamp) / 60000 : noLunch ? 0 : null;
  return {
    login,
    logout,
    lunchIn,
    lunchOut,
    breakMinutes,
    inOffice: gross,
    // Effective time is the complete login-to-logout duration. Lunch is
    // reported separately and is intentionally not deducted.
    worked: gross,
  };
}

export function buildAttendanceRows(employees, activity) {
  const rows = new Map();
  const byId = new Map();
  const byEmail = new Map();
  const excludedIds = new Set();
  const excludedEmails = new Set();
  for (const employee of employees) {
    if (String(employee.deleted) === "1") continue;
    const email = clean(employee.email1).toLowerCase();
    const id = clean(employee.id);
    if (clean(employee.stage_id_name) === "Ex Employee" && clean(employee.hrc_phase_id_name) === "Exit") {
      if (id) excludedIds.add(id);
      if (email) excludedEmails.add(email);
      continue;
    }
    const key = id ? `employee:${id}` : email ? `email:${email}` : null;
    if (!key) continue;
    const row = {
      key,
      name: [employee.first_name, employee.last_name].map(clean).filter(Boolean).join(" ") || clean(employee.name) || email || "Unnamed employee",
      email,
      designation: clean(employee.current_designation) || clean(employee.title),
      days: {},
      matched: true,
    };
    rows.set(key, row);
    if (id) byId.set(id, row);
    if (email) byEmail.set(email, byEmail.has(email) ? null : row);
  }
  const seen = new Set();
  for (const record of activity) {
    if (String(record.deleted) === "1" || (record.id && seen.has(record.id))) continue;
    if (record.id) seen.add(record.id);
    const date = parseActivityTime(record.login)?.date || parseActivityTime(record.date_entered)?.date;
    if (!date) continue;
    const linkedId = clean(record[employeeLink]);
    const email = clean(record.name).toLowerCase();
    // Don't recreate excluded employees as unlinked attendance rows.
    if (linkedId ? excludedIds.has(linkedId) : excludedEmails.has(email)) continue;
    // A populated relationship is authoritative; don't attach an unknown ID to another employee by email.
    let row = linkedId ? byId.get(linkedId) : byEmail.get(email);
    if (!row) {
      const key = linkedId ? `unmatched:${linkedId}` : email ? `activity:${email}` : `record:${record.id || rows.size}`;
      row = rows.get(key);
      if (!row) {
        row = { key, name: clean(record[employeeLabel]) || clean(record.name) || "Unlinked activity", email: email.includes("@") ? email : "", designation: "Employee not linked", days: {}, matched: false };
        rows.set(key, row);
      }
    }
    (row.days[date] ||= []).push(record);
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// lateAfter is minutes after midnight; a first login after it is late (default 10:00 AM).
export function daySummary(records = [], day, today, onLeave = false, lateAfter = 600) {
  const sessions = records.map(sessionSummary);
  const logins = sessions.map(session => session.login).filter(Boolean).sort((a, b) => a.stamp - b.stamp);
  const first = logins[0];
  const status = first ? first.minutes > lateAfter ? "late" : "onTime" : records.length ? "incomplete" : onLeave ? "leave" : day > today ? "upcoming" : "missing";
  const complete = sessions.length > 0 && sessions.every(session => session.worked !== null);
  const allSessionsHaveOfficeTime = sessions.length > 0 && sessions.every(session => session.inOffice !== null);
  return {
    status,
    first,
    sessions,
    worked: complete ? sessions.reduce((sum, session) => sum + session.worked, 0) : null,
    inOffice: allSessionsHaveOfficeTime ? sessions.reduce((sum, session) => sum + session.inOffice, 0) : null,
  };
}

// Accepts YYYY-MM-DD[...] or CRM MM/DD/YYYY[...] dates and returns YYYY-MM-DD.
export function calendarDateKey(value) {
  const text = clean(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const crm = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : crm ? `${crm[3]}-${crm[1].padStart(2, "0")}-${crm[2].padStart(2, "0")}` : null;
}

// Accepted leaves expanded into "employee:<id>|YYYY-MM-DD" and "email:<email>|YYYY-MM-DD" keys.
export function buildLeaveDays(leaves = []) {
  const result = new Set();
  for (const leave of leaves) {
    if (clean(leave.status).toLowerCase() !== "accepted") continue;
    const id = clean(leave.employee_id || leave.hrc_employees_hrc_leaves_1hrc_employees_ida);
    const email = clean(leave.email).toLowerCase();
    const from = calendarDateKey(leave.leave_from);
    const to = calendarDateKey(leave.leave_to) || from;
    if ((!id && !email) || !from || !to) continue;
    const cursor = new Date(`${from}T00:00:00`);
    const last = new Date(`${to}T00:00:00`);
    while (cursor <= last) {
      const day = dateKey(cursor);
      if (id) result.add(`employee:${id}|${day}`);
      if (email) result.add(`email:${email}|${day}`);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return result;
}

// The accepted leave that covers this row's employee on day, so its details can be opened.
export function leaveForRow(leaves = [], row, day) {
  const id = row?.key?.startsWith("employee:") ? row.key.slice("employee:".length) : "";
  return leaves.find((leave) => {
    if (clean(leave.status).toLowerCase() !== "accepted") return false;
    const leaveId = clean(leave.employee_id || leave.hrc_employees_hrc_leaves_1hrc_employees_ida);
    const email = clean(leave.email).toLowerCase();
    if (!((id && leaveId === id) || (row?.email && email === row.email))) return false;
    const from = calendarDateKey(leave.leave_from);
    const to = calendarDateKey(leave.leave_to) || from;
    return Boolean(from && from <= day && to >= day);
  }) || null;
}

// Half-day leave shows up as leave_type "half_day" (or "^half_day^"), a "Half Day …" leave type, or 0.5 leave days.
export const isHalfDayLeave = leave =>
  /half/i.test(`${clean(leave.leave_type)} ${clean(leave.type_of_leave)}`) || Number(clean(leave.leave_days)) === 0.5;

export const isRowOnLeave = (leaveDays, row, day) =>
  leaveDays.has(`${row.key}|${day}`) || leaveDays.has(`email:${row.email}|${day}`);

const addDays = (day, count) => {
  const [year, month, date] = day.split("-").map(Number);
  return dateKey(new Date(year, month - 1, date + count));
};

// The gateway filters on one date field per request, so a day's leaves take two:
// leaves ending on or after the day (up to a year later), and leaves starting on it
// (this catches records saved without an end date). leavesCoveringDay merges them.
export function leaveDayRequests(day) {
  return [
    { dateField: "leave_to", from: `${day} 00:00:00`, to: `${addDays(day, 366)} 23:59:59` },
    { dateField: "leave_from", from: `${day} 00:00:00`, to: `${day} 23:59:59` },
  ];
}

// Merges leave lists, drops repeated ids and keeps the leaves whose dates include day.
export function leavesCoveringDay(lists, day) {
  const seen = new Set();
  const result = [];
  for (const leave of lists.flat()) {
    const id = clean(leave.id);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    const from = calendarDateKey(leave.leave_from);
    const to = calendarDateKey(leave.leave_to) || from;
    if (from && from <= day && to >= day) result.push(leave);
  }
  return result;
}

// Whether a row belongs in an overview list for one day. The leave and check-in lists
// overlap on purpose: someone on leave who still logged in appears in both.
export function matchesOverviewFilter(filter, { records = [], matched, onLeave, halfDay, day, today, lateAfter }) {
  if (filter === "all") return true;
  const loggedIn = records.some(record => clean(record.login));
  if (filter === "missing") return matched && !onLeave && !loggedIn;
  // Half-day leave applies whether or not the employee also checked in for the other half.
  if (filter === "halfDay") return matched && halfDay;
  if (filter === "leave") return onLeave && !halfDay;
  const status = daySummary(records, day, today, onLeave, lateAfter).status;
  if (filter === "checkedIn") return status === "onTime" || status === "late";
  if (filter === "onTime") return status === "onTime";
  if (filter === "late") return status === "late";
  return true;
}

// Employees in this phase (exited) are left out of every attendance total.
const EXCLUDED_EMPLOYEE_PHASE_ID = "4b140dcd-270a-3080-b367-6a9fa21e3ea4";
export const ATTENDANCE_TIMEZONE = "Asia/Kolkata";
const ATTENDANCE_UTC_OFFSET_MINUTES = 330;
const utcStamp = ms => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

// Start and end of a YYYY-MM-DD attendance day (Asia/Kolkata) as UTC "YYYY-MM-DD HH:mm:ss".
export function attendanceDayBounds(day) {
  const [year, month, date] = day.split("-").map(Number);
  const start = Date.UTC(year, month - 1, date) - ATTENDANCE_UTC_OFFSET_MINUTES * 60000;
  return { from: utcStamp(start), to: utcStamp(start + 86400000 - 1000) };
}

// smart_gateway get_stats queries for the admin attendance overview of one day.
export function buildAttendanceStatsQueries(day) {
  const base = { ignore_email: true, exclude_employee_phase_id: EXCLUDED_EMPLOYEE_PHASE_ID };
  const { from, to } = attendanceDayBounds(day);
  const loginRange = { date_field: "login", date_range: "custom", date_from: from, date_to: to };
  const leave = duration => ({ ...base, module: "hrc_leaves", filters: { status: "Accepted" }, leave_on: day, leave_duration: duration });
  return [
    { key: "employees_shown", module: "hrc_employees", ...base },
    { key: "checked_in", module: "hrc_daily_activity", ...base, ...loginRange },
    { key: "late_check_ins", module: "hrc_daily_activity", ...base, filters: { late_login: 1 }, ...loginRange },
    { key: "not_checked_in", module: "hrc_employees", ...base, not_checked_in_on: day, attendance_timezone: ATTENDANCE_TIMEZONE },
    { key: "on_leave_full", ...leave("full") },
    { key: "on_leave_half", ...leave("half") },
  ];
}

// Turns a get_stats response into overview counts; throws if any requested stat is missing.
export function readAttendanceStats(response) {
  if (response?.success !== true) throw new Error(response?.message || "Could not load attendance totals.");
  const count = key => {
    const entry = response.stats?.[key];
    const value = Number(entry?.count);
    if (!entry || entry.error || !Number.isFinite(value)) throw new Error(entry?.error || `Attendance total "${key}" is missing.`);
    return value;
  };
  const checkedIn = count("checked_in");
  const late = count("late_check_ins");
  return {
    all: count("employees_shown"),
    notCheckedIn: count("not_checked_in"),
    // Half-day leave has its own card, so "On leave" counts full days only.
    leave: count("on_leave_full"),
    late,
    onTime: Math.max(checkedIn - late, 0),
  };
}
