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

export const isRowOnLeave = (leaveDays, row, day) =>
  leaveDays.has(`${row.key}|${day}`) || leaveDays.has(`email:${row.email}|${day}`);
