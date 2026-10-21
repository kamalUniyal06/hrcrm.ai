import { useQuery } from "@tanstack/react-query";
import { fetchAllRecords } from "../../../pages/candidates/candidatesApi";
import { buildCandidateListRequest } from "../../../pages/candidates/candidateList";
import { dateKey } from "../attendance/adminAttendanceUtils";
import { getAllResignations } from "../../api/resignation.api";
import { getLeavesOnDay } from "../../api/leaves.api";
import { fetchAdminQuestions, fetchAdminRequests } from "../../api/incrementAdmin.api";

const FIVE_MINUTES = 5 * 60 * 1000;

export const monthRange = (now = new Date()) => ({
  from: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
  to: dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
});

// Prefixed with "dailyActivity" so clock-in/lunch/logout mutations refresh it.
export const useMyActivityRange = ({ email, from, to }) =>
  useQuery({
    queryKey: ["dailyActivity", "mine", email, from, to],
    queryFn: () =>
      fetchAllRecords("hrc_daily_activity", { field: "date_entered", from: `${from} 00:00:00`, to: `${to} 23:59:59` }, { name: email }),
    enabled: Boolean(email && from && to),
    staleTime: FIVE_MINUTES,
  });

// Same keys as the admin attendance page so both screens share the cache.
export const useEmployeesDirectory = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["employees", "list"],
    queryFn: () => fetchAllRecords("hrc_employees"),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

export const useOrgActivityForDay = ({ day, enabled = true }) =>
  useQuery({
    queryKey: ["dailyActivity", "admin", "all", day, day],
    queryFn: () => fetchAllRecords("hrc_daily_activity", { field: "date_entered", from: `${day} 00:00:00`, to: `${day} 23:59:59` }),
    enabled,
    refetchInterval: 60000,
  });

// Leaves covering one day, fetched with date filters rather than read from the full list.
export const useLeavesOnDay = ({ day, enabled = true }) =>
  useQuery({
    queryKey: ["leaves", "attendance", "day", day],
    queryFn: () => getLeavesOnDay(day),
    enabled: Boolean(enabled && day),
    staleTime: FIVE_MINUTES,
  });

export const useAllLeaves = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["leaves", "attendance", "all"],
    queryFn: () => fetchAllRecords("hrc_leaves"),
    enabled,
    staleTime: FIVE_MINUTES,
  });

export const useAnnouncements = () =>
  useQuery({
    queryKey: ["system-alerts", "all"],
    queryFn: () => fetchAllRecords("hrc_system_alert"),
    staleTime: FIVE_MINUTES,
  });

// Same key as the offboarding page.
export const useResignations = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["resignations", "offboarding"],
    queryFn: getAllResignations,
    enabled,
    staleTime: FIVE_MINUTES,
  });

// Same keys as the increment management page's unfiltered request list.
export const useIncrementRequests = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["increment-admin", "request-collection", { search: "", from: "", to: "" }],
    queryFn: () => fetchAdminRequests({ search: "", from: "", to: "" }),
    enabled,
    staleTime: FIVE_MINUTES,
  });

export const useIncrementQuestions = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["increment-admin", "questions"],
    queryFn: fetchAdminQuestions,
    enabled,
    staleTime: FIVE_MINUTES,
  });

// Candidates added in a date range, with the same filters as the candidates
// page's "All" list (no employees, no Unassigned stage/phase/status) so counts match.
export const useCandidatesForRange = ({ from, to, enabled = true }) =>
  useQuery({
    queryKey: ["candidates", "home", from, to],
    queryFn: () => fetchAllRecords("hrc_candidates", { field: "date_entered", from: `${from} 00:00:00`, to: `${to} 23:59:59` }, buildCandidateListRequest().filters),
    enabled: Boolean(enabled && from && to),
    staleTime: FIVE_MINUTES,
  });

// Same key as the candidates page.
export const useInterviews = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["interviews"],
    queryFn: () => fetchAllRecords("hrc_interviews"),
    enabled,
    staleTime: FIVE_MINUTES,
  });
