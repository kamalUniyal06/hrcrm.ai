import test from "node:test";
import assert from "node:assert/strict";
import { buildAttendanceRows, buildLeaveDays } from "../attendance/adminAttendanceUtils.js";
import {
  adminDayStats,
  buildFeed,
  employeeAttendanceStats,
  employeeDateKey,
  feedDayLabel,
  formatClock,
  scheduleEventsForDay,
} from "./homeDashboardUtils.js";

const session = (day, login, logout, extra = {}) => {
  const [y, m, d] = day.split("-");
  return { id: `${day}-${login}`, login: `${m}/${d}/${y} ${login}`, logout: logout ? `${m}/${d}/${y} ${logout}` : "", ...extra };
};

test("employee stats average real sessions and skip weekends, holidays and today", () => {
  // 2026-10-05 is a Monday.
  const stats = employeeAttendanceStats({
    records: [
      session("2026-10-05", "09:30", "18:30"),
      session("2026-10-06", "10:30", "19:30"),
      session("2026-10-09", "09:00", ""),
    ],
    from: "2026-10-05",
    to: "2026-10-31",
    today: "2026-10-12",
    leaveDays: new Set(["2026-10-07"]),
    holidays: new Set(["2026-10-08"]),
  });
  assert.deepEqual(stats.counts, { present: 2, late: 1, leave: 1, absent: 0 });
  assert.equal(stats.avgCheckIn, Math.round((570 + 630 + 540) / 3));
  assert.equal(stats.avgCheckOut, Math.round((1110 + 1170) / 2));
  assert.equal(stats.avgWorked, 540);
  assert.equal(stats.onTimeRate, 67);
});

test("employee stats count past working days without a login as absent", () => {
  const stats = employeeAttendanceStats({ records: [], from: "2026-10-05", to: "2026-10-12", today: "2026-10-12" });
  // Mon-Fri of the first week; the weekend and the in-progress day are skipped.
  assert.equal(stats.counts.absent, 5);
  assert.equal(stats.avgCheckIn, null);
  assert.equal(stats.onTimeRate, null);
});

test("employee stats respect a configured late threshold", () => {
  const stats = employeeAttendanceStats({ records: [session("2026-10-05", "09:45", "18:00")], from: "2026-10-05", to: "2026-10-05", today: "2026-10-06", lateAfter: 9 * 60 + 40 });
  assert.equal(stats.counts.late, 1);
});

test("admin day stats match the attendance page buckets", () => {
  const employees = [
    { id: "a", first_name: "Asha", email1: "asha@x.com" },
    { id: "b", first_name: "Bala", email1: "bala@x.com" },
    { id: "c", first_name: "Chen", email1: "chen@x.com" },
    { id: "d", first_name: "Dev", email1: "dev@x.com" },
  ];
  const rows = buildAttendanceRows(employees, [
    { ...session("2026-10-14", "09:40", ""), name: "asha@x.com" },
    { ...session("2026-10-14", "10:20", ""), name: "bala@x.com" },
  ]);
  const leaveDays = buildLeaveDays([{ status: "Accepted", employee_id: "c", leave_from: "2026-10-13", leave_to: "2026-10-15" }]);
  const stats = adminDayStats({ rows, leaveDays, day: "2026-10-14", today: "2026-10-14" });
  assert.deepEqual(stats.counts, { present: 1, late: 1, leave: 1, absent: 1 });
  assert.equal(stats.employees, 4);
  assert.equal(stats.avgCheckIn, 600);
  assert.equal(stats.onTimeRate, 50);
});

test("schedule events include holidays, birthdays, anniversaries and leave", () => {
  const events = scheduleEventsForDay("2026-10-14", {
    holidays: [{ id: "h", name: "Festival", holiday_date: "10/14/2026" }],
    employees: [
      { id: "1", first_name: "Maria", joining_date: "14/10/2021" },
      { id: "2", first_name: "Ali", dob: "1996-10-14" },
      { id: "3", first_name: "New", joining_date: "14/10/2026" },
    ],
    leaves: [{ id: "l", status: "Accepted", leave_from: "2026-10-13", leave_to: "2026-10-14", type_of_leave: "Casual" }],
    leaveLabel: () => "You're on leave",
  });
  assert.deepEqual(events.map((event) => [event.type, event.title, event.detail]), [
    ["holiday", "Festival", "Public holiday"],
    ["anniversary", "Maria", "5 years completed"],
    ["birthday", "Ali", "Birthday"],
    ["leave", "You're on leave", "Casual"],
  ]);
});

test("feed merges activity, leave and announcements newest first", () => {
  const feed = buildFeed({
    activity: [{ id: "r", login: "10/14/2026 09:30", lunch_in: "10/14/2026 13:00" }],
    leaves: [{ id: "l", status: "Accepted", type_of_leave: "Sick", date_modified: "10/14/2026 11:00", leave_from: "2026-10-20" }],
    alerts: [{ id: "a", name: "Office closed Friday", date_entered: "10/13/2026 17:00" }],
  });
  assert.deepEqual(feed.map((item) => item.title), [
    "You started lunch",
    "Your sick request approved",
    "You checked in",
    "Office closed Friday",
  ]);
  assert.equal(feedDayLabel(feed[0].at, "2026-10-14"), "Today");
  assert.equal(feedDayLabel(feed[3].at, "2026-10-14"), "Yesterday");
});

test("formats helpers", () => {
  assert.equal(formatClock(570), "09:30 AM");
  assert.equal(formatClock(1152), "07:12 PM");
  assert.equal(employeeDateKey("05/03/2020"), "2020-03-05");
});
