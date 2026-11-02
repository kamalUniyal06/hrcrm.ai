// Real-time events from the CRM (Org/HrcRealtime.php). The CRM posts to the socket server, which
// re-emits them to every browser; the app keeps its own, then refetches through the API. Events are
// a signal only: they never carry notification bodies, salary figures or termination reasons.

const text = (value) => String(value ?? "").trim();
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** `realtime_config` as the listener needs it, or null when the socket is off or not configured. */
export function realtimeSettings(config) {
  if (!isObject(config) || config.enabled === false || config.enabled === 0 || config.enabled === "0") return null;
  const url = text(config.socket_url);
  if (!/^https?:\/\//i.test(url)) return null;
  return {
    url,
    event: text(config.listen_event) || "activity",
    userId: text(config.user_id),
    broadcast: text(config.broadcast_user_id) || "all",
    crm: text(config.crm).toLowerCase(),
  };
}

/**
 * One socket message as `{ name, userId, message, chatId, type, details }`, or null. The server
 * forwards the CRM's `data`; a whole `{ event, data }` body or a JSON string is unwrapped too.
 */
export function parseRealtimeEvent(raw) {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (isObject(value) && value.msg_type === undefined && isObject(value.data)) value = value.data;
  if (!isObject(value) || !text(value.msg_type)) return null;
  return {
    name: text(value.name),
    userId: text(value.user_id),
    message: text(value.message),
    chatId: text(value.chat_id),
    type: text(value.msg_type),
    details: isObject(value.details) ? value.details : {},
  };
}

/**
 * Only events from this CRM, for this employee or everyone. GuestPostCRM's own mail events share
 * the channel and have no `details.crm`, so the host check drops them.
 */
export function isEventForMe(event, settings) {
  if (!event || !settings) return false;
  if (!settings.crm || text(event.details.crm).toLowerCase() !== settings.crm) return false;
  return event.userId === settings.broadcast || (Boolean(settings.userId) && event.userId === settings.userId);
}

// Query-key prefixes, as defined in src/queries/*.queries.js and the employment feature queries.
const NOTIFICATIONS = [["hr", "notification-counts"], ["hr", "notifications"]];
const ME = [["hr", "me"], ["sidebar"]];
const PEOPLE = [["hr", "people"], ["hr", "employee"], ["hr", "department-members"], ["employees"]];
const ORG = [["hr", "org-tree"], ["hr", "reporting-tree"]];
const SALARY = [["hr", "salary"], ["hr", "payroll-overview"]];

/** Lists to refresh when a record of a CRM module was saved or deleted. */
const MODULE_KEYS = {
  hrc_employees: [...PEOPLE, ...ORG],
  hrc_leaves: [["leaves"], ["hr", "leave-balance"], ["hr", "team-leave-balances"]],
  hrc_leave_tokens: [["hr", "leave-tokens"]],
  hrc_hr_appointments: [["hr", "appointments"], ["hr", "appointment-slots"]],
  hrc_hr_availability: [["hr", "availability"], ["hr", "appointment-slots"]],
  hrc_employee_timeline: [["hr", "timeline"]],
  hrc_salaries: SALARY,
  hrc_salary_structures: SALARY,
  hrc_system_alert: [["system-alerts"]],
  hrc_policies: [["policies"]],
  hrc_quotations: [["quotations"]],
  hrc_holidays: [["holidays"]],
  hrc_teams: [...ORG, ["hr", "people"]],
  hrc_departments: [...ORG, ["hr", "department-members"]],
  hrc_employee_access_overrides: ME,
};

/**
 * Lists behind the route a notification opens. A notification often means that list changed
 * (a leave code was issued), and some modules, such as hrc_leave_tokens, send no record event.
 */
const ROUTE_KEYS = [
  ["/my-leaves", [["hr", "leave-tokens"], ["leaves"], ["hr", "leave-balance"]]],
  ["/leave-approvals", [["hr", "leave-tokens"], ["leaves"]]],
  ["/hr-appointments", [["hr", "appointments"], ["hr", "appointment-slots"]]],
  ["/salaries", SALARY],
  ["/system-alerts", [["system-alerts"]]],
  ["/policies", [["policies"]]],
  ["/org/", [...ORG, ["hr", "me"]]],
  ["/employees", PEOPLE],
];

const routeKeys = (route) => {
  const path = text(route).split(/[?#]/)[0];
  return ROUTE_KEYS.find(([prefix]) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))?.[1] ?? [];
};

/** Query-key prefixes to invalidate for one event; only queries on screen refetch right away. */
export function realtimeRefreshKeys(event) {
  switch (event?.type) {
    case "notification.new":
      return [...NOTIFICATIONS, ...routeKeys(event.details.redirect_to)];
    case "notification.seen":
      return NOTIFICATIONS;
    case "alert.new":
      return [["system-alerts"]];
    case "record.saved":
    case "record.deleted": {
      const module = text(event.details.module);
      if (!module) return [];
      // Dynamic CRM views cache by entity name (entityKeys.allByEntity).
      return [...(MODULE_KEYS[module] ?? []), ["entity", module]];
    }
    case "employee.terminated":
      return [...PEOPLE, ...ORG];
    case "org.changed":
      return [...ORG, ...PEOPLE, ...ME];
    case "access.changed":
      return ME;
    case "salary.locked":
      return SALARY;
    default:
      return [];
  }
}
