import test from "node:test";
import assert from "node:assert/strict";
import { groupPolicies, policyData, policyListBody, policySaveBody } from "./policyUtils.js";

test("employees fetch only published policies; admins also get drafts; the server sorts by name", () => {
  assert.deepEqual(policyListBody(), { action: "fetch", module: "hrc_policies", filters: { status: "published" }, order_by: "name", order_dir: "ASC", page: 1, per_page: 100 });
  const admin = policyListBody({ includeDrafts: true, page: 2 });
  assert.equal(Object.hasOwn(admin, "filters"), false);
  assert.equal(admin.page, 2);
});

test("saving creates without an id and updates with one, sending only module fields", () => {
  const values = { name: " Dress code ", category: "Workplace", description: "<p>Smart casual.</p>", status: "published", version: "1.0", effective_date: "2026-11-01", date_modified: "x" };
  assert.deepEqual(policySaveBody(values), { action: "create", module: "hrc_policies", data: { name: "Dress code", category: "Workplace", summary: "", description: "<p>Smart casual.</p>", version: "1.0", effective_date: "2026-11-01", status: "published" } });
  const update = policySaveBody({ ...values, id: "p-1" });
  assert.equal(update.action, "update");
  assert.equal(update.id, "p-1");
  assert.equal(Object.hasOwn(update.data, "date_modified"), false);
});

test("validation matches the backend contract", () => {
  assert.throws(() => policyData({ name: "", description: "<p>x</p>" }), /title/);
  assert.throws(() => policyData({ name: "Empty", description: "<p>&nbsp; </p>" }), /Write the policy/);
  assert.throws(() => policyData({ name: "X", description: "<p>x</p>", effective_date: "01/11/2026" }), /effective date/);
  assert.equal(policyData({ name: "X", description: "<p>x</p>", status: "archived" }).status, "draft");
});

test("employees only see published policies, grouped in handbook order with the server's order inside", () => {
  const records = [
    { id: "4", name: "Attendance", category: "Time & leave", status: "published" },
    { id: "1", name: "Leave policy", category: "Time & leave", status: "published" },
    { id: "3", name: "Bonus plan", category: "Pay", status: "draft" },
    { id: "2", name: "Terms of use", category: "Terms", status: "published" },
  ];
  assert.deepEqual(groupPolicies(records).map(({ category, items }) => [category, items.map((item) => item.id)]), [["Terms", ["2"]], ["Time & leave", ["4", "1"]]]);
  assert.deepEqual(groupPolicies(records, { includeDrafts: true }).map(({ category }) => category), ["Terms", "Time & leave", "Pay"]);
  assert.deepEqual(groupPolicies(records, { search: "leave" }).flatMap(({ items }) => items.map((item) => item.id)), ["4", "1"]);
});
