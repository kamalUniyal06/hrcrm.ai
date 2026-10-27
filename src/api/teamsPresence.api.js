import { apiRequest } from "../services/api";
import { CRM_ENDPOINT } from "../services/crmUrl";

// Read-only Teams presence collected by a cron job on the CRM (see the Teams Presence API doc).
// crmClient attaches the CRM Bearer token for this entry point and retries once on a 401.
const TEAMS_PRESENCE_URL = CRM_ENDPOINT;

async function teamsPresence(params) {
  let response;
  try {
    response = await apiRequest({ endpoint: TEAMS_PRESENCE_URL, params: { entryPoint: "teams_presence", ...params } });
  } catch (error) {
    if (!error.response) throw error;
    // Errors come back as { success: false, error } with a meaningful HTTP code (403 = role lacks access).
    const failure = new Error(error.response.data?.error || "Could not load Teams activity.");
    failure.status = error.response.status;
    throw failure;
  }
  if (response?.success !== true) throw new Error(response?.error || "Could not load Teams activity.");
  return response;
}

// Today's status and totals for every tracked employee, plus collector health.
export const fetchTeamsLive = () => teamsPresence({ action: "live" });

// One record per employee per day for an inclusive YYYY-MM-DD range (up to 92 days).
export const fetchTeamsReport = ({ from, to, employeeId }) =>
  teamsPresence({ action: "report", from, to, ...(employeeId ? { employee_id: employeeId } : {}) });

// One employee's status periods for one day, in order.
export const fetchTeamsTimeline = ({ employeeId, date }) =>
  teamsPresence({ action: "timeline", employee_id: employeeId, date });
