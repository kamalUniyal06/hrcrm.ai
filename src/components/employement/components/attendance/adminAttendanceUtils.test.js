import test from "node:test";
import assert from "node:assert/strict";
import { attendanceDayBounds, buildAttendanceRows, buildAttendanceStatsQueries, dateKey, daySummary, isHalfDayLeave, leaveDayRequests, leavesCoveringDay, matchesOverviewFilter, parseActivityTime, readAttendanceStats, sessionSummary, weekDays } from "./adminAttendanceUtils.js";

const sample = {
  id: "activity-1", name: "verm.jatin2004@gmail.com", login: "09/18/2026 17:59",
  logout: "09/18/2026 19:34", lunch_in: "09/18/2026 18:49", lunch_out: "09/18/2026 19:27",
  hrc_employees_hrc_daily_activity_1hrc_employees_ida: "    ",
};

test("matches blank employee relationships by trimmed, case-insensitive email", () => {
  const rows = buildAttendanceRows([
    { id: "employee-1", first_name: "Jatin", email1: " VERM.JATIN2004@gmail.com " },
    { id: "employee-2", name: "Employee without attendance" },
  ], [sample, sample, { ...sample, id: "deleted", deleted: "1" }]);
  assert.equal(rows.length, 2);
  const row = rows.find(row => row.name === "Jatin");
  assert.equal(row.days["2026-09-18"].length, 1);
  assert.equal(row.matched, true);
  assert.deepEqual(rows.find(row => row.key === "employee:employee-2").days, {});
});

test("preserves unmatched attendance and respects authoritative relationships", () => {
  const rows = buildAttendanceRows([{ id: "one", email1: sample.name }], [
    { ...sample, hrc_employees_hrc_daily_activity_1hrc_employees_ida: "unknown" },
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.find(row => row.matched).days, {});
  assert.equal(rows.find(row => !row.matched).days["2026-09-18"].length, 1);
});

test("excludes exited ex-employees and their linked or email-only attendance", () => {
  const employees = [
    { id: "exited", email1: " FORMER@example.com ", stage_id_name: "Ex Employee", hrc_phase_id_name: "Exit" },
    { id: "exited-without-activity", stage_id_name: "Ex Employee", hrc_phase_id_name: "Exit" },
    { id: "stage-only", stage_id_name: "Ex Employee" },
    { id: "phase-only", hrc_phase_id_name: "Exit" },
    { id: "active", email1: "active@example.com" },
  ];
  const rows = buildAttendanceRows(employees, [
    { ...sample, id: "linked-exit", hrc_employees_hrc_daily_activity_1hrc_employees_ida: "exited" },
    { ...sample, id: "email-exit", name: "former@EXAMPLE.com" },
    { ...sample, id: "linked-active", name: "former@example.com", hrc_employees_hrc_daily_activity_1hrc_employees_ida: "active" },
  ]);
  assert.deepEqual(rows.map(row => row.key).sort(), ["employee:active", "employee:phase-only", "employee:stage-only"]);
  assert.equal(rows.find(row => row.key === "employee:active").days["2026-09-18"][0].id, "linked-active");
});

test("parses CRM dates without relying on browser date parsing", () => {
  assert.equal(parseActivityTime(sample.login).date, "2026-09-18");
  assert.equal(parseActivityTime(sample.login).time, "05:59 PM");
  assert.equal(parseActivityTime("2026-09-18 00:00:00").time, "12:00 AM");
  for (const invalid of ["", "   ", "02/30/2026 10:00", "09/18/2026 25:00", "09/18/2026 10:70"]) {
    assert.equal(parseActivityTime(invalid), null);
  }
});

test("calculates login-to-logout time without deducting lunch", () => {
  assert.equal(sessionSummary(sample).breakMinutes, 38);
  assert.equal(sessionSummary(sample).worked, 95);
  assert.equal(sessionSummary({ login: "09/21/2026 16:02", logout: "09/21/2026 18:07", lunch_in: "09/21/2026 16:37", lunch_out: "09/21/2026 16:37" }).worked, 125);
  assert.equal(sessionSummary({ login: "09/21/2026 23:00", logout: "09/22/2026 02:00" }).worked, 180);
});

test("does not invent totals for missing or inconsistent timestamps", () => {
  assert.equal(sessionSummary({ ...sample, logout: "" }).worked, null);
  assert.equal(sessionSummary({ ...sample, lunch_out: "" }).worked, 95);
  assert.equal(sessionSummary({ ...sample, logout: "09/18/2026 17:00" }).worked, null);
  assert.equal(sessionSummary({ ...sample, lunch_in: "09/18/2026 16:00" }).worked, 95);
});

test("uses the first daily login for lateness and retains multiple sessions", () => {
  const early = { id: "early", name: sample.name, login: "09/18/2026 10:00", logout: "09/18/2026 11:00" };
  const records = buildAttendanceRows([], [sample, early])[0].days["2026-09-18"];
  const summary = daySummary(records, "2026-09-18", "2026-09-21");
  assert.equal(summary.status, "onTime");
  assert.equal(summary.sessions.length, 2);
  assert.equal(summary.worked, 155);
  assert.equal(daySummary([{ login: "09/18/2026 10:01" }], "2026-09-18", "2026-09-21").status, "late");
});

test("distinguishes missing, upcoming and incomplete records", () => {
  assert.equal(daySummary([], "2026-09-18", "2026-09-21").status, "missing");
  assert.equal(daySummary([], "2026-09-22", "2026-09-21").status, "upcoming");
  assert.equal(daySummary([{ login: "" }], "2026-09-18", "2026-09-21").status, "incomplete");
});

test("Monday-to-Sunday weeks cross month and year boundaries", () => {
  assert.deepEqual(weekDays(new Date(2027, 0, 3)).map(dateKey), ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
});

test("builds get_stats queries for an Asia/Kolkata attendance day", () => {
  assert.deepEqual(attendanceDayBounds("2026-10-15"), { from: "2026-10-14 18:30:00", to: "2026-10-15 18:29:59" });
  const queries = buildAttendanceStatsQueries("2026-10-15");
  assert.deepEqual(queries.map(query => query.key), ["employees_shown", "checked_in", "late_check_ins", "not_checked_in", "on_leave_full", "on_leave_half"]);
  assert.deepEqual(queries[2], {
    key: "late_check_ins", module: "hrc_daily_activity", ignore_email: true,
    exclude_employee_phase_id: "4b140dcd-270a-3080-b367-6a9fa21e3ea4", filters: { late_login: 1 },
    date_field: "login", date_range: "custom", date_from: "2026-10-14 18:30:00", date_to: "2026-10-15 18:29:59",
  });
  assert.equal(queries[3].not_checked_in_on, "2026-10-15");
  assert.equal(queries[5].leave_duration, "half");
});

test("reads overview totals and derives on-time check-ins", () => {
  const stats = Object.fromEntries(Object.entries({
    employees_shown: 48, checked_in: 42, late_check_ins: "2", not_checked_in: 5, on_leave_full: 1, on_leave_half: 3,
  }).map(([key, count]) => [key, { count }]));
  assert.deepEqual(readAttendanceStats({ success: true, stats }), { all: 48, notCheckedIn: 5, leave: 1, late: 2, onTime: 40 });
  assert.throws(() => readAttendanceStats({ success: true, stats: { ...stats, checked_in: { error: "Module 'x' not found" } } }), /not found/);
  assert.throws(() => readAttendanceStats({ success: false, message: "Denied" }), /Denied/);
});

test("half-day leave is read from leave_type, the leave name or 0.5 days", () => {
  assert.equal(isHalfDayLeave({ leave_type: "^half_day^" }), true);
  assert.equal(isHalfDayLeave({ type_of_leave: "Half Day Sick Leave" }), true);
  assert.equal(isHalfDayLeave({ leave_days: "0.5" }), true);
  assert.equal(isHalfDayLeave({ leave_type: "full_day", type_of_leave: "Banking work", leave_days: "1" }), false);
});

test("asks for a day's leaves by end date and by start date", () => {
  assert.deepEqual(leaveDayRequests("2026-12-31"), [
    { dateField: "leave_to", from: "2026-12-31 00:00:00", to: "2028-01-01 23:59:59" },
    { dateField: "leave_from", from: "2026-12-31 00:00:00", to: "2026-12-31 23:59:59" },
  ]);
});

test("keeps each leave that covers the day once", () => {
  const long = { id: "long", leave_from: "2026-09-01", leave_to: "2026-12-31" };
  const single = { id: "single", leave_from: "10/21/2026", leave_to: "" };
  const later = { id: "later", leave_from: "2026-10-22", leave_to: "2026-10-23" };
  const ended = { id: "ended", leave_from: "2026-10-19", leave_to: "2026-10-20" };
  assert.deepEqual(leavesCoveringDay([[long, later, ended], [single, long]], "2026-10-21").map(leave => leave.id), ["long", "single"]);
});

test("someone on leave who logged in is in the leave list and their check-in list", () => {
  const base = { matched: true, day: "2026-10-21", today: "2026-10-21", lateAfter: 600 };
  const onLeaveLate = { ...base, records: [{ login: "10/21/2026 10:30" }], onLeave: true, halfDay: false };
  for (const filter of ["all", "leave", "checkedIn", "late"]) assert.equal(matchesOverviewFilter(filter, onLeaveLate), true, filter);
  for (const filter of ["onTime", "missing", "halfDay"]) assert.equal(matchesOverviewFilter(filter, onLeaveLate), false, filter);

  const onLeaveAway = { ...base, records: [], onLeave: true, halfDay: false };
  assert.equal(matchesOverviewFilter("leave", onLeaveAway), true);
  assert.equal(matchesOverviewFilter("checkedIn", onLeaveAway), false);
  assert.equal(matchesOverviewFilter("missing", onLeaveAway), false);

  // Half-day leave has its own list, so it stays out of "On leave".
  const halfDay = { ...base, records: [{ login: "10/21/2026 09:00" }], onLeave: true, halfDay: true };
  assert.equal(matchesOverviewFilter("leave", halfDay), false);
  assert.equal(matchesOverviewFilter("halfDay", halfDay), true);
  assert.equal(matchesOverviewFilter("onTime", halfDay), true);

  assert.equal(matchesOverviewFilter("missing", { ...base, records: [], onLeave: false, halfDay: false }), true);
});
