import test from "node:test";
import assert from "node:assert/strict";
import { boardColumns, leaveApproval, leaveFeedBody } from "./leaveAdminUtils.js";

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

test("each column asks the gateway to filter by status and sort by applied date", () => {
  assert.deepEqual(leaveFeedBody({ from: "2026-10-01 00:00:00", to: "2026-10-31 23:59:59", dateField: "date_entered", email: "a@b.co", status: "Accepted", orderDir: "ASC" }, 2), {
    action: "fetch", module: "hrc_leaves", filters: { name: "a@b.co", status: "Accepted" },
    date_range: "custom", date_field: "date_entered", date_from: "2026-10-01 00:00:00", date_to: "2026-10-31 23:59:59",
    order_by: "date_entered", order_dir: "ASC", page: 2, per_page: 100,
  });
  // Callers that don't sort (the attendance day lookup) send the same body as before.
  assert.deepEqual(leaveFeedBody({ from: "x", to: "y" }), {
    action: "fetch", module: "hrc_leaves", filters: {}, date_range: "custom", date_field: "leave_from", date_from: "x", date_to: "y", page: 1, per_page: 100,
  });
});

test("board columns keep the server order and show a just-decided request at the top of its new column", () => {
  const columns = boardColumns({
    Applied: [{ id: "1", status: "Applied" }, { id: "2", status: "Accepted", decidedHere: true }, { id: "3", status: "Applied" }],
    Accepted: [{ id: "9", status: "Accepted" }, { id: "8", status: "Rejected" }],
    Rejected: [],
  });
  assert.deepEqual(columns.Applied.map((record) => record.id), ["1", "3"]);
  assert.deepEqual(columns.Accepted.map((record) => record.id), ["2", "9"]);
  assert.deepEqual(columns.Rejected, []);
  // Once the column's own feed has it, it is not listed twice.
  assert.deepEqual(boardColumns({ Applied: [{ id: "2", status: "Accepted", decidedHere: true }], Accepted: [{ id: "2", status: "Accepted" }] }).Accepted.map((record) => record.id), ["2"]);
});
