import { useQuery } from "@tanstack/react-query";
import { fetchTeamsLive, fetchTeamsReport, fetchTeamsTimeline } from "../api/teamsPresence.api";

export const teamsPresenceKeys = {
  all: ["teams-presence"],
  day: (day, live) => ["teams-presence", live ? "live" : "report", day],
  timeline: (employeeId, day) => ["teams-presence", "timeline", employeeId, day],
};

// Access and validation errors won't change on retry.
const retry = (count, error) => ![401, 403, 422].includes(error?.status) && count < 2;

// Today polls the live feed every minute (the collector's own cadence); other days read the daily report.
export const useTeamsPresenceDay = (day, { live = false, enabled = true } = {}) =>
  useQuery({
    queryKey: teamsPresenceKeys.day(day, live),
    queryFn: async () => {
      if (live) return fetchTeamsLive();
      const report = await fetchTeamsReport({ from: day, to: day });
      return { employees: report.records || [] };
    },
    enabled: Boolean(day) && enabled,
    refetchInterval: live ? 60000 : false,
    retry,
  });

export const useTeamsTimeline = (employeeId, day, { live = false, enabled = true } = {}) =>
  useQuery({
    queryKey: teamsPresenceKeys.timeline(employeeId, day),
    queryFn: () => fetchTeamsTimeline({ employeeId, date: day }),
    enabled: Boolean(employeeId && day) && enabled,
    refetchInterval: live ? 60000 : false,
    retry,
  });
