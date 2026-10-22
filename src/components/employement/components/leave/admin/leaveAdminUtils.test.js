import test from "node:test";
import assert from "node:assert/strict";
import { leaveApproval } from "./leaveAdminUtils.js";

const names = new Map([["a1b2c3d4-0000-1111-2222-333344445555", "Swati Rana"], ["e9f8a7b6-0000-1111-2222-333344445555", "Aman Gupta"]]);

test("reads approval details from the leave's own name fields first", () => {
  const info = leaveApproval({
    status: "Accepted",
    approved_by_id: "a1b2c3d4-0000-1111-2222-333344445555",
    approved_by_id_name: "Priya HR",
    work_handed_over_to_id: "e9f8a7b6-0000-1111-2222-333344445555",
    work_handed_over_to_id_name: " ",
    verdict: " Balance available ",
    approved_date: "2026-10-22",
  }, names);
  assert.equal(info.approvedBy, "Priya HR");
  assert.equal(info.handoverTo, "Aman Gupta");
  assert.equal(info.reason, "Balance available");
  assert.equal(info.decidedOn, "2026-10-22");
});

test("never shows a raw id as a name, and has no decision while applied", () => {
  const info = leaveApproval({ status: "Applied", approved_by: "a1b2c3d4-0000-1111-2222-999999999999", date_modified: "10/22/2026 15:54" });
  assert.equal(info.approvedBy, "");
  assert.equal(info.handoverTo, "");
  assert.equal(info.decidedOn, "");
  assert.equal(leaveApproval({ status: "Rejected", date_modified: "10/22/2026 15:54" }).decidedOn, "10/22/2026 15:54");
});
