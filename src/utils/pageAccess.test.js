import test from "node:test";
import assert from "node:assert/strict";
import { filterAdminNavigation, isAdminPage, selectIsAdmin } from "./pageAccess.js";
import { sidebarDestination } from "./sidebarNavigation.js";

test("only authenticated admins receive admin access", () => {
  for (const status of [null, undefined, "employee", "candidate", "Admin", "Joining Confirmed"]) {
    assert.equal(selectIsAdmin({ user: { isAuthenticated: true, userInfo: { status } } }), false);
  }
  assert.equal(selectIsAdmin({ user: { isAuthenticated: true, userInfo: { status: "admin" } } }), true);
  assert.equal(selectIsAdmin({ user: { isAuthenticated: false, userInfo: { status: "admin" } } }), false);
  assert.equal(selectIsAdmin({ user: {} }), false);
});

test("protects direct and generic module routes", () => {
  for (const path of ["/employees", "/salaries/", "/EMPLOYEES", "/salaries?view=list", "/%65mployees", "/entity/hrc_employees/view", "/entity/hrc_salaries/create", "/entity/hrc_employees/person/edit", "/entity/hrc_salaries/list/table"]) {
    assert.equal(isAdminPage(path), true, path);
  }
  for (const path of ["/", "/profile", "/attendance", "/candidates", "/interviews", "/interviews/", "/INTERVIEWS", "/interviews?view=list", "/interviews-other", "/entity/hrc_interviews/create", "/entity/hrc_interviews/list/table", "/entity/hrc_candidates/view", null]) {
    assert.equal(isAdminPage(path), false, String(path));
  }
});

test("hides admin destinations and empty groups without changing source layout", () => {
  const groups = [
    { id: "mixed", data: [{ name: "Employees" }, { name: "Interviews", navigation: "/interviews" }, { name: "Profile" }] },
    { id: "admin", data: [{ module_name: "hrc_employees" }, { navigation: "entity/hrc_salaries/view" }] },
  ];
  assert.deepEqual(filterAdminNavigation(groups, false), [{ id: "mixed", data: [{ name: "Interviews", navigation: "/interviews" }, { name: "Profile" }] }]);
  assert.equal(filterAdminNavigation(groups, true), groups);
  assert.equal(groups[0].data.length, 3);
});

test("Interview uses the response navigation and remains visible to non-admin users", () => {
  const interview = { name: "Interview", module_name: "hrc_candidates", navigation: "/interviews", visible: true };
  const groups = [{ id: "recruitment", data: [interview] }];
  assert.equal(sidebarDestination(interview), "/interviews");
  assert.deepEqual(filterAdminNavigation(groups, false), groups);
  assert.equal(sidebarDestination({ ...interview, navigation: "/entity/hrc_candidates/view" }), "/entity/hrc_candidates/view");
  assert.equal(sidebarDestination({ name: "Interviews", module_name: "hrc_interviews", navigation: "/entity/hrc_interviews/view" }), "/entity/hrc_interviews/view");
});

test("system alerts route and module navigation are admin only", () => {
  assert.equal(isAdminPage("/system-alerts"), true);
  assert.equal(isAdminPage("/system-alerts?response=yes"), true);
  const groups = [{ data: [
    { name: "System alerts" },
    { module_name: "hrc_employee_response" },
    { module_name: "hrc_system_alert" },
    { navigation: "/system-alerts" },
  ] }];
  assert.deepEqual(filterAdminNavigation(groups, false), []);
  assert.equal(filterAdminNavigation(groups, true), groups);
});

test("increment management and its three modules are admin only while employee requests remain available", () => {
  assert.equal(isAdminPage("/increment-management"), true);
  assert.equal(isAdminPage("/increment-request"), false);
  const items = ["hrc_increment", "hrc_increment_questions", "hrc_increment_replies"].map((module_name) => ({ module_name }));
  for (const item of items) {
    assert.equal(sidebarDestination(item), "/increment-management");
    assert.equal(isAdminPage(`/entity/${item.module_name}/view`), true);
  }
  const employeeLink = { name: "Increment request", module_name: "hrc_increment", navigation: "/increment-request" };
  assert.equal(sidebarDestination(employeeLink), "/increment-request");
  assert.deepEqual(filterAdminNavigation([{ data: [...items, employeeLink] }], false), [{ data: [employeeLink] }]);
});
