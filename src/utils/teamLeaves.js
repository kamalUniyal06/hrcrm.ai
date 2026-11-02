import { dateKey, statusOf } from "../components/employement/components/leave/admin/leaveAdminUtils.js";

const clean = (value) => String(value ?? "").trim();
const employeeLink = "hrc_employees_hrc_leaves_1hrc_employees_ida";

/** What each leave status means to a manager reading the list. */
export const LEAVE_STATUS_LABELS = { Applied: "Waiting for approval", Accepted: "Approved", Rejected: "Rejected" };

/**
 * Leaves of the given people, split into `upcoming` (applied or approved, not over yet, soonest
 * first; `current` when it has started) and `history` (over, or rejected; newest first). A leave
 * belongs to a person by employee id, or by email when it has no employee link.
 */
export function teamLeaves(records = [], people = [], today) {
  const byId = new Map();
  const byEmail = new Map();
  for (const person of people) {
    const id = clean(person?.id ?? person?.employee_id);
    const email = clean(person?.email ?? person?.email1).toLowerCase();
    if (id) byId.set(id, person);
    if (email && !byEmail.has(email)) byEmail.set(email, person);
  }
  const seen = new Set();
  const upcoming = [];
  const history = [];
  for (const record of records) {
    const id = clean(record?.id);
    if (String(record?.deleted) === "1" || (id && seen.has(id))) continue;
    if (id) seen.add(id);
    const employeeId = clean(record.employee_id || record[employeeLink]);
    const person = (employeeId && byId.get(employeeId)) || (!employeeId && byEmail.get(clean(record.name).toLowerCase()));
    const from = dateKey(record.leave_from);
    if (!person || !from) continue;
    const to = dateKey(record.leave_to) || from;
    const status = statusOf(record);
    const days = Number(clean(record.leave_days));
    const row = {
      id: id || `${employeeId}:${from}`,
      person,
      from,
      to,
      days: Number.isFinite(days) && days > 0 ? days : null,
      type: clean(record.type_of_leave || record.leave_type) || "Leave",
      status,
      reason: clean(record.description),
      appliedOn: dateKey(record.date_entered),
      current: from <= today && to >= today,
    };
    (to >= today && status !== "Rejected" ? upcoming : history).push(row);
  }
  upcoming.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  history.sort((a, b) => b.from.localeCompare(a.from) || b.appliedOn.localeCompare(a.appliedOn));
  return { upcoming, history };
}
