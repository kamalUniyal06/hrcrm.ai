import test from "node:test";
import assert from "node:assert/strict";
import { areaScope, can, canAtLeast, hasArea, hierarchyLevel, hrErrorMessage, scopeOf, scopeOptions } from "./hrAccess.js";

const capabilities = {
  employees: { read: "team", update: "own" },
  salary: { read: "own", update: "none", run_payroll: false },
  leaves: { read: { scope: "reports" } },
  notifications: { read: "own", send: true },
};

test("reads each area's scope on its own", () => {
  assert.equal(scopeOf(capabilities, "employees", "read"), "team");
  assert.equal(scopeOf(capabilities, "salary", "read"), "own");
  assert.equal(scopeOf(capabilities, "leaves", "read"), "reports");
  assert.equal(scopeOf(capabilities, "salary", "create"), "none");
  assert.equal(scopeOf(capabilities, "missing", "read"), "none");
  assert.equal(scopeOf({ employees: { read: "ALL " } }, "employees", "read"), "all");
  assert.equal(scopeOf({ employees: { read: "everyone" } }, "employees", "read"), "none");
  assert.equal(scopeOf(null, "employees", "read"), "none");
});

test("compares scopes along none < own < team < reports < dept < all", () => {
  assert.equal(canAtLeast(capabilities, "employees", "read", "own"), true);
  assert.equal(canAtLeast(capabilities, "employees", "read", "team"), true);
  assert.equal(canAtLeast(capabilities, "employees", "read", "reports"), false);
  assert.equal(canAtLeast(capabilities, "salary", "update", "own"), false);
  assert.equal(canAtLeast(capabilities, "employees", "read", "bogus"), false);
});

test("yes/no capabilities accept true or any scope above none", () => {
  assert.equal(can(capabilities, "notifications", "send"), true);
  assert.equal(can(capabilities, "salary", "run_payroll"), false);
  assert.equal(can(capabilities, "salary", "read"), true);
  assert.equal(can(capabilities, "salary", "update"), false);
});

test("finds an area by module name in strings or objects", () => {
  assert.equal(hasArea(["hrc_hr_appointments", "outr_notification"], "hrc_hr_appointments"), true);
  assert.equal(hasArea([{ fetch_from: "HRC_HR_Appointments" }], "hrc_hr_appointments"), true);
  // The shape `me` sends: key is the definition key, source_module the module.
  assert.equal(hasArea([{ ui_module_id: "u1", key: "notifications", source_module: "outr_notification" }], "outr_notification"), true);
  assert.equal(hasArea([{ module: "hrc_salaries" }], "hrc_hr_appointments"), false);
  assert.equal(hasArea(undefined, "hrc_hr_appointments"), false);
  assert.equal(hasArea(["hrc_hr_appointments"], ""), false);
});

test("derives the hierarchy level from the employees read scope", () => {
  const level = (read) => hierarchyLevel({ employees: { read } }).id;
  assert.equal(level("own"), "employee");
  assert.equal(level("team"), "team_lead");
  assert.equal(level("reports"), "manager");
  assert.equal(level("dept"), "department_head");
  assert.equal(level("all"), "hr");
  assert.equal(level("none"), "employee");
  assert.equal(hierarchyLevel({}, { isAdmin: true }).id, "admin");
});

test("gives each error code its own message", () => {
  assert.match(hrErrorMessage(403), /outside your access/);
  assert.match(hrErrorMessage("409"), /Refresh/);
  assert.notEqual(hrErrorMessage(422), hrErrorMessage(404));
  assert.equal(hrErrorMessage(500, "Server said no"), "Server said no");
  assert.match(hrErrorMessage(undefined), /try again/);
});

test("offers people-list scopes from own up to the granted scope, never wider", () => {
  const ids = (caps) => scopeOptions(caps, "employees").map((option) => option.id);
  assert.deepEqual(ids({ employees: { read: "team" } }), ["own", "team"]);
  assert.deepEqual(ids({ employees: { read: "dept" } }), ["own", "team", "reports", "dept"]);
  assert.deepEqual(ids({ employees: { read: "none" } }), []);
  assert.deepEqual(ids(undefined), []);
  assert.equal(scopeOptions({ employees: { read: "team" } }, "employees")[1].label, "My team");
});

test("reads the widest scope an area grants from me.areas", () => {
  const areas = [
    { source_module: "hrc_hr_appointments", read_scope: "own", write_scope: "own" },
    { source_module: "hrc_hr_appointments", read_scope: "all", write_scope: "none" },
    { source_module: "hrc_hr_availability", read_scope: "bogus" },
  ];
  assert.equal(areaScope(areas, "hrc_hr_appointments"), "all");
  assert.equal(areaScope(areas, "HRC_HR_APPOINTMENTS", "write"), "own");
  assert.equal(areaScope(areas, "hrc_hr_availability"), "none");
  assert.equal(areaScope(areas, "outr_notification"), "none");
  assert.equal(areaScope(undefined, "hrc_hr_appointments"), "none");
});
