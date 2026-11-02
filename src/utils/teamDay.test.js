import test from "node:test";
import assert from "node:assert/strict";
import { countDayStates, teamDayStatus } from "./teamDay.js";

const day = "2026-11-02";
const link = "hrc_employees_hrc_daily_activity_1hrc_employees_ida";
const activity = [
  { id: "a1", [link]: "k1", login: "11/02/2026 09:30" },
  { id: "a2", [link]: "s1", login: "11/02/2026 10:45", lunch_in: "11/02/2026 13:05" },
  { id: "a3", [link]: "g1", login: "11/02/2026 09:20", logout: "11/02/2026 18:20", lunch_in: "11/02/2026 13:00", lunch_out: "11/02/2026 13:55" },
  { id: "a4", name: "jatin@x.org", login: "11/02/2026 09:40" },
  // Yesterday's open session doesn't count.
  { id: "a5", [link]: "n1", login: "11/01/2026 09:30" },
  { id: "a1", [link]: "k1", login: "11/02/2026 09:30" },
];
const leaves = [
  { id: "l1", status: "Accepted", employee_id: "a1", leave_from: "2026-11-01", leave_to: "2026-11-03" },
  { id: "l2", status: "Accepted", employee_id: "k1", leave_from: day, leave_to: day, leave_type: "half_day" },
  { id: "l3", status: "Pending", employee_id: "n1", leave_from: day, leave_to: day },
];
const presence = [{ employee_id: "k1", availability: "Available", activity: "Available", status_since: "2026-11-02T04:10:00Z" }];

test("works out where each team member is today", () => {
  const statusOf = teamDayStatus({ activity, leaves, presence, day, lateAfter: 600, lunchLimit: 40 });
  const kamal = statusOf({ id: "k1" });
  assert.deepEqual([kamal.state, kamal.detail, kamal.late, kamal.leave], ["working", "In at 09:30 AM · Half-day leave", false, "half"]);
  assert.deepEqual(kamal.teams, { bucket: "available", label: "Available", since: "9:40 AM" });
  const shiv = statusOf({ id: "s1" });
  assert.deepEqual([shiv.state, shiv.label, shiv.detail, shiv.late], ["lunch", "On lunch", "Since 01:05 PM", true]);
  const gagan = statusOf({ id: "g1" });
  assert.deepEqual([gagan.state, gagan.detail, gagan.lunchMinutes, gagan.longLunch], ["left", "09:20 AM – 06:20 PM · 9h 00m", 55, true]);
  // Activity without an employee link matches by email.
  assert.equal(statusOf({ id: "j1", email: "Jatin@x.org" }).state, "working");
  assert.deepEqual([statusOf({ id: "a1" }).state, statusOf({ id: "a1" }).label], ["leave", "On leave"]);
  assert.deepEqual([statusOf({ id: "n1" }).state, statusOf({ id: "n1" }).teams], ["notIn", null]);
});

test("a half-day leave with no check-in reads as half-day leave", () => {
  const statusOf = teamDayStatus({ leaves, day });
  assert.deepEqual([statusOf({ id: "k1" }).state, statusOf({ id: "k1" }).label], ["notIn", "Half-day leave"]);
});

test("counts each person once", () => {
  const statusOf = teamDayStatus({ activity, leaves, day, lateAfter: 600 });
  const people = [{ id: "k1" }, { id: "s1" }, { id: "g1" }, { id: "a1" }, { id: "n1" }, { id: "k1" }, {}];
  assert.deepEqual(countDayStates(people, statusOf), { working: 1, lunch: 1, left: 1, leave: 1, notIn: 1, late: 1 });
});
