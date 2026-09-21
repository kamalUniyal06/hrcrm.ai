import test from "node:test";
import assert from "node:assert/strict";
import { filterAdminNavigation, isAdminPage, selectIsAdmin } from "./pageAccess.js";

test("only authenticated admins receive admin access", () => {
  for (const status of [null, undefined, "employee", "candidate", "Admin", "Joining Confirmed"]) {
    assert.equal(selectIsAdmin({ user: { isAuthenticated: true, userInfo: { status } } }), false);
  }
  assert.equal(selectIsAdmin({ user: { isAuthenticated: true, userInfo: { status: "admin" } } }), true);
  assert.equal(selectIsAdmin({ user: { isAuthenticated: false, userInfo: { status: "admin" } } }), false);
  assert.equal(selectIsAdmin({ user: {} }), false);
});

test("protects direct and generic module routes", () => {
  for (const path of ["/employees", "/interviews/", "/EMPLOYEES", "/interviews?view=list", "/%65mployees", "/entity/hrc_employees/view", "/entity/hrc_interviews/create", "/entity/hrc_employees/person/edit", "/entity/hrc_interviews/list/table"]) {
    assert.equal(isAdminPage(path), true, path);
  }
  for (const path of ["/", "/profile", "/attendance", "/candidates", "/interviews-other", "/entity/hrc_candidates/view", null]) {
    assert.equal(isAdminPage(path), false, String(path));
  }
});

test("hides admin destinations and empty groups without changing source layout", () => {
  const groups = [
    { id: "mixed", data: [{ name: "Employees" }, { name: "Interviews" }, { name: "Profile" }] },
    { id: "admin", data: [{ module_name: "hrc_employees" }, { navigation: "entity/hrc_interviews/view" }] },
  ];
  assert.deepEqual(filterAdminNavigation(groups, false), [{ id: "mixed", data: [{ name: "Profile" }] }]);
  assert.equal(filterAdminNavigation(groups, true), groups);
  assert.equal(groups[0].data.length, 3);
});
