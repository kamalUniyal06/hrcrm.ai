import { useQuery } from "@tanstack/react-query";
import { fetchAllRecords } from "../../../pages/candidates/candidatesApi";
import { dateKey } from "../attendance/adminAttendanceUtils";

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
