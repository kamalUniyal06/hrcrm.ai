import { smartGateway } from "../services/api";
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
