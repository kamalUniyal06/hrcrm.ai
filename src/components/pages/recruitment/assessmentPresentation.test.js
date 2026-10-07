import test from "node:test";
import assert from "node:assert/strict";
import { assessmentScore, invitationStatus } from "./assessmentPresentation.js";

test("score presentation preserves zero and numeric strings without inventing missing scores", () => {
  assert.deepEqual(assessmentScore(0, 20), { earned: 0, total: 20, percentage: 0 });
  assert.deepEqual(assessmentScore("17", "20"), { earned: 17, total: 20, percentage: 85 });
  for (const [score, total] of [[null, 20], [undefined, 20], ["", 20], [0, 0], [21, 20], [-1, 20], ["invalid", 20]]) {
    assert.equal(assessmentScore(score, total), null);
  }
});

test("expired pending links are shown as expired using the backend UTC timestamps", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  assert.equal(invitationStatus({ status: "pending", expires_at: "2026-10-07 12:00:00" }, now), "expired");
  assert.equal(invitationStatus({ status: "pending", expires_at: "2026-10-08T12:00:00Z" }, now), "pending");
  assert.equal(invitationStatus({ status: "accepted", expires_at: "2026-10-06T12:00:00Z" }, now), "accepted");
  assert.equal(invitationStatus({ status: "revoked" }, now), "revoked");
});
