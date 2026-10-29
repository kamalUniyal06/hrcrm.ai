import test from "node:test";
import assert from "node:assert/strict";
import {
  allNodeIds,
  assignChanges,
  buildOrgTree,
  buildReportingTree,
  buildRoleTree,
  buildStructure,
  countReports,
  departmentBreakdown,
  departmentChoices,
  filterOrgTree,
  formatTenure,
  initials,
  movePerson,
  moveTeamTo,
  pathToPerson,
  personName,
  personTitle,
  placementOf,
  placeFromMe,
  roleCategory,
  zoneTarget,
} from "./hrOrg.js";

test("names people from whichever name fields are present", () => {
  assert.equal(personName({ name: "Asha Rao" }), "Asha Rao");
  assert.equal(personName({ first_name: "Asha", last_name: "Rao" }), "Asha Rao");
  assert.equal(personName({ email: "asha@example.com" }), "asha@example.com");
  assert.equal(personName({}), "Unnamed");
  assert.equal(personName(null), "");
  assert.equal(initials("asha  rao kumar"), "AR");
  assert.equal(initials(""), "?");
});

test("maps role categories and ignores unknown ones", () => {
  assert.equal(roleCategory("Team Lead").key, "team_lead");
  assert.equal(roleCategory("department-head").label, "Department head");
  assert.equal(roleCategory("intern"), null);
});

test("builds the role ladder top-down, senior siblings first", () => {
  const { roots, unlinked } = buildRoleTree([
    { id: "ceo", name: "CEO", role_level: 100 },
    { id: "eng", name: "Engineer", role_level: 10, parent_role_id: "lead" },
    { id: "lead", name: "Team lead", role_level: 30, parent_role_id: "ceo" },
    { id: "hr", name: "HR", role_level: 50, parent_role_id: "ceo", access_members: "3" },
    { id: "ghost", name: "Orphan", role_level: 5, parent_role_id: "deleted" },
    { name: "No id" },
  ]);
  assert.deepEqual(roots.map((role) => role.id), ["ceo"]);
  assert.deepEqual(roots[0].children.map((role) => role.id), ["hr", "lead"]);
  assert.deepEqual(roots[0].children[1].children.map((role) => role.id), ["eng"]);
  assert.equal(roots[0].children[0].accessMembers, 3);
  assert.deepEqual(unlinked.map((role) => role.id), ["ghost"]);
});

test("puts roles caught in a parent loop in the unlinked group once", () => {
  const { roots, unlinked } = buildRoleTree([
    { id: "a", name: "A", parent_role_id: "b" },
    { id: "b", name: "B", parent_role_id: "a" },
    { id: "self", name: "Self", parent_role_id: "self" },
  ]);
  assert.equal(roots.length, 0);
  assert.deepEqual(unlinked.map((role) => role.id).sort(), ["a", "b", "self"]);
  assert.ok(unlinked.every((role) => role.children.length === 0));
});

const orgResponse = {
  branches: [
    {
      id: "b1",
      name: "Delhi",
      departments: [
        {
          id: "d1",
          name: "Engineering",
          head: { id: "e1", name: "Meera" },
          teams: [{ id: "t1", name: "Platform", team_lead: { id: "e2", name: "Ravi" }, members: [{ id: "e3", name: "Kiran", designation: "Developer" }] }],
        },
      ],
    },
  ],
  departments_without_branch: [{ id: "d2", name: "Finance", manager_name: "Sana", teams: [] }],
  teams_without_department: [],
  unassigned_employees: [{ id: "e9", name: "New joiner" }],
  totals: { employees: 6 },
};

test("builds the org chart with its unassigned buckets", () => {
  const { nodes, totals } = buildOrgTree(orgResponse);
  assert.deepEqual(nodes.map((node) => node.id), ["branch:b1", "group:departments", "group:unassigned"]);
  const team = nodes[0].children[0].children[0];
  assert.equal(nodes[0].children[0].lead.name, "Meera");
  assert.equal(team.lead.name, "Ravi");
  assert.equal(team.people.length, 1);
  assert.equal(nodes[1].children[0].lead.name, "Sana");
  assert.equal(nodes[2].people[0].name, "New joiner");
  assert.equal(totals.employees, 6);
  assert.deepEqual(buildOrgTree(null), { nodes: [], totals: {} });
});

test("reads the live org_tree response from inside `tree`", () => {
  const kamal = { id: "k1", name: "Kamal Uniyal" };
  const { nodes, totals } = buildOrgTree({
    tree: {
      branches: [
        {
          id: "b1",
          name: "Noida Sector 63",
          departments: [
            {
              id: "d1",
              name: "Engineering",
              head: { id: "v1", name: "Vikas Gangwar", designation: "Engineering Manager" },
              teams: [{ id: "t1", name: "Frontend", lead: kamal, members: [kamal, { id: "g1", name: "Gagan Kumar" }], member_count: 2 }],
              members: [],
              member_count: 9,
            },
          ],
        },
      ],
      departments_without_branch: [],
      teams_without_department: [],
      unassigned_employees: [{ id: "u1", name: "Vipin Yadav" }],
      totals: { employees: 50, branches: 1, departments: 4, teams: 5 },
    },
  });
  assert.deepEqual(nodes.map((node) => node.id), ["branch:b1", "group:unassigned"]);
  const department = nodes[0].children[0];
  assert.equal(department.lead.name, "Vikas Gangwar");
  assert.equal(department.memberCount, 9);
  const team = department.children[0];
  assert.equal(team.lead.name, "Kamal Uniyal");
  // The lead shows once, as the lead, not again among the members.
  assert.deepEqual(team.people.map((person) => person.name), ["Gagan Kumar"]);
  assert.equal(nodes[0].memberCount, null);
  assert.equal(totals.teams, 5);
});

test("search keeps matching nodes and the path down to them", () => {
  const { nodes } = buildOrgTree(orgResponse);
  const byPerson = filterOrgTree(nodes, "kiran");
  assert.equal(byPerson.length, 1);
  assert.equal(byPerson[0].children[0].children[0].name, "Platform");
  assert.equal(filterOrgTree(nodes, "developer")[0].id, "branch:b1");
  assert.equal(filterOrgTree(nodes, "finance")[0].id, "group:departments");
  assert.deepEqual(filterOrgTree(nodes, "nobody"), []);
  assert.equal(filterOrgTree(nodes, "  "), nodes);
  assert.deepEqual(allNodeIds(nodes).slice(0, 3), ["branch:b1", "department:d1", "team:t1"]);
});

test("nests reporting lines and finds the path to a person", () => {
  const tree = buildReportingTree({
    tree: [{ id: 1, name: "CEO", reports: [{ id: 2, name: "VP", reports: [{ id: 3, name: "Dev" }] }, { id: 4, name: "CFO" }] }],
  });
  assert.deepEqual(pathToPerson(tree, "3"), ["1", "2", "3"]);
  assert.deepEqual(pathToPerson(tree, "99"), []);
  assert.equal(countReports(tree[0]), 3);
  assert.equal(buildReportingTree([{ id: 1, name: "Solo" }]).length, 1);
});

test("drops a person who appears twice so a loop can't recurse", () => {
  const tree = buildReportingTree([{ id: 1, name: "A", reports: [{ id: 1, name: "A again" }] }]);
  assert.equal(tree[0].reports.length, 0);
});

test("formats tenure from an object or the backend's text", () => {
  assert.equal(formatTenure({ years: 2, months: 3 }), "2 years 3 months");
  assert.equal(formatTenure({ years: 1, months: 0 }), "1 year");
  assert.equal(formatTenure({ days: 12 }), "12 days");
  assert.equal(formatTenure({}), "Joined recently");
  assert.equal(formatTenure({ label: "3 yrs" }), "3 yrs");
  assert.equal(formatTenure("4 months"), "4 months");
  assert.equal(formatTenure(null), "");
});

test("reads the user's place in the organisation from me", () => {
  const place = placeFromMe({
    employee: {
      id: "e3",
      name: "Kiran",
      current_designation: "Developer",
      access_role: { id: "r1", name: "Staff", role_level: "10", role_category: "employee" },
      job_role: { id: "j1", name: "Backend engineer" },
      team_name: "Platform",
      department: { name: "Engineering" },
      branch_name: "Delhi",
    },
    reporting_chain: [{ name: "Ravi" }, { name: "Meera" }],
    direct_reports: [{ name: "Intern" }],
    tenure: { years: 1, months: 2 },
  });
  assert.equal(place.designation, "Developer");
  assert.deepEqual({ ...place.accessRole, category: place.accessRole.category.key }, { id: "r1", name: "Staff", level: 10, category: "employee" });
  assert.equal(place.jobRole, "Backend engineer");
  assert.equal(place.team, "Platform");
  assert.equal(place.department, "Engineering");
  assert.equal(place.branch, "Delhi");
  assert.equal(personName(place.manager), "Ravi");
  assert.equal(place.directReports.length, 1);
  assert.equal(place.tenure, "1 year 2 months");
  assert.equal(personTitle({ job_role: { name: "QA" } }), "QA");
});

test("reads the arrays and manager the live me response sends", () => {
  const place = placeFromMe({
    employee: {
      employment_type: "full_time",
      joining_date: "2026-02-12",
      teams: [{ id: "t1", name: "Frontend", membership: "member" }],
      departments: [{ id: "d1", name: "Engineering", membership: "member" }],
      branches: [{ id: "b1", name: "Noida Sector 63" }],
      job_roles: [{ id: "j1", name: "Junior Developer", role_level: "1" }],
      manager: { id: "m1", name: "Kartikey Sharma" },
      direct_reports_count: 0,
    },
    reporting_chain: [{ id: "x", name: "Someone else" }],
    direct_reports: [{ name: "Ignored when the count is sent" }],
  });
  assert.equal(place.employmentType, "Full Time");
  assert.equal(place.team, "Frontend");
  assert.equal(place.department, "Engineering");
  assert.equal(place.branch, "Noida Sector 63");
  assert.equal(place.jobRole, "Junior Developer");
  assert.equal(personName(place.manager), "Kartikey Sharma");
  assert.equal(place.directReportsCount, 0);
  assert.equal(place.joinedOn, "02-12-2026");
  assert.equal(placeFromMe({ tenure: { joined_on: "2025-01-05 10:00:00" } }).joinedOn, "01-05-2025");
  assert.equal(placeFromMe({ employee: { joining_date: "soon" } }).joinedOn, "soon");
  assert.equal(placeFromMe({ employee: {}, direct_reports: [{}, {}] }).directReportsCount, 2);
});

test("copes with an empty me", () => {
  const place = placeFromMe(undefined);
  assert.equal(place.accessRole.level, null);
  assert.equal(place.accessRole.category, null);
  assert.equal(place.manager, null);
  assert.equal(place.team, "");
});

test("lists the user's own departments, the ones they head first", () => {
  const me = {
    employee: {
      id: "v1",
      departments: [
        { id: "d2", name: "Design", manager_employee_id: "x9", membership: "member" },
        { id: "d1", name: "Engineering", manager_employee_id: "v1", membership: "head" },
        { id: "d1", name: "Engineering", manager_employee_id: "v1", membership: "head" },
        { id: "", name: "No id" },
      ],
    },
  };
  assert.deepEqual(departmentChoices({ me }), [
    { id: "d1", name: "Engineering", heads: true },
    { id: "d2", name: "Design", heads: false },
  ]);
  // With "all" employees access every department is on offer; a head is still spotted by manager id.
  const lookups = { departments: [{ id: "d3", name: "Sales" }, { id: "d1", name: "Engineering", manager_employee_id: "v1" }] };
  assert.deepEqual(departmentChoices({ me, lookups, everyone: true }).map((choice) => [choice.id, choice.heads]), [["d1", true], ["d3", false]]);
  assert.deepEqual(departmentChoices(), []);
});

test("breaks a department down into teams and people outside a team", () => {
  const kamal = { id: "k1", name: "Kamal Uniyal" };
  const { nodes } = buildOrgTree({
    tree: {
      branches: [{ id: "b1", name: "Noida", departments: [] }],
      departments_without_branch: [
        {
          id: "d1",
          name: "Engineering",
          head: { id: "v1", name: "Vikas Gangwar" },
          teams: [
            { id: "t1", name: "Frontend", lead: kamal, members: [kamal, { id: "g1", name: "Gagan Kumar" }] },
            { id: "t2", name: "QA", members: [] },
          ],
          members: [{ id: "a1", name: "Anshik Sharma" }],
        },
      ],
    },
  });
  const department = departmentBreakdown(nodes, "d1");
  assert.equal(department.name, "Engineering");
  assert.equal(department.head.name, "Vikas Gangwar");
  assert.deepEqual(department.teams.map((team) => [team.name, team.lead?.name ?? null, team.size]), [["Frontend", "Kamal Uniyal", 2], ["QA", null, 0]]);
  assert.deepEqual(department.outsideTeams.map((person) => person.name), ["Anshik Sharma"]);
  assert.equal(departmentBreakdown(nodes, "missing"), null);
  assert.equal(departmentBreakdown(nodes, ""), null);
});

const placed = {
  reporting_person_id: "m1",
  current_designation: "Developer",
  teams: [{ id: "t1", membership: "member" }, { id: "t9", membership: "lead" }],
  departments: [{ id: "d9", membership: "head" }, { id: "d1", membership: "member" }],
  job_roles: [{ id: "j1", name: "Frontend" }],
};

test("starts the move form from the employee's current place, skipping teams they lead", () => {
  assert.deepEqual(placementOf(placed), { managerId: "m1", designation: "Developer", teamId: "t1", departmentId: "d1", jobRoleId: "j1" });
  assert.deepEqual(placementOf(null), { managerId: "", designation: "", teamId: "", departmentId: "", jobRoleId: "" });
});

test("sends assign only what changed", () => {
  assert.deepEqual(assignChanges(placed, placementOf(placed)), {});
  assert.deepEqual(assignChanges(placed, { ...placementOf(placed), managerId: "m2", teamId: "t2" }), { reporting_person_id: "m2", team_id: "t2" });
  assert.deepEqual(assignChanges(placed, { ...placementOf(placed), teamId: "", departmentId: "", jobRoleId: "" }), { team_id: "", department_id: "", job_role_id: "" });
  // In two teams: saving sends the team so assign keeps only that one.
  const twoTeams = { ...placed, teams: [{ id: "t1" }, { id: "t2" }] };
  assert.deepEqual(assignChanges(twoTeams, placementOf(twoTeams)), { team_id: "t1" });
});

const kamal = { id: "k1", name: "Kamal" };
const gagan = { id: "g1", name: "Gagan" };
const tree = {
  tree: {
    branches: [
      { id: "b1", departments: [{ id: "d1", name: "Engineering", head: { id: "v1", name: "Vikas" }, teams: [{ id: "t1", name: "Frontend", lead: kamal, members: [kamal, gagan] }], members: [{ id: "a1", name: "Anshik" }] }] },
      { id: "b2", departments: [{ id: "d1", name: "Engineering", teams: [] }] },
    ],
    departments_without_branch: [{ id: "d2", name: "Design", teams: [], members: [] }],
    teams_without_department: [{ id: "t2", name: "QA", members: [] }],
    unassigned_employees: [{ id: "u1", name: "Vipin" }, { id: "u1", name: "Vipin" }],
  },
};

test("builds the editable board once per department, with leads shown only as leads", () => {
  const board = buildStructure(tree);
  assert.deepEqual(board.departments.map((department) => [department.id, department.branchId]), [["d1", "b1"], ["d2", ""]]);
  const frontend = board.departments[0].teams[0];
  assert.equal(frontend.lead.name, "Kamal");
  assert.deepEqual(frontend.members.map((person) => person.id), ["g1"]);
  assert.deepEqual(board.departments[0].members.map((person) => person.id), ["a1"]);
  assert.deepEqual(board.looseTeams.map((item) => item.id), ["t2"]);
  assert.deepEqual(board.unassigned.map((person) => person.id), ["u1"]);
  assert.deepEqual(buildStructure(null), { departments: [], looseTeams: [], unassigned: [] });
});

test("a drop zone tells assign the team and department", () => {
  const board = buildStructure(tree);
  assert.deepEqual(zoneTarget(board, "team:t1"), { team_id: "t1", department_id: "d1" });
  assert.deepEqual(zoneTarget(board, "team:t2"), { team_id: "t2", department_id: "" });
  assert.deepEqual(zoneTarget(board, "department:d2"), { team_id: "", department_id: "d2" });
  assert.deepEqual(zoneTarget(board, "none"), { team_id: "", department_id: "" });
});

test("moves a person on the board the way assign will", () => {
  const board = buildStructure(tree);
  const moved = movePerson(board, gagan, "team:t2");
  assert.deepEqual(moved.departments[0].teams[0].members, []);
  assert.deepEqual(moved.looseTeams[0].members.map((person) => person.id), ["g1"]);
  const out = movePerson(board, { id: "a1", name: "Anshik" }, "none");
  assert.deepEqual(out.departments[0].members, []);
  assert.deepEqual(out.unassigned.map((person) => person.id), ["u1", "a1"]);
  // A lead keeps leading their team.
  assert.equal(movePerson(board, kamal, "department:d2").departments[0].teams[0].lead.id, "k1");
});

test("moves a team between departments", () => {
  const board = buildStructure(tree);
  const moved = moveTeamTo(board, "t2", "d2");
  assert.deepEqual(moved.looseTeams, []);
  assert.deepEqual(moved.departments[1].teams.map((item) => item.id), ["t2"]);
  const back = moveTeamTo(moved, "t1", "");
  assert.deepEqual(back.departments[0].teams, []);
  assert.deepEqual(back.looseTeams.map((item) => item.id), ["t1"]);
  assert.equal(moveTeamTo(board, "missing", "d1"), board);
});
