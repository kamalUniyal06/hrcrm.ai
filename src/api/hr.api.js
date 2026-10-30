import { http } from "../services/api";
import { hrErrorMessage } from "../utils/hrAccess";

/**
 * An HR action failure. `code` is the gateway's 401/403/404/409/422 (or the HTTP status),
 * `message` is already readable, and `fields` holds per-field messages for a 422.
 */
export class HrApiError extends Error {
  constructor({ code, message, serverMessage, fields }) {
    super(message);
    this.name = "HrApiError";
    this.code = Number(code) || 0;
    this.serverMessage = serverMessage || "";
    this.fields = fields || {};
  }
}

const fieldErrors = (payload) => {
  const errors = payload?.errors ?? payload?.fields ?? payload?.field_errors;
  return errors && typeof errors === "object" && !Array.isArray(errors) ? errors : {};
};

const toError = (payload, status) => {
  const serverMessage = String(payload?.error || payload?.message || "");
  const code = Number(payload?.code) || Number(status) || 0;
  // A 422 names the problem; the other codes get one fixed message each.
  const message = code === 422 && serverMessage ? serverMessage : hrErrorMessage(code, serverMessage);
  return new HrApiError({ code, message, serverMessage, fields: fieldErrors(payload) });
};

// Responses put their result in `data`, or at the top level beside `success`.
const unwrap = (payload) => {
  if (payload?.data !== undefined && payload.data !== null) return payload.data;
  const rest = { ...payload };
  delete rest.success;
  delete rest.code;
  return rest;
};

/** Calls one smart_gateway HR action with the caller's Bearer token and returns its result. */
export async function hrApi(action, data = {}) {
  let payload;
  try {
    payload = await http({ method: "POST", body: { action, data } });
  } catch (error) {
    if (error?.response) throw toError(error.response.data, error.response.status);
    throw new HrApiError({ code: 0, message: "Couldn't reach the server. Check your connection and try again." });
  }
  if (payload?.success === false) throw toError(payload);
  return unwrap(payload);
}

/* ── who am I ──────────────────────────────────────────────────────────── */

export const fetchMe = () => hrApi("me");
export const fetchLookups = () => hrApi("lookups");

/* ── hierarchy ─────────────────────────────────────────────────────────── */

export const fetchRoles = () => hrApi("roles");
export const fetchOrgTree = () => hrApi("org_tree");
export const fetchReportingTree = () => hrApi("reporting_tree");
export const fetchEmployee = (employeeId) => hrApi("employee", { employee_id: employeeId });
/** Everyone the caller can see; the backend caps `scope` at their employees read scope. */
export const fetchPeople = ({ scope } = {}) => hrApi("people", scope ? { scope } : {});
/** Everyone in one department, directly or through its teams. */
export const fetchDepartmentMembers = (departmentId) => hrApi("department_members", { department_id: departmentId });

/* ── notifications ─────────────────────────────────────────────────────── */

export const fetchNotificationCounts = () => hrApi("notification_counts");
export const fetchNotifications = ({ status, type, page = 1 } = {}) =>
  hrApi("notifications", { ...(status && status !== "all" ? { status } : {}), ...(type && type !== "all" ? { type } : {}), page });
/** Marks one notification seen, or all of them with `{ all: true }`. */
export const markNotifications = ({ id, all = false }) => hrApi("notification_mark", all ? { all: 1 } : { id });
/** `forNotification` is all, team, department, role or employee; `targetId` names the team/department/role/employee. */
export const sendNotification = ({ title, body, type, forNotification, targetId, linkUrl, expiresOn }) =>
  hrApi("notification_send", {
    title,
    body,
    notification_type: type,
    for_notification: forNotification,
    ...(forNotification !== "all" ? { target_id: targetId } : {}),
    ...(linkUrl ? { link_url: linkUrl } : {}),
    ...(expiresOn ? { expires_on: expiresOn } : {}),
  });
/** Notices the caller sent; `mine: false` lists everyone's for roles that read all notifications. */
export const fetchSentNotifications = ({ mine = true } = {}) => hrApi("notifications_sent", mine ? { mine: 1 } : {});
export const fetchNotificationReceipts = (id) => hrApi("notification_receipts", { id });

/* ── self service (and people in scope, with `employeeId`) ─────────────── */

const forEmployee = (employeeId) => (employeeId ? { employee_id: employeeId } : {});

export const fetchTimeline = ({ employeeId, majorOnly = false } = {}) =>
  hrApi("timeline", { ...forEmployee(employeeId), ...(majorOnly ? { major_only: 1 } : {}) });
export const addTimelineEvent = ({ employeeId, eventType, eventDate, title, description }) =>
  hrApi("timeline_add", { employee_id: employeeId, event_type: eventType, event_date: eventDate, title, description });
/** Only manually added events can be removed. */
export const deleteTimelineEvent = (id) => hrApi("timeline_delete", { id });
export const fetchSalary = ({ employeeId } = {}) => hrApi("salary", forEmployee(employeeId));
/** A new salary version from `components` (see salaryComponents), effective from `effectiveFrom`. */
export const reviseSalary = ({ employeeId, components, effectiveFrom, revisionType, remarks }) =>
  hrApi("salary_revise", { employee_id: employeeId, ...components, effective_from: effectiveFrom, revision_type: revisionType, remarks });
/** Designation, job role and manager in one step, with an optional salary revision; logs one Promotion event. */
export const promoteEmployee = ({ employeeId, newDesignation, roleId, reportingPersonId, effectiveDate, remarks, salary }) =>
  hrApi("promote", {
    employee_id: employeeId,
    effective_date: effectiveDate,
    remarks,
    ...(newDesignation ? { new_designation: newDesignation } : {}),
    ...(roleId ? { role_id: roleId } : {}),
    ...(reportingPersonId ? { reporting_person_id: reportingPersonId } : {}),
    ...(salary ? { salary } : {}),
  });
/** Headcount, monthly gross and net and annual CTC for everyone in the caller's salary read scope. */
export const fetchPayrollOverview = () => hrApi("payroll_overview");
/** Previews (`commit` false) or stores one month's payslips; leave out `employeeIds` for everyone. Paid payslips are never changed. */
export const runPayroll = ({ month, employeeIds, commit = false }) =>
  hrApi("payroll_run", { month, commit: commit ? 1 : 0, ...(employeeIds?.length ? { employee_ids: employeeIds } : {}) });
export const markPayslipPaid = ({ salaryId, paidOn }) => hrApi("payslip_mark_paid", { salary_id: salaryId, ...(paidOn ? { paid_on: paidOn } : {}) });
export const fetchLeaveBalance = ({ employeeId } = {}) => hrApi("leave_balance", forEmployee(employeeId));
/** Leave balances of everyone in the caller's leave read scope, optionally narrowed. */
export const fetchTeamLeaveBalances = ({ scope } = {}) => hrApi("team_leave_balances", scope ? { scope } : {});

/* ── leave tokens ──────────────────────────────────────────────────────── */

const leaveDates = (leaveFrom, leaveTo) => ({ ...(leaveFrom ? { leave_from: leaveFrom } : {}), ...(leaveTo ? { leave_to: leaveTo } : {}) });

/** Whether a code is needed to apply for leave, and who can give the caller one. */
export const fetchLeaveTokenApprovers = () => hrApi("leave_token_approvers");
/** Without `approverId` every team lead / manager above the caller is asked. */
export const requestLeaveToken = ({ approverId, leaveFrom, leaveTo, leaveType, reason }) =>
  hrApi("leave_token_request", { ...(approverId ? { approver_id: approverId } : {}), ...leaveDates(leaveFrom, leaveTo), leave_type: leaveType, reason });
/** Answers a request (`requestId`) or gives a code directly (`employeeId`); returns the code, which is also sent to the employee. */
export const issueLeaveToken = ({ requestId, employeeId, leaveFrom, leaveTo, remarks }) =>
  hrApi("leave_token_issue", { ...(requestId ? { request_id: requestId } : { employee_id: employeeId }), ...leaveDates(leaveFrom, leaveTo), remarks });
export const rejectLeaveToken = ({ requestId, remarks }) => hrApi("leave_token_reject", { request_id: requestId, remarks });
export const revokeLeaveToken = (id) => hrApi("leave_token_revoke", { id });
/**
 * `view` mine (my codes and requests), to_issue (requests I can answer and codes I gave) or all
 * (every code, in `tokens`, for admins). `employeeId` narrows to one employee's codes.
 */
export const fetchLeaveTokens = ({ view = "mine", status, employeeId } = {}) =>
  hrApi("leave_tokens", { view, ...(status ? { status } : {}), ...forEmployee(employeeId) });
/** Checks a code for the caller's leave dates without using it up. */
export const verifyLeaveToken = ({ code, leaveFrom, leaveTo }) => hrApi("leave_token_verify", { manager_token: code, ...leaveDates(leaveFrom, leaveTo) });

/* ── HR appointments ───────────────────────────────────────────────────── */

export const fetchHrList = () => hrApi("hr_list");
// HR rescheduling someone else's booking passes that person as `employeeId`, so their other bookings are skipped too.
export const fetchAppointmentSlots = ({ from, to, hrEmployeeId, mode, employeeId }) =>
  hrApi("appointment_slots", { from, to, mode, ...(hrEmployeeId ? { hr_employee_id: hrEmployeeId } : {}), ...forEmployee(employeeId) });
// The backend stores the agenda as `description`.
export const bookAppointment = ({ topic, mode, hrEmployeeId, start, agenda }) =>
  hrApi("appointment_book", { topic, mode, start, description: agenda, ...(hrEmployeeId ? { hr_employee_id: hrEmployeeId } : {}) });
export const fetchAppointments = ({ view = "mine" } = {}) => hrApi("appointments", { view });
export const fetchAppointment = (id) => hrApi("appointment_get", { id });
/**
 * `operation` is cancel (with `reason`), reschedule (with a new `start`), or, for HR, confirm, complete,
 * no_show or update. HR may also send `hrNotes`, `location`, `meetingLink` and `mode`; an empty string clears one.
 */
export const updateAppointment = ({ id, operation, reason, start, hrNotes, location, meetingLink, mode }) =>
  hrApi("appointment_update", {
    id,
    op: operation,
    ...(reason ? { reason } : {}),
    ...(start ? { start } : {}),
    ...Object.fromEntries(Object.entries({ hr_notes: hrNotes, location, meeting_link: meetingLink, mode }).filter(([, value]) => value !== undefined)),
  });

/** Weekly hours and time-off blocks of one HR person (default: the caller). */
export const fetchAvailability = ({ hrEmployeeId } = {}) => hrApi("hr_availability", hrEmployeeId ? { hr_employee_id: hrEmployeeId } : {});
/** Creates (no `id`) or changes one rule; `rule` uses the backend fields (rule_type, day_of_week, start_time, block_start…). */
export const saveAvailability = ({ id, hrEmployeeId, rule }) =>
  hrApi("hr_availability_save", { ...rule, ...(id ? { id } : {}), ...(hrEmployeeId ? { hr_employee_id: hrEmployeeId } : {}) });
export const deleteAvailability = (id) => hrApi("hr_availability_delete", { id });

/* ── admin: structure ──────────────────────────────────────────────────── */
// These need "Everyone" update access on Employees in the caller's role; a 403 names the missing grant.

/** Moves one employee; `changes` holds assign fields (see assignChanges), "" clears one. */
export const assignEmployee = ({ employeeId, changes }) => hrApi("assign", { employee_id: employeeId, ...changes });
/** Creates (no `id`) or changes a team. Send only what changes; "" clears the lead or department. */
export const saveTeam = ({ id, ...fields }) => hrApi("team_save", { ...(id ? { id } : {}), ...fields });
/** Creates (no `id`) or changes a department. Send only what changes; "" clears the head or branch. */
export const saveDepartment = ({ id, ...fields }) => hrApi("department_save", { ...(id ? { id } : {}), ...fields });
