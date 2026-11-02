import test from "node:test";
import assert from "node:assert/strict";
import { teamLeaves } from "./teamLeaves.js";

const today = "2026-11-02";
const people = [{ id: "k1", name: "Kamal", email: "kamal@x.org" }, { id: "g1", name: "Gagan" }];
const records = [
  { id: "1", employee_id: "k1", status: "Accepted", leave_from: "2026-11-10", leave_to: "2026-11-11", leave_days: "2", type_of_leave: "Planned Leave", description: "Wedding", date_entered: "2026-10-20 10:00:00" },
  { id: "2", employee_id: "g1", status: "Applied", leave_from: "11/04/2026", leave_to: "11/04/2026", leave_days: "0.5", type_of_leave: "Half Day" },
  { id: "3", employee_id: "g1", status: "Accepted", leave_from: "2026-11-01", leave_to: "2026-11-03" },
  { id: "4", employee_id: "k1", status: "Rejected", leave_from: "2026-11-20", leave_to: "2026-11-20" },
  { id: "5", employee_id: "k1", status: "Accepted", leave_from: "2026-09-01", leave_to: "2026-09-02" },
  // Matched by email when there is no employee link.
  { id: "6", name: "KAMAL@x.org", status: "Applied", leave_from: "2026-12-01" },
  // Someone outside the team, a repeat and a deleted record are left out.
  { id: "7", employee_id: "z9", status: "Applied", leave_from: "2026-11-05" },
  { id: "1", employee_id: "k1", status: "Accepted", leave_from: "2026-11-10" },
  { id: "8", employee_id: "k1", status: "Applied", leave_from: "2026-11-06", deleted: "1" },
];

test("splits team leaves into upcoming and history", () => {
  const { upcoming, history } = teamLeaves(records, people, today);
  assert.deepEqual(upcoming.map((row) => [row.id, row.person.id, row.from, row.to, row.status, row.current]), [
    ["3", "g1", "2026-11-01", "2026-11-03", "Accepted", true],
    ["2", "g1", "2026-11-04", "2026-11-04", "Applied", false],
    ["1", "k1", "2026-11-10", "2026-11-11", "Accepted", false],
    ["6", "k1", "2026-12-01", "2026-12-01", "Applied", false],
  ]);
  assert.deepEqual(history.map((row) => [row.id, row.status]), [["4", "Rejected"], ["5", "Accepted"]]);
  assert.deepEqual([upcoming[2].days, upcoming[2].type, upcoming[2].reason, upcoming[2].appliedOn], [2, "Planned Leave", "Wedding", "2026-10-20"]);
  assert.deepEqual([upcoming[1].days, upcoming[3].days, upcoming[3].type], [0.5, null, "Leave"]);
});

test("returns nothing without people or records", () => {
  assert.deepEqual(teamLeaves([], people, today), { upcoming: [], history: [] });
  assert.deepEqual(teamLeaves(records, [], today), { upcoming: [], history: [] });
});
