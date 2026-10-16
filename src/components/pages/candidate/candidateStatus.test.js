import test from "node:test";
import assert from "node:assert/strict";
import { applicationStage, applicationSteps, groupRounds, skillMatches } from "./candidateStatus.js";

test("application stages follow the CRM status", () => {
  assert.equal(applicationStage("applied").index, 1);
  assert.equal(applicationStage("under_review").index, 1);
  assert.equal(applicationStage("shortlisted").index, 2);
  assert.equal(applicationStage("interview_scheduled").index, 2);
  assert.deepEqual([applicationStage("accepted").index, applicationStage("accepted").tone], [3, "success"]);
  assert.deepEqual([applicationStage("rejected_by_hr").index, applicationStage("rejected_by_hr").tone], [3, "closed"]);
  assert.equal(applicationStage(undefined).index, 1);
});

test("application steps mark done, current and upcoming", () => {
  assert.deepEqual(applicationSteps("applied").map((step) => step.state), ["done", "current", "upcoming", "upcoming"]);
  assert.deepEqual(applicationSteps("hired").map((step) => step.state), ["done", "done", "done", "done"]);
  assert.equal(applicationSteps("withdrawn").at(-1).tone, "closed");
});

test("skill matches compare whole words in either direction", () => {
  const result = skillMatches(["React Native", "REST APIs", "Go", "Django"], ["react", "Rest APIs", "MongoDB"]);
  assert.deepEqual(result.items.map((entry) => entry.matched), [true, true, false, false]);
  assert.equal(result.count, 2);
  assert.equal(skillMatches(["TypeScript"], []).count, 0);
});

test("rounds are grouped into upcoming, unscheduled and past", () => {
  const rounds = [
    { record: { id: "a" }, date: new Date("2026-11-01T10:00:00Z"), status: { key: "scheduled" } },
    { record: { id: "b" }, date: null, status: { key: "pending" } },
    { record: { id: "c" }, date: new Date("2026-10-01T10:00:00Z"), status: { key: "passed" } },
    { record: { id: "d" }, date: new Date("2026-10-05T10:00:00Z"), status: { key: "pending" } },
  ];
  const groups = groupRounds(rounds);
  assert.deepEqual(groups.upcoming.map((round) => round.record.id), ["a"]);
  assert.deepEqual(groups.unscheduled.map((round) => round.record.id), ["b"]);
  assert.deepEqual(groups.past.map((round) => round.record.id), ["d", "c"]);
});
