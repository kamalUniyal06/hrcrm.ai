import test from "node:test";
import assert from "node:assert/strict";
import { employeeTimeline } from "./employeeTimeline.js";

const now = new Date(2026, 9, 26);

test("the timeline runs from the joining date to today, oldest first", () => {
  const { events, estimatedStart } = employeeTimeline({ joiningDate: "2024-03-12", designation: "Engineer", department: "Platform" }, now);
  assert.equal(estimatedStart, false);
  assert.equal(events[0].date, "2024-03-12");
  assert.equal(events[0].detail, "Joined as Engineer in Platform.");
  assert.deepEqual(events.at(-1), { id: "today", date: "2026-10-26", kind: "today", title: "Today", detail: "2 years 7 months with the company." });
  assert.ok(events.every((event, index) => !index || events[index - 1].date <= event.date));
  assert.deepEqual(events.filter((event) => event.kind === "anniversary").map((event) => event.date), ["2025-03-12", "2026-03-12"]);
});

test("reads the stored DD/MM/YYYY joining date and never shows future events", () => {
  const { events } = employeeTimeline({ joiningDate: "01/10/2026" }, now);
  assert.equal(events[0].date, "2026-10-01");
  assert.deepEqual(events.map((event) => event.kind), ["join", "setup", "onboarding", "today"]);
  assert.equal(events.at(-1).detail, "Less than a month with the company.");
});

test("a missing or future joining date falls back to an estimated start", () => {
  for (const joiningDate of ["", "2027-01-01", "not a date"]) {
    const result = employeeTimeline({ joiningDate }, now);
    assert.equal(result.estimatedStart, true);
    assert.equal(result.events[0].date, "2025-04-26");
    assert.equal(result.events[0].detail, "Joined as a team member.");
  }
});
