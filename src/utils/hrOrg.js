// Shapes the hierarchy responses (`roles`, `org_tree`, `reporting_tree`, `me`) into trees the org
// screens can render. Field names follow the backend plan; the fallbacks cover the spellings
// the generic gateway uses for the same values.

const text = (value) => String(value ?? "").trim();
const list = (value) => (Array.isArray(value) ? value : []);

export const personId = (person) => text(person?.id ?? person?.employee_id);

export function personName(person) {
  if (!person) return "";
  if (typeof person === "string") return text(person);
  const full = [person.first_name, person.last_name].map(text).filter(Boolean).join(" ");
  return text(person.name ?? person.full_name ?? person.employee_name) || full || text(person.email) || "Unnamed";
}

// A related value may come as a name or as a { id, name } record.
const nameOf = (value) => (value && typeof value === "object" ? text(value.name) : text(value));

export const personTitle = (person) =>
  nameOf(person?.current_designation ?? person?.designation ?? person?.job_role ?? person?.role_name);

export const initials = (name) =>
  text(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

// One colour per role_category. Each one is a theme token; the label always shows beside it.
export const ROLE_CATEGORIES = {
  employee: { label: "Employee", dot: "bg-muted-foreground" },
  team_lead: { label: "Team lead", dot: "bg-[var(--employee-blue)]" },
  manager: { label: "Manager", dot: "bg-[var(--employee-green)]" },
  department_head: { label: "Department head", dot: "bg-[var(--employee-orange)]" },
  hr: { label: "HR", dot: "bg-primary" },
  executive: { label: "Executive", dot: "bg-[var(--employee-yellow)]" },
  admin: { label: "Admin", dot: "bg-destructive" },
};

export function roleCategory(value) {
  const key = text(value).toLowerCase().replace(/[\s-]+/g, "_");
  return ROLE_CATEGORIES[key] ? { key, ...ROLE_CATEGORIES[key] } : null;
}

const roleNode = (role) => ({
  ...role,
  id: text(role.id),
  name: text(role.name) || "Untitled role",
  level: Number(role.role_level) || 0,
  category: text(role.role_category).toLowerCase(),
  parentId: text(role.parent_role_id),
  accessMembers: Number(role.access_members) || 0,
  jobMembers: Number(role.job_members) || 0,
  children: [],
});

const bySeniority = (a, b) => b.level - a.level || a.name.localeCompare(b.name);

/**
 * The role ladder: a top-down tree from parent_role_id, siblings by role_level (senior first).
 * Roles whose parent is missing, and any caught in a parent loop, go in `unlinked`.
 */
export function buildRoleTree(roles) {
  const nodes = list(roles).filter((role) => text(role?.id)).map(roleNode);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];
  const unlinked = [];
  for (const node of nodes) {
    if (!node.parentId) roots.push(node);
    else if (byId.has(node.parentId) && node.parentId !== node.id) byId.get(node.parentId).children.push(node);
    else unlinked.push(node);
  }
  const reached = new Set();
  const walk = (node) => {
    reached.add(node.id);
    node.children.sort(bySeniority);
    node.children.forEach(walk);
  };
  roots.sort(bySeniority).forEach(walk);
  unlinked.sort(bySeniority).forEach(walk);
  for (const node of nodes) {
    if (reached.has(node.id)) continue;
    // Part of a parent loop: show it once, flat, so the tree can't recurse forever.
    node.children = [];
    reached.add(node.id);
    unlinked.push(node);
  }
  return { roots, unlinked };
}

const pickPerson = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value && typeof value === "object") return value;
    if (text(value)) return { name: text(value), id: text(source[`${key}_id`] ?? source[`${key}_employee_id`]) };
  }
  return null;
};

// The lead is also listed in `members`; show them once, as the lead.
const people = (source, lead, keys = ["members", "employees"]) => {
  const leadId = personId(lead);
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return leadId ? source[key].filter((person) => personId(person) !== leadId) : source[key];
  }
  return [];
};

// `member_count` includes people in child teams, so it can be more than `members`.
const memberCount = (source) => (text(source?.member_count) && Number.isFinite(Number(source.member_count)) ? Number(source.member_count) : null);

function teamNode(team) {
  const lead = pickPerson(team, ["lead", "team_lead", "team_lead_name"]);
  return {
    id: `team:${text(team.id) || text(team.name)}`,
    kind: "team",
    name: text(team.name) || "Unnamed team",
    lead,
    people: people(team, lead),
    memberCount: memberCount(team),
    children: [],
  };
}

function departmentNode(department) {
  const lead = pickPerson(department, ["head", "manager", "department_head", "manager_name"]);
  return {
    id: `department:${text(department.id) || text(department.name)}`,
    kind: "department",
    name: text(department.name) || "Unnamed department",
    lead,
    people: people(department, lead),
    memberCount: memberCount(department),
    children: list(department.teams).map(teamNode),
  };
}

function branchNode(branch) {
  return {
    id: `branch:${text(branch.id) || text(branch.name)}`,
    kind: "branch",
    name: text(branch.name) || "Unnamed branch",
    lead: null,
    people: people(branch),
    memberCount: memberCount(branch),
    children: list(branch.departments).map(departmentNode),
  };
}

/** Branch → department (head) → team (lead, members), plus the unassigned buckets at the end. */
export function buildOrgTree(response) {
  // `org_tree` returns everything inside `tree`.
  const data = (response?.tree && !Array.isArray(response.tree) ? response.tree : response) || {};
  const nodes = list(data.branches).map(branchNode);
  const bucket = (id, name, children, peopleList = []) =>
    children.length || peopleList.length ? [{ id, kind: "group", name, lead: null, people: peopleList, memberCount: null, children }] : [];
  nodes.push(
    ...bucket("group:departments", "Departments without a branch", list(data.departments_without_branch).map(departmentNode)),
    ...bucket("group:teams", "Teams without a department", list(data.teams_without_department).map(teamNode)),
    ...bucket("group:unassigned", "Not assigned to a team", [], list(data.unassigned_employees)),
  );
  return { nodes, totals: data.totals && typeof data.totals === "object" ? data.totals : {} };
}

const matches = (query) => (value) => text(value).toLowerCase().includes(query);

/**
 * Keeps nodes whose name, lead or people match the search, plus the path down to them.
 * A matching node keeps all of its contents.
 */
export function filterOrgTree(nodes, search) {
  const query = text(search).toLowerCase();
  if (!query) return nodes;
  const hit = matches(query);
  return list(nodes).flatMap((node) => {
    const own = hit(node.name) || hit(personName(node.lead)) || node.people.some((person) => hit(personName(person)) || hit(personTitle(person)));
    if (own) return [node];
    const children = filterOrgTree(node.children, query);
    return children.length ? [{ ...node, children }] : [];
  });
}

/** Ids of every node in the tree, for "expand all". */
export const allNodeIds = (nodes) => list(nodes).flatMap((node) => [node.id, ...allNodeIds(node.children)]);

/** Reporting lines: manager → reports, nested through reports[]. */
export function buildReportingTree(response) {
  const roots = Array.isArray(response) ? response : list(response?.tree ?? response?.roots ?? response?.reports);
  const seen = new Set();
  const visit = (person) => {
    const id = personId(person) || personName(person);
    if (seen.has(id)) return null;
    seen.add(id);
    return { ...person, id, reports: list(person.reports).map(visit).filter(Boolean) };
  };
  return roots.map(visit).filter(Boolean);
}

/** Ids from the root down to (and including) the person, or [] when they're not in the tree. */
export function pathToPerson(nodes, id) {
  const target = text(id);
  if (!target) return [];
  for (const node of list(nodes)) {
    if (node.id === target) return [node.id];
    const below = pathToPerson(node.reports, target);
    if (below.length) return [node.id, ...below];
  }
  return [];
}

export const countReports = (node) => list(node?.reports).reduce((sum, child) => sum + 1 + countReports(child), 0);

/**
 * Departments the user can open on the department dashboard, the ones they head first. With
 * employees read "all" that is every department (`lookups`); otherwise their own (`me.employee`).
 */
export function departmentChoices({ me, lookups, everyone = false } = {}) {
  const selfId = personId(me?.employee);
  const byId = new Map();
  for (const department of list(everyone ? lookups?.departments : me?.employee?.departments)) {
    const id = text(department?.id);
    if (!id || byId.has(id)) continue;
    const heads = department.membership === "head" || Boolean(selfId && text(department.manager_employee_id) === selfId);
    byId.set(id, { id, name: text(department.name) || "Unnamed department", heads });
  }
  return [...byId.values()].sort((a, b) => Number(b.heads) - Number(a.heads) || a.name.localeCompare(b.name));
}

const findNode = (nodes, id) => {
  for (const node of list(nodes)) {
    if (node.id === id) return node;
    const below = findNode(node.children, id);
    if (below) return below;
  }
  return null;
};

/** One department from `buildOrgTree` nodes: its head, its teams (lead, people, size) and the members outside any team. */
export function departmentBreakdown(nodes, departmentId) {
  const department = text(departmentId) ? findNode(nodes, `department:${text(departmentId)}`) : null;
  if (!department) return null;
  return {
    name: department.name,
    head: department.lead,
    teams: department.children.map((team) => ({
      id: team.id,
      name: team.name,
      lead: team.lead,
      people: team.people,
      size: new Set([personId(team.lead), ...team.people.map(personId)].filter(Boolean)).size,
    })),
    outsideTeams: department.people,
  };
}

// `me` lists teams, departments, branches and job roles as arrays: "Frontend, Design".
const namesOf = (items) => list(items).map(nameOf).filter(Boolean).join(", ");

// "2026-02-12" or "2026-02-12 04:46:20" → "02-12-2026"; anything else is shown as sent.
const toMonthDayYear = (value) => {
  const date = text(value);
  const parts = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return parts ? `${parts[2]}-${parts[3]}-${parts[1]}` : date;
};

// "full_time" → "Full Time"
const titleCase = (value) => text(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Where the user sits, from `me`: employment type, team, department, branch, job role, manager, reports, tenure. */
export function placeFromMe(me) {
  const employee = me?.employee ?? {};
  const role = me?.access_role ?? employee.access_role ?? {};
  const level = Number(role.role_level ?? employee.role_level);
  const reportsCount = Number(employee.direct_reports_count);
  return {
    id: personId(employee),
    name: personName(employee),
    designation: personTitle(employee),
    accessRole: {
      id: text(role.id ?? employee.access_role_id),
      name: text(role.name ?? employee.access_role_name),
      level: Number.isFinite(level) && level > 0 ? level : null,
      category: roleCategory(role.role_category ?? employee.role_category),
    },
    employmentType: titleCase(employee.employment_type),
    jobRole: namesOf(employee.job_roles) ||nameOf(employee.job_role ?? employee.job_role_name),
    team: namesOf(employee.teams) || nameOf(employee.team ?? employee.team_name),
    department: namesOf(employee.departments) || nameOf(employee.department ?? employee.department_name),
    branch: namesOf(employee.branches) || nameOf(employee.branch ?? employee.branch_name),
    // `reporting_chain` starts with the person the user reports to directly.
    manager: employee.manager ?? list(me?.reporting_chain)[0] ?? null,
    directReports: list(me?.direct_reports),
    directReportsCount: text(employee.direct_reports_count) && Number.isFinite(reportsCount) ? reportsCount : list(me?.direct_reports).length,
    joinedOn: toMonthDayYear(employee.joining_date ?? me?.tenure?.joined_on),
    tenure: formatTenure(me?.tenure),
  };
}

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "2 years 3 months", from a tenure object or the backend's own text. */
export function formatTenure(tenure) {
  if (!tenure) return "";
  if (typeof tenure === "string") return tenure;
  if (text(tenure.label ?? tenure.text)) return text(tenure.label ?? tenure.text);
  const years = Number(tenure.years) || 0;
  const months = Number(tenure.months) || 0;
  const days = Number(tenure.days) || 0;
  const parts = [years && plural(years, "year"), months && plural(months, "month")].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return days ? plural(days, "day") : "Joined recently";
}

// Teams and departments the employee is linked to as a member. A lead or head is set on the
// team or department itself, and a department reached only through a team has no link.
const memberIds = (rows, ownerRole) =>
  list(rows).filter((row) => row?.membership !== ownerRole).map((row) => text(row?.id)).filter(Boolean);

/** The move form's starting values from the `employee` record ("" = none). */
export function placementOf(employee) {
  return {
    managerId: text(employee?.reporting_person_id),
    designation: text(employee?.current_designation ?? employee?.designation),
    teamId: memberIds(employee?.teams, "lead")[0] ?? "",
    departmentId: memberIds(employee?.departments, "head")[0] ?? "",
    jobRoleId: list(employee?.job_roles).map((role) => text(role?.id)).find(Boolean) ?? "",
  };
}

const ASSIGN_FIELDS = [
  ["managerId", "reporting_person_id"],
  ["designation", "current_designation"],
  ["teamId", "team_id"],
  ["departmentId", "department_id"],
  ["jobRoleId", "job_role_id"],
];

/**
 * The `assign` fields that move one employee to `next` (same keys as placementOf); only what
 * changed. `assign` replaces every team, department or job role link with the one sent, and ""
 * clears it, so someone in two teams ends up in the one chosen.
 */
export function assignChanges(employee, next) {
  const before = placementOf(employee);
  const teamCount = memberIds(employee?.teams, "lead").length;
  const changes = {};
  for (const [key, field] of ASSIGN_FIELDS) {
    const wanted = text(next?.[key]);
    if (wanted !== before[key] || (key === "teamId" && teamCount > 1)) changes[field] = wanted;
  }
  return changes;
}

/* ── org structure board ───────────────────────────────────────────────── */

const card = (person) => (person && typeof person === "object" && personId(person) ? { ...person, id: personId(person) } : null);
const cards = (people, skip = new Set()) => {
  const seen = new Set(skip);
  return list(people).map(card).filter((person) => person && !seen.has(person.id) && seen.add(person.id));
};

/**
 * `org_tree` as an editable board: departments (each once, even under two branches) with their
 * head, teams (lead plus members) and the members outside any team; teams with no department;
 * and people in no team or department. A lead shows only as the lead.
 */
export function buildStructure(response) {
  const data = (response?.tree && !Array.isArray(response.tree) ? response.tree : response) || {};
  const team = (raw) => {
    const lead = card(raw?.lead);
    return { id: text(raw?.id), name: text(raw?.name) || "Unnamed team", lead, members: cards(raw?.members, new Set(lead ? [lead.id] : [])) };
  };
  const departments = new Map();
  const addDepartment = (raw, branchId) => {
    const id = text(raw?.id);
    if (!id) return;
    if (departments.has(id)) {
      if (branchId && !departments.get(id).branchId) departments.get(id).branchId = branchId;
      return;
    }
    const head = card(raw?.head);
    departments.set(id, {
      id,
      name: text(raw?.name) || "Unnamed department",
      branchId: branchId || "",
      head,
      teams: list(raw?.teams).map(team).filter((item) => item.id),
      members: cards(raw?.members, new Set(head ? [head.id] : [])),
    });
  };
  list(data.branches).forEach((branch) => list(branch?.departments).forEach((department) => addDepartment(department, text(branch?.id))));
  list(data.departments_without_branch).forEach((department) => addDepartment(department, ""));
  return {
    departments: [...departments.values()],
    looseTeams: list(data.teams_without_department).map(team).filter((item) => item.id),
    unassigned: cards(data.unassigned_employees),
  };
}

/** Where a drop zone puts people: "team:<id>", "department:<id>" (no team) or "none". */
export function zoneTarget(structure, zoneId) {
  const [kind, id = ""] = text(zoneId).split(":");
  if (kind === "team") {
    const owner = structure.departments.find((department) => department.teams.some((item) => item.id === id));
    return { team_id: id, department_id: owner ? owner.id : "" };
  }
  if (kind === "department") return { team_id: "", department_id: id };
  return { team_id: "", department_id: "" };
}

const withoutPerson = (people, id) => people.filter((person) => person.id !== id);

/**
 * The board after moving one person to a drop zone, as `assign` will leave it: out of every
 * team and department list (not lead or head roles) and into the target.
 */
export function movePerson(structure, person, zoneId) {
  const id = personId(person);
  const target = text(zoneId);
  const addTo = (people, zone) => (zone === target ? [...withoutPerson(people, id), person] : withoutPerson(people, id));
  const moveTeam = (item) => ({ ...item, members: item.lead?.id === id ? item.members : addTo(item.members, `team:${item.id}`) });
  return {
    departments: structure.departments.map((department) => ({
      ...department,
      teams: department.teams.map(moveTeam),
      members: department.head?.id === id ? department.members : addTo(department.members, `department:${department.id}`),
    })),
    looseTeams: structure.looseTeams.map(moveTeam),
    unassigned: addTo(structure.unassigned, "none"),
  };
}

/** The board after moving a team under another department ("" = no department). */
export function moveTeamTo(structure, teamId, departmentId) {
  const moving = [...structure.looseTeams, ...structure.departments.flatMap((department) => department.teams)].find((item) => item.id === teamId);
  if (!moving) return structure;
  const others = (teams) => teams.filter((item) => item.id !== teamId);
  return {
    ...structure,
    departments: structure.departments.map((department) => ({
      ...department,
      teams: department.id === departmentId ? [...others(department.teams), moving] : others(department.teams),
    })),
    looseTeams: departmentId ? others(structure.looseTeams) : [...others(structure.looseTeams), moving],
  };
}
