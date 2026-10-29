// Shapes the employee-level HR responses (notifications, leave balance, salary, career timeline,
// HR appointments, salary revisions) for the HR screens. Field names follow the backend plan; fallbacks cover
// the generic gateway spellings of the same values.

const text = (value) => String(value ?? "").trim();
const list = (value) => (Array.isArray(value) ? value : []);
const number = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const first = (source, keys) => keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const truthy = (value) => value === true || value === 1 || value === "1" || value === "true";

/** Records from a list response, whichever key the backend used for them. */
export const recordsOf = (data, keys = ["records", "items", "data"]) =>
  Array.isArray(data) ? data : list(first(data, keys));

/**
 * A Date from an ISO string with an offset. CRM datetimes without a zone
 * ("2026-10-28 09:30:00") are stored in UTC, so they are read as UTC.
 */
export function parseDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = text(value);
  const day = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  // A bare date is a calendar day, so it stays on that day in every time zone.
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  const zoned = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const date = new Date(zoned ? raw : `${raw.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** An ISO string with the local offset, e.g. 2026-10-28T15:00:00+05:30. */
export function toIsoWithOffset(date) {
  const value = date instanceof Date ? date : parseDateTime(date);
  if (!value) return "";
  const pad = (n) => String(Math.abs(Math.trunc(n))).padStart(2, "0");
  const offset = -value.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
}

/** "YYYY-MM-DD" for the calendar day of `date` in the given time zone. */
export function dayKey(date, timeZone) {
  const value = parseDateTime(date);
  if (!value) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || undefined, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const formatDate = (value, timeZone, options = { day: "numeric", month: "short", year: "numeric" }) => {
  const date = parseDateTime(value);
  return date ? new Intl.DateTimeFormat("en-IN", { timeZone: timeZone || undefined, ...options }).format(date) : "";
};

export const formatTime = (value, timeZone) => formatDate(value, timeZone, { hour: "numeric", minute: "2-digit" });

export const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number(value));

/* ── notifications ─────────────────────────────────────────────────────── */

export function normalizeNotification(item) {
  const status = text(item?.status).toLowerCase();
  const type = text(first(item, ["type", "notification_type", "priority"])).toLowerCase();
  return {
    ...item,
    id: text(item?.id),
    title: text(first(item, ["title", "name", "subject"])) || "Notification",
    body: text(first(item, ["body", "message", "description"])),
    hot: type === "hot",
    seen: status ? status === "seen" || status === "read" : truthy(first(item, ["seen", "is_seen", "is_read"])),
    linkUrl: text(first(item, ["link_url", "url"])),
    date: first(item, ["date_entered", "created_at", "sent_at", "date"]),
  };
}

export function notificationCounts(data) {
  const source = data?.counts ?? data ?? {};
  return {
    unseen: number(first(source, ["unseen", "unseen_total", "unread"])),
    unseenHot: number(first(source, ["unseen_hot", "hot_unseen"])),
    total: number(first(source, ["total", "all"])),
  };
}

/** In-app links open with the router; anything else opens in a new tab. */
export function notificationTarget(linkUrl, origin = "") {
  const url = text(linkUrl);
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return { internal: true, to: url };
  if (origin && url.startsWith(`${origin}/`)) return { internal: true, to: url.slice(origin.length) };
  return /^https?:\/\//i.test(url) ? { internal: false, to: url } : null;
}

export const NOTICE_AUDIENCES = [
  ["all", "Everyone"], ["department", "A department"], ["team", "A team"], ["role", "A role"], ["employee", "One person"],
];

/**
 * Audiences a sender may address with their notifications create scope. Below "all", the
 * backend only accepts audiences inside that scope, so "Everyone" and roles need "all".
 */
export function noticeAudiences(scope) {
  const allowed = {
    all: ["all", "department", "team", "role", "employee"],
    dept: ["department", "team", "employee"],
    reports: ["team", "employee"],
    team: ["team", "employee"],
  }[scope] || [];
  return NOTICE_AUDIENCES.filter(([id]) => allowed.includes(id));
}

/**
 * Who each audience can target. With "all" any team, department or role; otherwise only the
 * sender's own teams and departments (from `me.employee`). People come from `people`.
 */
export function noticeTargets(audience, { scope, me, lookups, people } = {}) {
  const everyone = scope === "all";
  const options = (items) => list(items).map((item) => ({ id: text(item?.id), name: text(item?.name) || "Unnamed" })).filter((item) => item.id);
  if (audience === "team") return options(everyone ? lookups?.teams : me?.employee?.teams);
  if (audience === "department") return options(everyone ? lookups?.departments : me?.employee?.departments);
  if (audience === "role") return everyone ? options(lookups?.roles) : [];
  if (audience === "employee") return options(people).filter((person) => person.id !== text(me?.employee?.id));
  return [];
}

/** A sent notice: who it went to and how many have read it. */
export function normalizeSentNotice(item) {
  const recipients = number(item?.recipient_count);
  const seen = number(item?.seen_count);
  return {
    ...item,
    id: text(item?.id),
    title: text(first(item, ["title", "name"])) || "Notice",
    hot: text(item?.notification_type).toLowerCase() === "hot",
    audience: NOTICE_AUDIENCES.find(([id]) => id === text(item?.for_notification))?.[1] || text(item?.for_notification),
    recipients,
    seen: Math.min(seen, recipients || seen),
    date: first(item, ["sent_at", "date_entered"]),
  };
}

/* ── leave balance ─────────────────────────────────────────────────────── */

// `leave_balance` sends { available: { planned, sick, total }, types: [{ used }], policy: { *_per_month } }.
export function normalizeLeaveBalance(data) {
  const source = data?.balance ?? data ?? {};
  const available = source.available && typeof source.available === "object" ? source.available : {};
  const types = list(source.types);
  const policy = source.policy ?? {};
  const planned = number(first(available, ["planned"]) ?? first(source, ["planned_available", "planned", "planned_balance"]));
  const sick = number(first(available, ["sick"]) ?? first(source, ["sick_available", "sick", "sick_balance"]));
  const total = first(available, ["total"]) ?? first(source, ["total_available", "total"]);
  const accrual = number(policy.planned_per_month) + number(policy.sick_per_month);
  return {
    planned,
    sick,
    total: total !== undefined ? number(total) : planned + sick,
    usedThisYear: types.length
      ? types.reduce((sum, type) => sum + number(type?.used), 0)
      : number(first(source, ["used_this_year", "used", "taken_this_year"])),
    unpaidDays: number(first(source, ["unpaid_days", "unpaid"])),
    monthlyAccrual: accrual || number(first(source, ["monthly_accrual", "accrual_per_month", "accrual"])),
  };
}

/** `team_leave_balances` rows: employee_id, name, designation, planned, sick, total, used_this_year, unpaid_this_year. */
export function normalizeTeamBalances(data) {
  return recordsOf(data, ["balances", "records", "data"])
    .map((row) => ({
      employeeId: text(first(row, ["employee_id", "id"])),
      name: text(row?.name) || "Unnamed",
      designation: text(row?.designation),
      planned: number(row?.planned),
      sick: number(row?.sick),
      total: row?.total !== undefined ? number(row.total) : number(row?.planned) + number(row?.sick),
      usedThisYear: number(row?.used_this_year),
      unpaidThisYear: number(first(row, ["unpaid_this_year", "unpaid_days"])),
    }))
    .filter((row) => row.employeeId);
}

/** Days beyond the available balance; those become unpaid. */
export const unpaidExtraDays = (requestedDays, available) => Math.max(0, number(requestedDays) - Math.max(0, number(available)));

/* ── salary ────────────────────────────────────────────────────────────── */

// Component keys used by the salary structure and the revise form.
const EARNINGS = [["basic", "Basic"], ["hra", "HRA"], ["special_allowance", "Special allowance"], ["other_allowances", "Other allowances"]];
const DEDUCTIONS = [["pf_employee", "PF (employee)"], ["professional_tax", "Professional tax"], ["tds", "TDS"], ["other_deductions", "Other deductions"]];

const lines = (value, fallbackKeys, structure) => {
  if (Array.isArray(value)) {
    return value.map((line) => ({ label: text(first(line, ["label", "name", "component"])), amount: number(first(line, ["amount", "value"])) }));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, amount]) => ({ label: fallbackKeys.find(([k]) => k === key)?.[1] || key.replace(/_/g, " "), amount: number(amount) }));
  }
  return fallbackKeys.filter(([key]) => structure?.[key] !== undefined).map(([key, label]) => ({ label, amount: number(structure[key]) }));
};

export function normalizeSalary(data) {
  const source = data ?? {};
  const structure = first(source, ["current", "structure", "salary_structure"]) ?? {};
  const earnings = lines(structure.earnings, EARNINGS, structure).filter((line) => line.amount);
  const deductions = lines(structure.deductions, DEDUCTIONS, structure).filter((line) => line.amount);
  const sum = (items) => items.reduce((total, line) => total + line.amount, 0);
  const gross = number(first(structure, ["gross", "gross_monthly"])) || sum(earnings);
  return {
    hasStructure: earnings.length > 0 || gross > 0,
    earnings,
    deductions,
    gross,
    net: number(first(structure, ["net", "net_monthly"])) || gross - sum(deductions),
    ctc: number(first(structure, ["ctc", "annual_ctc"])),
    effectiveFrom: first(structure, ["effective_from", "date"]),
    revisions: list(first(source, ["revisions", "history", "revision_history"])).map((revision) => ({
      ...revision,
      date: first(revision, ["effective_from", "date"]),
      ctc: first(revision, ["annual_ctc", "ctc"]),
      gross: first(revision, ["gross_monthly", "gross"]),
    })),
    payslips: list(first(source, ["payslips", "slips"])).map(normalizePayslip),
  };
}

// Payslips are hrc_salaries rows: month ("October"), salary_year, paid_amount (net), payment_status.
export function normalizePayslip(slip) {
  const month = text(first(slip, ["month", "pay_month"]));
  const year = text(slip?.salary_year);
  return {
    ...slip,
    period: [month, year && !month.includes(year) ? year : ""].filter(Boolean).join(" ")
      || formatDate(slip?.period_start, undefined, { month: "long", year: "numeric" }),
    net: number(first(slip, ["paid_amount", "net_amount", "net_pay", "net"])),
    status: text(first(slip, ["payment_status", "status"])).toLowerCase(),
  };
}

const EMPLOYER = [["pf_employer", "PF (employer, monthly)"], ["bonus_variable", "Bonus / variable (yearly)"]];

/**
 * The revise form's fields, grouped. Employer items count toward CTC only; bonus is yearly.
 * Deductions aren't edited on the form: a revision carries the current ones over unchanged.
 */
export const SALARY_COMPONENT_GROUPS = [
  ["Earnings (monthly)", EARNINGS],
  ["Employer cost", EMPLOYER],
];
const COMPONENT_KEYS = [...EARNINGS, ...DEDUCTIONS, ...EMPLOYER].map(([key]) => key);

export const REVISION_TYPES = [
  ["increment", "Increment"], ["promotion", "Promotion"], ["market_adjustment", "Market adjustment"],
  ["correction", "Correction"], ["decrement", "Decrement"], ["joining", "Joining"],
];

const cents = (value) => Math.round(value * 100) / 100;

/** Every component as a number, blanks as 0: the body `salary_revise` and `promote` expect. */
export const salaryComponents = (values) => Object.fromEntries(COMPONENT_KEYS.map((key) => [key, cents(number(values?.[key]))]));

/** The backend's totals: gross = earnings, net = gross − deductions, CTC = (gross + employer PF) × 12 + bonus. */
export function computeSalary(values) {
  const c = salaryComponents(values);
  const gross = cents(EARNINGS.reduce((sum, [key]) => sum + c[key], 0));
  const deductions = cents(DEDUCTIONS.reduce((sum, [key]) => sum + c[key], 0));
  return { gross, deductions, net: cents(gross - deductions), ctc: cents((gross + c.pf_employer) * 12 + c.bonus_variable) };
}

/** Form values from the current structure, so a revision starts from today's pay. */
export const salaryFormValues = (current) =>
  Object.fromEntries(COMPONENT_KEYS.map((key) => [key, number(current?.[key]) ? String(number(current[key])) : ""]));

/** Change in gross pay, rounded as the backend logs it; null when there is no previous pay. */
export const revisionPercent = (oldGross, newGross) => (number(oldGross) > 0 ? cents(((newGross - number(oldGross)) / number(oldGross)) * 100) : null);

/** `payroll_overview`: { scope, overview: { employees, monthly_gross, monthly_net, annual_ctc, without_structure } }. */
export function normalizePayrollOverview(data) {
  const overview = data?.overview ?? data ?? {};
  return {
    scope: text(data?.scope),
    employees: number(overview.employees),
    monthlyGross: number(overview.monthly_gross),
    monthlyNet: number(overview.monthly_net),
    annualCtc: number(overview.annual_ctc),
    withoutStructure: number(overview.without_structure),
  };
}

/** "YYYY-MM" of the month before `date`: payroll is usually run for the month just finished. */
export function previousMonth(date = new Date()) {
  const value = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * `payroll_run`: { payroll: { month, dry_run, totals, lines } }. A line is a part month when the person
 * joined or left during it, so their pay is prorated.
 */
export function normalizePayrollRun(data) {
  const payroll = data?.payroll ?? data ?? {};
  const totals = payroll.totals ?? {};
  return {
    month: text(payroll.month),
    dryRun: payroll.dry_run === undefined ? true : truthy(payroll.dry_run),
    totals: {
      employees: number(totals.employees),
      gross: number(totals.gross),
      deductions: number(totals.deductions),
      unpaidLeave: number(totals.unpaid_leave),
      net: number(totals.net),
    },
    lines: list(payroll.lines).map((line) => {
      const days = number(line.days_in_month);
      const payableDays = number(line.payable_days);
      const unpaidDays = number(line.unpaid_leave_days);
      return {
        employeeId: text(line.employee_id),
        name: text(line.employee_name) || text(line.email) || "Unnamed",
        email: text(line.email),
        days,
        payableDays,
        unpaidDays,
        gross: number(line.gross_amount),
        deductions: number(line.total_deductions),
        unpaidDeduction: number(line.unpaid_leave_deduction),
        net: number(line.net_amount),
        salaryId: text(line.salary_id),
        partMonth: days > 0 && payableDays + unpaidDays < days,
      };
    }),
  };
}

/* ── career timeline ───────────────────────────────────────────────────── */

export function normalizeTimelineEvent(event) {
  const type = text(first(event, ["event_type", "type"]));
  return {
    ...event,
    id: text(event?.id) || `${type}:${text(first(event, ["event_date", "date"]))}`,
    type,
    typeLabel: text(first(event, ["event_type_label", "type_label"])) || type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    title: text(first(event, ["title", "name", "summary"])) || "Career event",
    description: text(first(event, ["description", "details", "remarks"])),
    date: first(event, ["event_date", "date", "effective_date", "date_entered"]),
    major: truthy(first(event, ["is_major", "major"])),
    manual: truthy(first(event, ["is_manual", "manual"])) || text(event?.source).toLowerCase() === "manual",
  };
}

/** Events newest first. */
export const sortTimeline = (events) =>
  list(events).map(normalizeTimelineEvent).sort((a, b) => (parseDateTime(b.date)?.getTime() || 0) - (parseDateTime(a.date)?.getTime() || 0));

/** `timeline` sends { timeline: { tenure, events } }; tenure.next_anniversary is { date, years, in_days }. */
export function timelineSummary(data) {
  const source = data?.timeline && !Array.isArray(data.timeline) ? data.timeline : data ?? {};
  const tenure = source.tenure ?? null;
  const next = tenure?.next_anniversary ?? source.next_anniversary;
  const types = source.event_types && typeof source.event_types === "object" ? source.event_types : {};
  return {
    events: sortTimeline(Array.isArray(source) ? source : first(source, ["events", "records", "data"])),
    tenure,
    nextAnniversary: next && typeof next === "object" ? next.date ?? null : next ?? null,
    // [key, label] pairs for the "Add event" picker, from `event_types`.
    eventTypes: Object.entries(types).map(([key, label]) => [key, text(label) || key]),
  };
}

/** The event types present, with how many of each, for the filter chips. */
export function timelineTypes(events) {
  const counts = new Map();
  for (const event of list(events)) {
    const current = counts.get(event.type);
    counts.set(event.type, { type: event.type, label: event.typeLabel, count: (current?.count || 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Pages in a list response: `total_pages`, or `total` over `per_page`. */
export function pageCount(data) {
  const pages = number(data?.total_pages);
  if (pages) return pages;
  const perPage = number(data?.per_page);
  return perPage ? Math.max(1, Math.ceil(number(data?.total) / perPage)) : 1;
}

/* ── HR appointments ───────────────────────────────────────────────────── */

export const APPOINTMENT_TOPICS = [
  ["general", "General"], ["payroll", "Payroll"], ["leave", "Leave"], ["grievance", "Grievance"], ["career", "Career"],
  ["documents", "Documents"], ["onboarding", "Onboarding"], ["exit", "Exit"], ["other", "Other"],
];
export const APPOINTMENT_MODES = [["in_person", "In person"], ["video", "Video call"], ["phone", "Phone"]];
export const APPOINTMENT_STATUSES = { requested: "Waiting for HR", booked: "Booked", confirmed: "Confirmed", rescheduled: "Rescheduled", completed: "Completed", cancelled: "Cancelled", canceled: "Cancelled", no_show: "Missed" };
export const optionLabel = (options, value) => options.find(([key]) => key === value)?.[1] || text(value).replace(/_/g, " ");

/** HR people who take bookings, and the time zone their slots are shown in. */
export function normalizeHrList(data) {
  const people = recordsOf(data, ["hr", "people", "records", "data"]).map((person) => ({
    id: text(person?.id ?? person?.employee_id),
    name: text(first(person, ["name", "full_name", "employee_name"])) || "HR",
    title: text(first(person, ["designation", "current_designation", "title"])),
  })).filter((person) => person.id);
  const timeZone = text(first(data, ["timezone", "time_zone"])) || text(first(recordsOf(data, ["hr", "people", "records", "data"])[0], ["timezone"]));
  return { people, timeZone: timeZone || undefined };
}

const CLOSED = new Set(["cancelled", "canceled", "completed", "no_show"]);

export function normalizeAppointment(item) {
  return {
    ...item,
    id: text(item?.id),
    status: text(item?.status).toLowerCase() || "booked",
    topic: text(item?.topic),
    mode: text(item?.mode),
    start: first(item, ["start", "start_time", "date_start"]),
    end: first(item, ["end", "end_time", "date_end"]),
    hrName: text(first(item, ["hr_name", "hr_employee_name"])) || text(item?.hr?.name),
    agenda: text(first(item, ["agenda", "description"])),
    location: text(item?.location),
    meetingLink: text(item?.meeting_link),
  };
}

/** Upcoming (soonest first) and past (latest first). Cancelled and finished bookings are past. */
export function splitAppointments(items, now = new Date()) {
  const all = list(items).map(normalizeAppointment);
  const time = (item) => parseDateTime(item.start)?.getTime() || 0;
  const upcoming = all.filter((item) => !CLOSED.has(item.status) && time(item) >= now.getTime()).sort((a, b) => time(a) - time(b));
  const ids = new Set(upcoming.map((item) => item.id));
  const past = all.filter((item) => !ids.has(item.id)).sort((a, b) => time(b) - time(a));
  return { upcoming, past };
}

/** Slots grouped by day in the HR time zone: [{ day, slots: [{ start, end, hrId, hrName }] }]. */
export function groupSlots(data, timeZone) {
  const raw = Array.isArray(data?.days)
    ? data.days.flatMap((day) => list(day.slots))
    : recordsOf(data, ["slots", "records", "data"]);
  const byDay = new Map();
  for (const slot of raw) {
    const start = typeof slot === "string" ? slot : first(slot, ["start", "start_time"]);
    if (!parseDateTime(start)) continue;
    if (slot?.available === false || truthy(slot?.booked)) continue;
    const key = dayKey(start, timeZone);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push({
      start,
      end: typeof slot === "string" ? null : first(slot, ["end", "end_time"]),
      hrId: text(first(slot, ["hr_employee_id", "hr_id"])),
      hrName: text(first(slot, ["hr_name", "hr_employee_name"])),
    });
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, slots]) => ({ day, slots: slots.sort((a, b) => parseDateTime(a.start) - parseDateTime(b.start)) }));
}

/* ── leave tokens ──────────────────────────────────────────────────────── */

// A leave token is a one-time code from a team lead, manager or department head above the
// employee. It is required to apply for leave when the backend setting is on.

export const LEAVE_TOKEN_STATUSES = {
  requested: "Waiting", issued: "Ready to use", used: "Used", rejected: "Refused", revoked: "Cancelled", expired: "Expired",
};
export const APPROVER_RELATIONS = { manager: "Manager", team_lead: "Team lead", department_head: "Department head" };

/** What the backend accepts: letters and digits only, upper case. */
export const tokenCode = (value) => text(value).replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export function normalizeLeaveToken(row) {
  return {
    id: text(row?.id),
    status: text(row?.status).toLowerCase(),
    code: text(row?.token_code),
    employeeId: text(row?.employee_id),
    employeeName: text(row?.employee_name) || "Employee",
    issuedByName: text(row?.issued_by_name),
    requestedFromId: text(row?.requested_from_id),
    requestedFromName: text(row?.requested_from_name),
    leaveFrom: text(row?.leave_from).slice(0, 10),
    leaveTo: text(row?.leave_to).slice(0, 10),
    leaveType: text(row?.leave_type),
    reason: text(row?.reason),
    remarks: text(row?.remarks),
    // Stored in UTC without a zone, which parseDateTime reads as UTC.
    expiresAt: text(row?.expires_at),
    askedAt: text(row?.date_entered),
  };
}

/** `leave_token_approvers`: whether a code is needed, and who can give one. */
export function normalizeTokenApprovers(data) {
  const settings = data?.settings ?? {};
  return {
    required: truthy(settings.required),
    expiryHours: number(settings.expiry_hours) || 72,
    approvers: list(data?.approvers?.manager).map((person) => ({
      id: text(person?.id),
      name: text(person?.name) || "Approver",
      relation: APPROVER_RELATIONS[text(person?.relation)] || "Manager",
    })).filter((person) => person.id),
  };
}

/** True when a token can be used for this leave: it has no fixed dates, or the same ones. */
export const tokenFitsDates = (token, from, to) =>
  !token.leaveFrom || !from || (token.leaveFrom === from && (token.leaveTo || token.leaveFrom) === (to || from));

/** "10 Nov – 12 Nov 2026", "10 Nov 2026", or "" without dates. */
export function tokenDates(token) {
  if (!token.leaveFrom) return "";
  const last = token.leaveTo && token.leaveTo !== token.leaveFrom ? token.leaveTo : "";
  return last
    ? `${formatDate(token.leaveFrom, undefined, { day: "numeric", month: "short" })} – ${formatDate(last)}`
    : formatDate(token.leaveFrom);
}

/* ── HR availability ───────────────────────────────────────────────────── */

export const WEEKDAYS = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [7, "Sunday"]];

const active = (rule) => rule?.is_active === undefined || truthy(rule.is_active);

/**
 * `hr_availability`: weekly hours for each day Monday → Sunday (earliest first) and time-off
 * blocks (soonest first). Block times are stored in UTC.
 */
export function normalizeAvailability(data) {
  const rules = recordsOf(data, ["rules", "records", "data"]);
  const isBlock = (rule) => text(rule?.rule_type) === "block";
  const time = (value) => parseDateTime(value)?.getTime() || 0;
  return {
    timeZone: text(data?.timezone) || undefined,
    weekly: WEEKDAYS.map(([day, label]) => ({
      day,
      label,
      rules: rules
        .filter((rule) => !isBlock(rule) && number(rule.day_of_week) === day)
        .map((rule) => ({
          id: text(rule.id),
          start: text(rule.start_time).slice(0, 5),
          end: text(rule.end_time).slice(0, 5),
          slotMinutes: number(rule.slot_minutes) || 30,
          active: active(rule),
          validFrom: text(rule.valid_from).replace(/^0000-00-00$/, ""),
          validTo: text(rule.valid_to).replace(/^0000-00-00$/, ""),
        }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    })),
    blocks: rules
      .filter(isBlock)
      .map((rule) => ({ id: text(rule.id), start: text(rule.block_start), end: text(rule.block_end), note: text(rule.description), active: active(rule) }))
      .sort((a, b) => time(a.start) - time(b.start)),
  };
}

/** Monday-to-Sunday week containing `date`, as YYYY-MM-DD keys (local calendar). */
export function weekRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start, from: key(start), to: key(end) };
}
