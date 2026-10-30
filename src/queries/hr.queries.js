import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  addTimelineEvent,
  assignEmployee,
  bookAppointment,
  deleteAvailability,
  deleteTimelineEvent,
  fetchAppointments,
  fetchAppointmentSlots,
  fetchAvailability,
  fetchDepartmentMembers,
  fetchEmployee,
  fetchHrList,
  fetchLeaveBalance,
  fetchLeaveTokenApprovers,
  fetchLeaveTokens,
  fetchLookups,
  fetchMe,
  fetchNotificationCounts,
  fetchNotificationReceipts,
  fetchNotifications,
  fetchOrgTree,
  fetchPayrollOverview,
  fetchPeople,
  fetchReportingTree,
  fetchRoles,
  fetchSalary,
  fetchSentNotifications,
  fetchTeamLeaveBalances,
  fetchTimeline,
  markNotifications,
  markPayslipPaid,
  issueLeaveToken,
  promoteEmployee,
  rejectLeaveToken,
  requestLeaveToken,
  revokeLeaveToken,
  reviseSalary,
  runPayroll,
  saveAvailability,
  saveDepartment,
  saveTeam,
  sendNotification,
  updateAppointment,
  verifyLeaveToken,
} from "../api/hr.api";
import { normalizeTeamBalances } from "../utils/hrRecords";

export const hrKeys = {
  all: ["hr"],
  me: (userId) => ["hr", "me", userId],
  lookups: ["hr", "lookups"],
  roles: ["hr", "roles"],
  orgTree: ["hr", "org-tree"],
  reportingTree: ["hr", "reporting-tree"],
  employee: (id) => ["hr", "employee", id],
  people: (scope) => ["hr", "people", scope || "default"],
  departmentMembers: (id) => ["hr", "department-members", id],
  notificationCounts: ["hr", "notification-counts"],
  notifications: ["hr", "notifications"],
  notificationList: (filters) => ["hr", "notifications", filters],
  sentNotifications: ["hr", "notifications-sent"],
  sentNotificationList: (mine) => ["hr", "notifications-sent", mine ? "mine" : "everyone"],
  receipts: (id) => ["hr", "notification-receipts", id],
  timeline: ["hr", "timeline"],
  // `employeeId` empty = the signed-in employee.
  timelineView: (employeeId, majorOnly) => ["hr", "timeline", employeeId || "self", majorOnly ? "major" : "all"],
  salary: ["hr", "salary"],
  salaryOf: (employeeId) => ["hr", "salary", employeeId || "self"],
  payrollOverview: ["hr", "payroll-overview"],
  leaveBalance: ["hr", "leave-balance"],
  leaveBalanceOf: (employeeId) => ["hr", "leave-balance", employeeId || "self"],
  teamLeaveBalances: (scope) => ["hr", "team-leave-balances", scope || "default"],
  leaveTokens: ["hr", "leave-tokens"],
  leaveTokenView: (view) => ["hr", "leave-tokens", view],
  leaveTokenApprovers: ["hr", "leave-tokens", "approvers"],
  leaveTokenCheck: (params) => ["hr", "leave-tokens", "check", params],
  hrList: ["hr", "hr-list"],
  slots: ["hr", "appointment-slots"],
  slotRange: (params) => ["hr", "appointment-slots", params],
  appointments: ["hr", "appointments"],
  appointmentView: (view) => ["hr", "appointments", view],
  availability: ["hr", "availability"],
  availabilityOf: (hrEmployeeId) => ["hr", "availability", hrEmployeeId || "self"],
};

// 401 is refreshed by the client; 403/404/422 won't change on a retry.
const retry = (count, error) => count < 1 && !(error?.code >= 400 && error?.code < 500);

const useSignedIn = () => useSelector((state) => state.user.isAuthenticated === true);

/** Who the user is and what they may do: employee, tenure, reporting_chain, direct_reports, areas, capabilities. */
export function useMe() {
  const userId = useSelector((state) => state.user.userInfo?.id ?? state.user.user?.email ?? null);
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: hrKeys.me(userId),
    queryFn: fetchMe,
    enabled: signedIn,
    staleTime: 5 * 60 * 1000,
    retry,
  });
}

/** Employees, teams, departments, branches, roles, timeline event types and scopes for every picker. */
export function useLookups() {
  const signedIn = useSignedIn();
  return useQuery({ queryKey: hrKeys.lookups, queryFn: fetchLookups, enabled: signedIn, staleTime: 10 * 60 * 1000, retry });
}

export const useRoles = () => useQuery({ queryKey: hrKeys.roles, queryFn: fetchRoles, retry });
export const useOrgTree = () => useQuery({ queryKey: hrKeys.orgTree, queryFn: fetchOrgTree, retry });
export const useReportingTree = () => useQuery({ queryKey: hrKeys.reportingTree, queryFn: fetchReportingTree, retry });
export const useEmployee = (id) =>
  useQuery({ queryKey: hrKeys.employee(id), queryFn: () => fetchEmployee(id), enabled: Boolean(id), retry });
export const usePeople = (scope, { enabled = true } = {}) =>
  useQuery({ queryKey: hrKeys.people(scope), queryFn: () => fetchPeople({ scope }), enabled, staleTime: 5 * 60 * 1000, retry });
export const useDepartmentMembers = (departmentId) =>
  useQuery({ queryKey: hrKeys.departmentMembers(departmentId), queryFn: () => fetchDepartmentMembers(departmentId), enabled: Boolean(departmentId), staleTime: 5 * 60 * 1000, retry });

/* ── notifications ─────────────────────────────────────────────────────── */

/** Polled every 60 s and on window focus for the header bell. */
export function useNotificationCounts() {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: hrKeys.notificationCounts,
    queryFn: fetchNotificationCounts,
    enabled: signedIn,
    // Stop polling for users the backend refuses (no notifications area).
    refetchInterval: (query) => ([403, 404].includes(query.state.error?.code) ? false : 60 * 1000),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    retry,
  });
}

export const useNotifications = (filters = {}) =>
  useQuery({ queryKey: hrKeys.notificationList(filters), queryFn: () => fetchNotifications(filters), retry });

export function useMarkNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.notifications });
      queryClient.invalidateQueries({ queryKey: hrKeys.notificationCounts });
    },
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.sentNotifications });
      // The sender may be in the audience too.
      queryClient.invalidateQueries({ queryKey: hrKeys.notifications });
      queryClient.invalidateQueries({ queryKey: hrKeys.notificationCounts });
    },
  });
}

export const useSentNotifications = ({ mine = true, enabled = true } = {}) =>
  useQuery({ queryKey: hrKeys.sentNotificationList(mine), queryFn: () => fetchSentNotifications({ mine }), enabled, retry });
export const useNotificationReceipts = (id) =>
  useQuery({ queryKey: hrKeys.receipts(id), queryFn: () => fetchNotificationReceipts(id), enabled: Boolean(id), retry });

/* ── self service (and people in scope, with `employeeId`) ─────────────── */

export const useTimeline = ({ employeeId, majorOnly = false } = {}) =>
  useQuery({ queryKey: hrKeys.timelineView(employeeId, majorOnly), queryFn: () => fetchTimeline({ employeeId, majorOnly }), retry });

export function useAddTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: addTimelineEvent, onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.timeline }) });
}

export function useDeleteTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteTimelineEvent, onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.timeline }) });
}

/** `employeeId` empty = the signed-in employee's own pay. */
export const useSalary = (employeeId, { enabled = true } = {}) =>
  useQuery({ queryKey: hrKeys.salaryOf(employeeId), queryFn: () => fetchSalary({ employeeId }), enabled, retry });

export const usePayrollOverview = ({ enabled = true } = {}) =>
  useQuery({ queryKey: hrKeys.payrollOverview, queryFn: fetchPayrollOverview, enabled, staleTime: 60 * 1000, retry });

// A revision or promotion changes pay, the timeline, the payroll totals and (for promotions) the
// designation, manager and role shown on `me`, people lists and profiles.
const refreshPay = (queryClient) => {
  [hrKeys.salary, hrKeys.timeline, hrKeys.payrollOverview, ["hr", "me"]].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

export function useReviseSalary() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: reviseSalary, onSuccess: () => refreshPay(queryClient) });
}

// Payslips show on /salaries (the generic `salaries` list) and in each person's salary.
const refreshPayslips = (queryClient) => {
  [["salaries"], hrKeys.salary, hrKeys.payrollOverview].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

/** Preview or store a month's payroll; only a stored run (`commit`) refreshes the payslip lists. */
export function useRunPayroll() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: runPayroll, onSuccess: (_, { commit }) => commit && refreshPayslips(queryClient) });
}

export function useMarkPayslipPaid() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: markPayslipPaid, onSuccess: () => refreshPayslips(queryClient) });
}

// A move or a team / department change shows on the org views, people lists, profiles and timelines.
const refreshStructure = (queryClient, employeeId) => {
  [hrKeys.orgTree, hrKeys.reportingTree, hrKeys.lookups, ["hr", "people"], ["hr", "department-members"], hrKeys.timeline, ["hr", "me"], ["employees"]]
    .concat(employeeId ? [hrKeys.employee(employeeId)] : [])
    .forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

/** Moves one employee (manager, designation, team, department, job role) with `assign`. */
export function useAssignEmployee() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: assignEmployee, onSettled: (_, __, { employeeId }) => refreshStructure(queryClient, employeeId) });
}

export function useSaveTeam() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: saveTeam, onSettled: () => refreshStructure(queryClient) });
}

export function useSaveDepartment() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: saveDepartment, onSettled: () => refreshStructure(queryClient) });
}

export function usePromote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: promoteEmployee,
    onSuccess: (_, { employeeId }) => {
      refreshPay(queryClient);
      [hrKeys.employee(employeeId), ["hr", "people"], ["hr", "department-members"], hrKeys.reportingTree, hrKeys.orgTree, ["employees"]].forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      );
    },
  });
}
export const useLeaveBalance = (employeeId) =>
  useQuery({ queryKey: hrKeys.leaveBalanceOf(employeeId), queryFn: () => fetchLeaveBalance({ employeeId }), retry });
export const useTeamLeaveBalances = (scope, { enabled = true } = {}) =>
  useQuery({ queryKey: hrKeys.teamLeaveBalances(scope), queryFn: () => fetchTeamLeaveBalances({ scope }), enabled, staleTime: 60 * 1000, retry });

const toBalanceMap = (data) => new Map(normalizeTeamBalances(data).map((row) => [row.employeeId, row]));

/** employee id → balance row for everyone in the viewer's leave scope; one request shared by every card. */
export const useTeamBalanceMap = () =>
  useQuery({ queryKey: hrKeys.teamLeaveBalances(undefined), queryFn: () => fetchTeamLeaveBalances(), select: toBalanceMap, staleTime: 60 * 1000, retry });

/* ── leave tokens ──────────────────────────────────────────────────────── */

export const useLeaveTokenApprovers = () =>
  useQuery({ queryKey: hrKeys.leaveTokenApprovers, queryFn: fetchLeaveTokenApprovers, staleTime: 5 * 60 * 1000, retry });

export const useLeaveTokens = (view = "mine", { enabled = true } = {}) =>
  useQuery({ queryKey: hrKeys.leaveTokenView(view), queryFn: () => fetchLeaveTokens({ view }), enabled, refetchOnWindowFocus: true, retry });

/** One employee's leave codes (`all` view, admins), to show who gave the code a leave was applied with. */
export const useEmployeeLeaveTokens = (employeeId, { enabled = true } = {}) =>
  useQuery({
    queryKey: hrKeys.leaveTokenView(`employee:${employeeId}`),
    queryFn: () => fetchLeaveTokens({ view: "all", employeeId }),
    enabled: enabled && Boolean(employeeId),
    staleTime: 60 * 1000,
    retry,
  });

/** Checks `code` for the leave dates; runs once the code is complete. Nothing is used up. */
export const useLeaveTokenCheck = ({ code, leaveFrom, leaveTo }, { enabled = true } = {}) =>
  useQuery({
    queryKey: hrKeys.leaveTokenCheck({ code, leaveFrom, leaveTo }),
    queryFn: () => verifyLeaveToken({ code, leaveFrom, leaveTo }),
    enabled: enabled && code.length === 6,
    staleTime: 30 * 1000,
    retry,
  });

// Asking, giving, refusing or cancelling a code changes both sides' lists and sends a notification.
const useTokenMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.leaveTokens });
      queryClient.invalidateQueries({ queryKey: hrKeys.notificationCounts });
    },
  });
};

export const useRequestLeaveToken = () => useTokenMutation(requestLeaveToken);
export const useIssueLeaveToken = () => useTokenMutation(issueLeaveToken);
export const useRejectLeaveToken = () => useTokenMutation(rejectLeaveToken);
export const useRevokeLeaveToken = () => useTokenMutation(revokeLeaveToken);

/* ── HR appointments ───────────────────────────────────────────────────── */

export const useHrList = () => useQuery({ queryKey: hrKeys.hrList, queryFn: fetchHrList, staleTime: 10 * 60 * 1000, retry });

export const useAppointmentSlots = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: hrKeys.slotRange(params),
    queryFn: () => fetchAppointmentSlots(params),
    enabled: enabled && Boolean(params?.from && params?.to),
    staleTime: 30 * 1000,
    retry,
  });

export const useAppointments = (view = "mine") =>
  useQuery({ queryKey: hrKeys.appointmentView(view), queryFn: () => fetchAppointments({ view }), retry });

// A booking, cancel or reschedule changes the lists, the free slots and the notification badge.
const refreshAppointments = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: hrKeys.appointments });
  queryClient.invalidateQueries({ queryKey: hrKeys.slots });
  queryClient.invalidateQueries({ queryKey: hrKeys.notificationCounts });
};

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: bookAppointment, onSettled: () => refreshAppointments(queryClient) });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: updateAppointment, onSettled: () => refreshAppointments(queryClient) });
}

export const useAvailability = (hrEmployeeId, { enabled = true } = {}) =>
  useQuery({ queryKey: hrKeys.availabilityOf(hrEmployeeId), queryFn: () => fetchAvailability({ hrEmployeeId }), enabled, retry });

// New or changed hours change who takes bookings and which slots are free.
const refreshAvailability = (queryClient) => {
  [hrKeys.availability, hrKeys.hrList, hrKeys.slots].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

export function useSaveAvailability() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: saveAvailability, onSettled: () => refreshAvailability(queryClient) });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteAvailability, onSettled: () => refreshAvailability(queryClient) });
}
