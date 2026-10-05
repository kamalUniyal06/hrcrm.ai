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
