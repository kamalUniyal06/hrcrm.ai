// Who-can-see-what helpers for the HR actions. The backend decides access from the caller's role and
// its per-area scopes; `me` reports them as `areas` and `capabilities`. Screens gate on these, never on
// the role's name or category, because an admin can give any role any scope.

export const SCOPE_RANK = { none: 0, own: 1, team: 2, reports: 3, dept: 4, all: 5 };

// Labels from the backend list `rightee_access_scope_list`.
export const SCOPE_LABELS = {
  none: "None",
  own: "Own records",
  team: "My team",
  reports: "My reportees",
  dept: "My department",
  all: "Everyone",
};

const asScope = (value) => {
  const scope = String(value ?? "").trim().toLowerCase();
  return scope in SCOPE_RANK ? scope : null;
};

/** The scope string for one area and action, e.g. scopeOf(caps, "salary", "update") → "reports". */
export function scopeOf(capabilities, area, action) {
  const value = capabilities?.[area]?.[action];
  if (value && typeof value === "object") return asScope(value.scope) || "none";
  return asScope(value) || (value === true ? "all" : "none");
}

/** True when the area's scope for that action reaches at least `min`. */
export function canAtLeast(capabilities, area, action, min) {
  return SCOPE_RANK[scopeOf(capabilities, area, action)] >= (SCOPE_RANK[min] ?? Infinity);
}

/**
 * Scope choices for a people list, from "own" up to what the area grants for that action,
 * e.g. [{ id: "own", label: "Own records" }, { id: "team", label: "My team" }]. Never wider than granted.
 */
export function scopeOptions(capabilities, area, action = "read") {
  const granted = SCOPE_RANK[scopeOf(capabilities, area, action)];
  return Object.keys(SCOPE_RANK)
    .filter((scope) => SCOPE_RANK[scope] >= SCOPE_RANK.own && SCOPE_RANK[scope] <= granted)
    .map((scope) => ({ id: scope, label: SCOPE_LABELS[scope] }));
}

/** For yes/no capabilities such as notifications.send: true, or any scope above none. */
export function can(capabilities, area, action) {
  const value = capabilities?.[area]?.[action];
  if (value === true || value === 1 || value === "1") return true;
  return SCOPE_RANK[scopeOf(capabilities, area, action)] > 0;
}

const areaKeys = (area) =>
  typeof area === "string"
    ? [area]
    // `me.areas` names the module in `source_module` (the area's fetch_from).
    : [area?.source_module, area?.module, area?.fetch_from, area?.module_name, area?.key, area?.id].filter(Boolean).map(String);

/** True when `areas[]` from `me` includes the module, e.g. hasArea(areas, "hrc_hr_appointments"). */
export function hasArea(areas, module) {
  const wanted = String(module || "").trim().toLowerCase();
  if (!wanted || !Array.isArray(areas)) return false;
  return areas.some((area) => areaKeys(area).some((key) => key.trim().toLowerCase() === wanted));
}

/**
 * The widest read (or write) scope `me.areas` grants on one module, e.g. areaScope(areas,
 * "hrc_hr_appointments") → "all" for HR. For areas outside `capabilities`.
 */
export function areaScope(areas, module, kind = "read") {
  const wanted = String(module || "").trim().toLowerCase();
  if (!wanted || !Array.isArray(areas)) return "none";
  return areas
    .filter((area) => areaKeys(area).some((key) => key.trim().toLowerCase() === wanted))
    .map((area) => asScope(area?.[`${kind}_scope`]) || "none")
    .reduce((widest, scope) => (SCOPE_RANK[scope] > SCOPE_RANK[widest] ? scope : widest), "none");
}

// Each level of the rollout, keyed by the employees read scope that reaches it.
export const HIERARCHY_LEVELS = [
  { id: "employee", label: "Employee", scope: "own" },
  { id: "team_lead", label: "Team lead", scope: "team" },
  { id: "manager", label: "Manager", scope: "reports" },
  { id: "department_head", label: "Department head", scope: "dept" },
  { id: "hr", label: "HR", scope: "all" },
  { id: "admin", label: "HRCRM admin", scope: "all" },
];

/** The highest level the user reaches, from capabilities.employees.read. HRCRM admins stay admins. */
export function hierarchyLevel(capabilities, { isAdmin = false } = {}) {
  if (isAdmin) return HIERARCHY_LEVELS[HIERARCHY_LEVELS.length - 1];
  const scope = scopeOf(capabilities, "employees", "read");
  return HIERARCHY_LEVELS.find((level) => level.scope === scope) || HIERARCHY_LEVELS[0];
}

const ERROR_MESSAGES = {
  401: "Your session has expired. Sign in again to continue.",
  403: "This is outside your access. Ask HR if you think you should see it.",
  404: "We couldn't find that. It may have been removed.",
  409: "This changed since you opened it. Refresh and try again.",
  422: "Some details need attention. Check the highlighted fields.",
};

/** A readable message for an HR action error code, falling back to the server's text. */
export function hrErrorMessage(code, fallback) {
  return ERROR_MESSAGES[Number(code)] || fallback || "Something went wrong. Please try again.";
}

/** An admin action's 403 names the grant the role is missing ("…'update' access for everyone…"); show that instead of the generic text. */
export const structureError = (error) => (error?.code === 403 && error.serverMessage ? error.serverMessage : error?.message);
