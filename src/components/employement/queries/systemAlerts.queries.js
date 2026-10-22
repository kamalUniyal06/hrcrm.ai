import { useQuery } from "@tanstack/react-query";
import { MY_ALERTS_KEY, fetchAlertStatus, fetchAlertTargets, fetchMyAlerts } from "../api/systemAlerts.api";

export const systemAlertKeys = {
  all: ["system-alerts"],
  mine: MY_ALERTS_KEY,
  status: (alertId) => ["system-alerts", "status", alertId],
  targets: (alertId) => ["system-alerts", "targets", alertId],
};

// No retry on 401/403: the client already retried the token, and 403 means no alert access.
const retry = (count, error) => ![401, 403].includes(error?.status) && count < 2;

const hasAlertAccess = (query) => query.state.error?.status !== 403;

// Alerts are not pushed: refresh every 5 minutes and when the tab is visible again.
// A 403 means the role has no alerts, so stop asking.
export const useMyAlerts = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: systemAlertKeys.mine,
    queryFn: fetchMyAlerts,
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: (query) => (hasAlertAccess(query) ? 5 * 60 * 1000 : false),
    refetchOnWindowFocus: hasAlertAccess,
    retry,
  });

export const useAlertStatus = (alertId, { enabled = true } = {}) =>
  useQuery({
    queryKey: systemAlertKeys.status(alertId),
    queryFn: () => fetchAlertStatus(alertId),
    enabled: Boolean(enabled && alertId),
    retry,
  });

export const useAlertTargets = (alertId, { enabled = true } = {}) =>
  useQuery({
    queryKey: systemAlertKeys.targets(alertId),
    queryFn: () => fetchAlertTargets(alertId),
    enabled: Boolean(enabled && alertId),
  });
