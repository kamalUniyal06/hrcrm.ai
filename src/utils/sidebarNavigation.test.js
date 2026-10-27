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
