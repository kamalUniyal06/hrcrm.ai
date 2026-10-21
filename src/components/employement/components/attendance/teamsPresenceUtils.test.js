import test from "node:test";
import assert from "node:assert/strict";
import {
  indexPresence,
  istMinutes,
  presenceBucket,
  presenceForRow,
  presenceLabel,
  presenceStatus,
  teamsClock,
  timelineWindow,
} from "./teamsPresenceUtils.js";

test("availability maps to the API's buckets", () => {
  assert.equal(presenceBucket("Available"), "available");
  assert.equal(presenceBucket("DoNotDisturb"), "busy");
  assert.equal(presenceBucket("BusyIdle"), "away");
  assert.equal(presenceBucket("Offline"), "offline");
  assert.equal(presenceBucket("NotTracked"), "untracked");
  assert.equal(presenceBucket("Something new"), "unknown");
});

test("Teams values read as plain words", () => {
  assert.equal(presenceLabel("InAMeeting"), "In a meeting");
  assert.equal(presenceLabel("InACall"), "In a call");
  assert.equal(presenceLabel("DoNotDisturb"), "Do not disturb");
  assert.equal(presenceLabel("BeRightBack"), "Be right back");
  assert.equal(presenceLabel(""), "");
  assert.equal(presenceStatus({ availability: "Busy", activity: "InAMeeting" }), "In a meeting");
  assert.equal(presenceStatus({ availability: "Away", activity: "Away" }), "Away");
  assert.equal(presenceStatus({}), "Unknown");
});

test("rows find their Teams record by employee id, then by email", () => {
  const index = indexPresence([
    { employee_id: "e1", email: "A@x.com" },
    { employee_id: "", email: "b@x.com" },
  ]);
  assert.equal(presenceForRow(index, { key: "employee:e1", email: "" }).employee_id, "e1");
  assert.equal(presenceForRow(index, { key: "employee:e9", email: "b@x.com" }).email, "b@x.com");
  assert.equal(presenceForRow(index, { key: "employee:e1x", email: "a@x.com" }).employee_id, "e1");
  assert.equal(presenceForRow(index, { key: "employee:e7", email: "" }), undefined);
});

test("UTC timestamps convert to IST clock times and day minutes", () => {
  assert.equal(teamsClock("2026-10-19T12:11:51Z"), "5:41 PM");
  assert.equal(teamsClock(null), "");
  assert.equal(istMinutes("2026-10-19T04:00:00Z", "2026-10-19"), 9 * 60 + 30);
});

test("the day bar spans at least 09:00–19:00 and widens to fit", () => {
  assert.deepEqual(timelineWindow([], "2026-10-19"), { start: 540, end: 1140 });
  assert.deepEqual(
    timelineWindow([{ started_at: "2026-10-19T02:10:00Z", ended_at: "2026-10-19T15:05:00Z" }], "2026-10-19"),
    { start: 420, end: 1260 },
  );
});
