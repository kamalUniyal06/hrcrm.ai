import { useQuery } from "@tanstack/react-query";
import { fetchAttendanceStats } from "../api/attendance.api";

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
