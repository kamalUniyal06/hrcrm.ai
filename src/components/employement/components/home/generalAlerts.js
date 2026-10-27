// General alerts for admins, worked out in the browser from today's data. They need no answer:
// an admin can hide one, and it stays hidden for the rest of that day only. Tomorrow's alerts
// are worked out afresh, so nothing carries over from one day to the next.
export const NO_CHECK_IN_BY = 11 * 60; // 11:00 AM, India time
export const LEAVE_WAITING_DAYS = 2;
export const QUOTATION_OVERDUE_DAYS = 7;

const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;

/** Minutes since midnight in India time. */
export function indiaMinutes(date = new Date()) {
  const [hour, minute] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(date)
    .split(":")
    .map(Number);
  return hour * 60 + minute;
}

/** Weekdays that aren't public holidays. `holidays` is a Set of YYYY-MM-DD keys. */
export function isWorkingDay(day, holidays = new Set()) {
  const weekday = new Date(`${day}T00:00:00`).getDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(day);
}

/**
 * Today's alerts, most urgent first, as { id, tone, title, detail, people, action: { label, to } }.
 * - notCheckedIn: employees not on leave who haven't checked in ({ key, name }); shown from 11:00 AM on working days.
 * - waitingLeaves: leave requests still awaiting a decision LEAVE_WAITING_DAYS or more after they were applied.
 * - overdueQuotations: unpaid quotations outstanding for more than QUOTATION_OVERDUE_DAYS days.
 */
export function generalAlerts({ day, minutes, workingDay = true, notCheckedIn = [], waitingLeaves = [], overdueQuotations = [] }) {
  const alerts = [];
  if (workingDay && minutes >= NO_CHECK_IN_BY && notCheckedIn.length) {
    alerts.push({
      id: `${day}:no-check-in`,
      tone: "danger",
      title: `${plural(notCheckedIn.length, "employee")} not checked in by 11:00 AM`,
      detail: "Not on leave and no check-in recorded today.",
      people: notCheckedIn,
      action: { label: "Open attendance", to: "/attendance?filter=missing" },
    });
  }
  if (waitingLeaves.length) {
    alerts.push({
      id: `${day}:leave-waiting`,
      tone: "warning",
      title: `${plural(waitingLeaves.length, "leave request")} waiting ${LEAVE_WAITING_DAYS}+ days for a decision`,
      detail: "Employees are still waiting to hear back.",
      people: waitingLeaves,
      action: { label: "Review leave", to: "/leave-approvals" },
    });
  }
  if (overdueQuotations.length) {
    alerts.push({
      id: `${day}:quotations-overdue`,
      tone: "warning",
      title: `${plural(overdueQuotations.length, "quotation")} unpaid for over ${QUOTATION_OVERDUE_DAYS} days`,
      detail: "Workers are still waiting to be paid.",
      people: overdueQuotations,
      action: { label: "Open quotations", to: "/quotations?status=unpaid" },
    });
  }
  return alerts;
}

export const hiddenAlertsKey = (userId) => `general-alerts-hidden:${userId}`;

/** Ids of the alerts this admin hid today. Anything saved on an earlier day is ignored. */
export function readHiddenAlerts(storage, userId, day) {
  try {
    const saved = JSON.parse(storage.getItem(hiddenAlertsKey(userId)) || "null");
    return new Set(saved?.day === day && Array.isArray(saved.ids) ? saved.ids : []);
  } catch {
    return new Set();
  }
}

/** Hides an alert for the rest of `day`. One small entry per admin, replaced each new day. */
export function hideAlert(storage, userId, day, id) {
  const ids = readHiddenAlerts(storage, userId, day);
  ids.add(id);
  try {
    storage.setItem(hiddenAlertsKey(userId), JSON.stringify({ day, ids: [...ids] }));
  } catch {
    // Storage may be blocked; the alert then stays hidden until the page reloads.
  }
  return ids;
}
