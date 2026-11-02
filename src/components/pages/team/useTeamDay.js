import { useMemo } from "react";
import { useActivityOnDay } from "../../../queries/attendance.queries";
import { useTeamsPresenceDay } from "../../../queries/teamsPresence.queries";
import { useLeavesOnDay } from "../../employement/components/home/homeDashboard.queries";
import { timeToMinutes, useAttendanceLimits } from "../../employement/attendanceLimits";
import { dateKey } from "../../employement/components/attendance/adminAttendanceUtils";
import { teamDayStatus } from "../../../utils/teamDay";

/**
 * Today's attendance for the people on the team page: `statusOf(person)` once the day's clock-ins
 * load, null when the role can't read them. Teams presence shows only for roles that may read it.
 */
export default function useTeamDay() {
  const day = dateKey(new Date());
  const limits = useAttendanceLimits();
  const activity = useActivityOnDay(day);
  const leaves = useLeavesOnDay({ day });
  const teams = useTeamsPresenceDay(day, { live: true });
  const lateAfter = (timeToMinutes(limits.actualLoginTime) ?? 570) + limits.loginDelayMinutes;
  return useMemo(
    () =>
      activity.isSuccess
        ? teamDayStatus({
            activity: activity.data,
            leaves: leaves.data ?? [],
            presence: teams.data?.employees ?? [],
            day,
            lateAfter,
            lunchLimit: limits.lunchOutMinutes,
          })
        : null,
    [activity.isSuccess, activity.data, leaves.data, teams.data, day, lateAfter, limits.lunchOutMinutes],
  );
}
