import { useQuery } from "@tanstack/react-query";
import { fetchActivityOnDay, fetchAttendanceStats } from "../api/attendance.api";

export const attendanceKeys = {
  all: ["attendance"],
  stats: (day) => ["attendance", "stats", day],
};

export const useAttendanceStats = (day, { enabled = true } = {}) =>
  useQuery({
    queryKey: attendanceKeys.stats(day),
    queryFn: () => fetchAttendanceStats(day),
    enabled: Boolean(day) && enabled,
    refetchInterval: 60000,
  });

// Same key as the admin attendance page, so clock-in, lunch and logout refresh it too.
export const useActivityOnDay = (day, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["dailyActivity", "admin", "all", day, day],
    queryFn: () => fetchActivityOnDay(day),
    enabled: Boolean(day) && enabled,
    refetchInterval: 60000,
  });
