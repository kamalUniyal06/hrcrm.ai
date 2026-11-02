import { smartGateway } from "../services/api";
import { fetchAllRecords } from "../components/pages/candidates/candidatesApi";
import {
  buildAttendanceStatsQueries,
  readAttendanceStats,
} from "../components/employement/components/attendance/adminAttendanceUtils";

// Overview totals for one YYYY-MM-DD attendance day.
export async function fetchAttendanceStats(day) {
  const response = await smartGateway({
    method: "POST",
    body: { action: "get_stats", queries: buildAttendanceStatsQueries(day) },
  });
  return readAttendanceStats(response);
}

// Clock-in records for one YYYY-MM-DD day; the gateway keeps them to the caller's read scope.
export const fetchActivityOnDay = (day) =>
  fetchAllRecords("hrc_daily_activity", { field: "date_entered", from: `${day} 00:00:00`, to: `${day} 23:59:59` });
