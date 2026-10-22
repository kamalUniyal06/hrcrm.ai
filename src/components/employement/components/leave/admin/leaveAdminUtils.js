export const ADMIN_LEAVE_QUERY_KEY = ["leaves", "admin-feed"];

export const clean = (value) => String(value ?? "").trim();

export function dateKey(value) {
  const text = clean(value);
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;

  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) return `${match[3]}-${String(match[1]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;
  return "";
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  const key = dateKey(value);
  if (!key) return "Not available";
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en", options).format(new Date(year, month - 1, day));
}

export function employeeFor(record, employeeMap) {
  return employeeMap.get(record.employee_id || record.hrc_employees_hrc_leaves_1hrc_employees_ida);
}

export function employeeDisplayName(record, employee) {
  return clean(employee?.name) || [
    employee?.first_name && employee?.last_name ? `${employee.first_name} ${employee.last_name}` : "",
    record.hrc_employees_hrc_leaves_1_name,
    record.hrc_candidates_hrc_leaves_1_name,
    record.assigned_user_name,
    record.name,
  ].map(clean).find(Boolean) || "Employee";
}

export function approvalDate(record) {
  return record.approved_date || record.date_approved || record.approval_date || record.date_modified;
}

export function isRecordInRange(record, fromDate, toDate, dateMode) {
  if (dateMode === "applied") {
    const applied = dateKey(record.date_entered);
    return Boolean(applied && applied >= fromDate && applied <= toDate);
  }

  if (dateMode === "approved") {
    const approved = dateKey(approvalDate(record));
    return record.status === "Accepted" && Boolean(approved && approved >= fromDate && approved <= toDate);
  }

  const from = dateKey(record.leave_from);
  const to = dateKey(record.leave_to) || from;
  return Boolean(from && from <= toDate && to >= fromDate);
}

export const statusOf = (record) =>
  ["Applied", "Accepted", "Rejected"].includes(record.status) ? record.status : "Applied";

const looksLikeId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(value);
const firstName = (...values) => values.map(clean).find((value) => value && !looksLikeId(value)) || "";

// Who approved a leave, who covers the work, and why. The relate fields come back as
// `<field>_id` plus a name; when the name is missing, nameById fills it from the employee list.
export function leaveApproval(record, nameById = new Map()) {
  const approvedById = clean(record?.approved_by_id);
  const handoverId = clean(record?.work_handed_over_to_id);
  return {
    approvedById,
    handoverId,
    approvedBy: firstName(record?.approved_by_id_name, record?.approved_by, nameById.get(approvedById)),
    handoverTo: firstName(record?.work_handed_over_to_id_name, record?.work_handed_over_to, nameById.get(handoverId)),
    reason: clean(record?.verdict),
    decidedOn: statusOf(record || {}) === "Applied" ? "" : clean(record?.approved_date) || clean(record?.date_modified),
  };
}
