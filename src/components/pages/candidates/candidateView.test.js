import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptedScore,
  appliedDate,
  friendlyDateTime,
  interviewsForCandidate,
  isoDate,
  pageWindow,
  readableSource,
  scoreLabel,
  upcomingInterview,
  workflowTone,
} from "./candidateView.js";

test("accepted score reads the stored percentage", () => {
  assert.equal(acceptedScore({}), null);
  assert.equal(acceptedScore({ accepted_score: " " }), null);
  assert.equal(acceptedScore({ accepted_score: "72.6" }), 73);
  assert.equal(acceptedScore({ accepted_score: "85%" }), 85);
  assert.equal(acceptedScore({ accepted_score: "140" }), 100);
  assert.equal(acceptedScore({ accepted_score: "n/a" }), null);
  assert.equal(scoreLabel(85), "Strong match");
  assert.equal(scoreLabel(10), "Low match");
  assert.equal(scoreLabel(null), "Not scored");
});

test("CRM dates convert to ISO", () => {
  assert.equal(isoDate("10/01/2025"), "2025-10-01");
  assert.equal(isoDate("2026-08-01 10:00:00"), "2026-08-01");
  assert.equal(isoDate("2018"), "2018");
});

test("workflow tones follow keywords, not exact names", () => {
  assert.equal(workflowTone("Rejected"), "var(--attendance-absent)");
  assert.equal(workflowTone("Joining Confirmed"), "var(--attendance-present)");
  assert.equal(workflowTone("Interview Scheduled"), "var(--attendance-leave)");
  assert.equal(workflowTone("Shortlisted"), "var(--primary)");
  assert.equal(workflowTone("Unassigned"), "var(--muted-foreground)");
});

test("applied date and source are readable", () => {
  assert.equal(appliedDate({ date_entered: "08/29/2026 10:12" }), "Aug 29, 2026");
  assert.equal(appliedDate({ date_entered: "2026-08-29 10:12:00" }), "Aug 29, 2026");
  assert.equal(appliedDate({}), "—");
  assert.equal(readableSource("career_portal"), "Career Portal");
});

test("interviews are matched by candidate id or email and sorted newest first", () => {
  const now = Date.parse("2026-10-14T00:00:00Z");
  const items = interviewsForCandidate([
    { id: "1", candidate_id: "c1", description: "Round 1", interview_datetime: "2026-10-01 10:00:00", interview_status: "Pass" },
    { id: "2", candidate_id: "c1", description: "Round 2", interview_datetime: "2026-10-20 10:00:00" },
    { id: "3", email: "a@x.com", description: "Round 3", interview_datetime: "" },
    { id: "4", candidate_id: "other", description: "Round 1" },
    { id: "5", candidate_id: "c1", deleted: "1" },
  ], { id: "c1", email1: "A@x.com" }, now);
  assert.deepEqual(items.map((item) => item.record.id), ["3", "2", "1"]);
  assert.equal(items[2].status.key, "passed");
  assert.equal(upcomingInterview(items, now).record.id, "2");
});

test("page window collapses long ranges", () => {
  assert.deepEqual(pageWindow(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageWindow(1, 46), [1, 2, 3, 4, "…", 46]);
  assert.deepEqual(pageWindow(20, 46), [1, "…", 19, 20, 21, "…", 46]);
  assert.deepEqual(pageWindow(46, 46), [1, "…", 43, 44, 45, 46]);
});

test("friendly date labels relative days", () => {
  const now = new Date(2026, 9, 14, 9, 0);
  assert.match(friendlyDateTime(new Date(2026, 9, 15, 10, 30), now), /^Tomorrow, 10:30/);
  assert.match(friendlyDateTime(new Date(2026, 9, 21, 10, 30), now), /^Oct 21, 10:30/);
  assert.equal(friendlyDateTime(null, now), "Not scheduled");
});
