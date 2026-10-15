// Pure helpers for the admin home insight cards (offboarding, increments, hiring).

const clean = (value) => String(value ?? "").trim();
const isComplete = (value) => value === true || value === 1 || value === "1";

// Same fields as the offboarding page.
export const OFFBOARDING_APPROVALS = ["notify_tl", "notify_manager", "notify_hr"];
export const OFFBOARDING_TASKS = ["assets", "kt", "exit_interview", "reviews", "salary_slip", "decleration_form"];

export function offboardingProgress(record = {}) {
  const approvals = OFFBOARDING_APPROVALS.filter((field) => isComplete(record[field])).length;
  const tasks = OFFBOARDING_TASKS.filter((field) => isComplete(record[field])).length;
  const steps = OFFBOARDING_APPROVALS.length + OFFBOARDING_TASKS.length;
  const approvalsReady = approvals === OFFBOARDING_APPROVALS.length;
  return {
    approvals,
    tasks,
    approvalsReady,
    completed: approvalsReady && tasks === OFFBOARDING_TASKS.length,
    percent: Math.round(((approvals + tasks) / steps) * 100),
  };
}

const personName = (record = {}) =>
  [record.first_name, record.last_name].map(clean).filter(Boolean).join(" ") || clean(record.name);

/**
 * Employees whose offboarding is still open, matched to their employee record by email.
 * Least progressed first, so the cases that need a push are on top.
 */
export function openOffboardingCases(records = [], employees = []) {
  const byEmail = new Map(employees.map((employee) => [clean(employee.email1 || employee.email).toLowerCase(), employee]));
  return records
    .filter((record) => String(record.deleted) !== "1")
    .map((record) => {
      const email = clean(record.name);
      const employee = byEmail.get(email.toLowerCase()) || null;
      return {
        id: record.id,
        employeeId: employee?.id || null,
        name: (employee && personName(employee)) || email || "Employee",
        email,
        designation: clean(employee?.designation || employee?.title),
        noticePeriod: clean(record.notice_period),
        progress: offboardingProgress(record),
      };
    })
    .filter((item) => !item.progress.completed)
    .sort((left, right) => left.progress.percent - right.progress.percent || left.name.localeCompare(right.name));
}

/** Count records per label, largest first; anything past `limit` is folded into "Other". */
export function countByLabel(records = [], labelOf, limit = 5) {
  const counts = new Map();
  for (const record of records) {
    const label = clean(labelOf(record)) || "Unassigned";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  const sorted = [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  if (sorted.length <= limit) return sorted;
  const rest = sorted.slice(limit - 1).reduce((sum, item) => sum + item.count, 0);
  return [...sorted.slice(0, limit - 1), { label: "Other", count: rest }];
}

/** "Ravi Kumar" / "ravi.kumar@x.com" -> "RK". */
export function initialsOf(name = "") {
  const source = clean(name).includes("@") ? clean(name).split("@")[0] : clean(name);
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase() || "?";
}

export const tint = (color, amount = 12) => `color-mix(in oklab, ${color} ${amount}%, transparent)`;
