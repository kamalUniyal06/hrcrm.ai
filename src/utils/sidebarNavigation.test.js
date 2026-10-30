import test from "node:test";
import assert from "node:assert/strict";
import { sidebarDestination, sidebarLabel } from "./sidebarNavigation.js";

test("the resignation menu opens the exit page under any of its names", () => {
  for (const item of [{ name: "Offboarding" }, { name: "Offboarding management" }, { name: "Exit" }, { name: "Employee exit" }, { module_name: "hrc_resignation" }]) {
    assert.equal(sidebarDestination(item), "/exit", JSON.stringify(item));
  }
});

test("the quotations menu opens the quotation alerts page", () => {
  for (const item of [{ name: "Quotation alerts" }, { name: "Quotations" }, { module_name: "hrc_quotations" }]) {
    assert.equal(sidebarDestination(item), "/quotations", JSON.stringify(item));
  }
});

test("menu labels say exit instead of offboarding and leave other names alone", () => {
  assert.equal(sidebarLabel({ name: "Offboarding" }), "Exit");
  assert.equal(sidebarLabel({ name: "Employee offboarding" }), "Employee exit");
  assert.equal(sidebarLabel({ name: "Off-boarding management" }), "Exit management");
  assert.equal(sidebarLabel({ name: "Leave approvals" }), "Leave approvals");
  assert.equal(sidebarLabel({}), "");
});

test("HR installer areas without a navigation value open their own screens", () => {
  assert.equal(sidebarDestination({ name: "Notifications", fetch_from: "outr_notification" }), "/notifications");
  assert.equal(sidebarDestination({ name: "HR Appointments", fetch_from: "hrc_hr_appointments" }), "/hr-appointments");
  assert.equal(sidebarDestination({ name: "HR Availability", fetch_from: "hrc_hr_availability" }), "/hr-appointments/availability");
  assert.equal(sidebarDestination({ name: "Career timeline", fetch_from: "hrc_employee_timeline" }), "/profile");
  assert.equal(sidebarDestination({ name: "Salary structures", fetch_from: "hrc_salary_structures" }), "/salaries");
  assert.equal(sidebarDestination({ name: "Leave ledger", module_name: "hrc_leave_transaction" }), "/my-leaves");
  // An explicit navigation value still wins, and unmapped modules keep the generic view.
  assert.equal(sidebarDestination({ name: "Inbox", fetch_from: "outr_notification", navigation: "inbox" }), "/inbox");
  assert.equal(sidebarDestination({ name: "Branches", fetch_from: "hrc_branches" }), "/entity/hrc_branches/view");
});
