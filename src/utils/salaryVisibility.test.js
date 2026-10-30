import test from "node:test";
import assert from "node:assert/strict";
import { createSalaryVisibility, requestSalaryAccess } from "./salaryVisibility.js";

test("show-all starts hidden and tells subscribers when it changes", () => {
  const store = createSalaryVisibility();
  let calls = 0;
  const stop = store.subscribe(() => { calls += 1; });
  assert.equal(store.getShowAll(), false);
  store.setShowAll(true);
  assert.equal(store.getShowAll(), true);
  stop();
  store.setShowAll(false);
  assert.equal(store.getShowAll(), false);
  assert.equal(calls, 1);
});

test("access is allowed until a password check is added", async () => {
  assert.equal(await requestSalaryAccess(), true);
});
