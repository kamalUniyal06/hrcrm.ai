import test from "node:test";
import assert from "node:assert/strict";
import { countByLabel, initialsOf, offboardingProgress, openOffboardingCases } from "./adminInsights.js";

const allTasks = { assets: "1", kt: "1", exit_interview: "1", reviews: "1", salary_slip: "1", decleration_form: "1" };
const allApprovals = { notify_tl: "1", notify_manager: 1, notify_hr: true };

test("offboarding progress counts approvals and checklist steps", () => {
  assert.deepEqual(offboardingProgress({}), { approvals: 0, tasks: 0, approvalsReady: false, completed: false, percent: 0 });
  const partial = offboardingProgress({ ...allApprovals, assets: "1", kt: "0" });
  assert.equal(partial.approvalsReady, true);
  assert.equal(partial.tasks, 1);
  assert.equal(partial.percent, 44);
  assert.equal(offboardingProgress({ ...allApprovals, ...allTasks }).completed, true);
});

test("open offboarding cases skip completed and deleted records and match employees by email", () => {
  const cases = openOffboardingCases(
    [
      { id: "a", name: "Ravi@x.com", ...allApprovals, assets: "1" },
      { id: "b", name: "done@x.com", ...allApprovals, ...allTasks },
      { id: "c", name: "nomatch@x.com", notice_period: "30" },
      { id: "d", name: "gone@x.com", deleted: "1" },
    ],
    [{ id: "e1", email1: "ravi@x.com", first_name: "Ravi", last_name: "Kumar", designation: "Engineer" }],
  );
  assert.deepEqual(cases.map((item) => item.id), ["c", "a"]);
  assert.equal(cases[1].name, "Ravi Kumar");
  assert.equal(cases[1].employeeId, "e1");
  assert.equal(cases[0].name, "nomatch@x.com");
  assert.equal(cases[0].noticePeriod, "30");
});

test("countByLabel sorts and folds the tail into Other", () => {
  const records = ["A", "A", "A", "B", "B", "C", "D", ""].map((stage) => ({ stage }));
  assert.deepEqual(countByLabel(records, (record) => record.stage, 3), [
    { label: "A", count: 3 },
    { label: "B", count: 2 },
    { label: "Other", count: 3 },
  ]);
  assert.equal(countByLabel(records, (record) => record.stage, 10).find((item) => item.label === "Unassigned").count, 1);
});

test("initialsOf handles names and emails", () => {
  assert.equal(initialsOf("Ravi Kumar"), "RK");
  assert.equal(initialsOf("neha.gupta@x.com"), "NG");
  assert.equal(initialsOf(""), "?");
});
