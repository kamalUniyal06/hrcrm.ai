import test from "node:test";
import assert from "node:assert/strict";
import { buildAttendanceRows, dateKey, daySummary, parseActivityTime, sessionSummary, weekDays } from "./adminAttendanceUtils.js";

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

test("parses CRM dates without relying on browser date parsing", () => {
  assert.equal(parseActivityTime(sample.login).date, "2026-09-18");
  assert.equal(parseActivityTime(sample.login).time, "05:59 PM");
  assert.equal(parseActivityTime("2026-09-18 00:00:00").time, "12:00 AM");
  for (const invalid of ["", "   ", "02/30/2026 10:00", "09/18/2026 25:00", "09/18/2026 10:70"]) {
    assert.equal(parseActivityTime(invalid), null);
  }
});

test("calculates both provided examples and an overnight session", () => {
  assert.equal(sessionSummary(sample).breakMinutes, 38);
  assert.equal(sessionSummary(sample).worked, 57);
  assert.equal(sessionSummary({ login: "09/21/2026 16:02", logout: "09/21/2026 18:07", lunch_in: "09/21/2026 16:37", lunch_out: "09/21/2026 16:37" }).worked, 125);
  assert.equal(sessionSummary({ login: "09/21/2026 23:00", logout: "09/22/2026 02:00" }).worked, 180);
});

test("does not invent totals for missing or inconsistent timestamps", () => {
  assert.equal(sessionSummary({ ...sample, logout: "" }).worked, null);
  assert.equal(sessionSummary({ ...sample, lunch_out: "" }).worked, null);
  assert.equal(sessionSummary({ ...sample, logout: "09/18/2026 17:00" }).worked, null);
  assert.equal(sessionSummary({ ...sample, lunch_in: "09/18/2026 16:00" }).worked, null);
});

test("uses the first daily login for lateness and retains multiple sessions", () => {
  const early = { id: "early", name: sample.name, login: "09/18/2026 10:00", logout: "09/18/2026 11:00" };
  const records = buildAttendanceRows([], [sample, early])[0].days["2026-09-18"];
  const summary = daySummary(records, "2026-09-18", "2026-09-21");
  assert.equal(summary.status, "onTime");
  assert.equal(summary.sessions.length, 2);
  assert.equal(summary.worked, 117);
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
