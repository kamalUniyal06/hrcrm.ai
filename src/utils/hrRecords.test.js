import test from "node:test";
import assert from "node:assert/strict";
import {
  computeSalary,
  dayKey,
  groupSlots,
  normalizeHrList,
  normalizeAvailability,
  normalizeLeaveBalance,
  normalizeLeaveToken,
  normalizeNotification,
  normalizePayrollOverview,
  normalizePayrollRun,
  normalizeSalary,
  normalizeSentNotice,
  normalizeTeamBalances,
  normalizeTokenApprovers,
  noticeAudiences,
  noticeTargets,
  notificationCounts,
  notificationTarget,
  pageCount,
  parseDateTime,
  previousMonth,
  recordsOf,
  revisionPercent,
  SALARY_COMPONENT_GROUPS,
  salaryComponents,
  salaryFormValues,
  sortTimeline,
  splitAppointments,
  timelineSummary,
  timelineTypes,
  tokenCode,
  tokenDates,
  tokenFitsDates,
  tokenForLeave,
  toIsoWithOffset,
  unpaidExtraDays,
  weekRange,
} from "./hrRecords.js";

test("reads CRM datetimes without a zone as UTC and bare dates as calendar days", () => {
  assert.equal(parseDateTime("2026-10-28 09:30:00").toISOString(), "2026-10-28T09:30:00.000Z");
  assert.equal(parseDateTime("2026-10-28T15:00:00+05:30").toISOString(), "2026-10-28T09:30:00.000Z");
  assert.equal(parseDateTime("2026-10-28").getDate(), 28);
  assert.equal(parseDateTime("not a date"), null);
  assert.equal(parseDateTime(""), null);
});

test("sends local times as ISO strings with an offset", () => {
  const iso = toIsoWithOffset(new Date(2026, 9, 28, 15, 0, 0));
  assert.match(iso, /^2026-10-28T15:00:00[+-]\d{2}:\d{2}$/);
  assert.equal(new Date(iso).getTime(), new Date(2026, 9, 28, 15, 0, 0).getTime());
  assert.equal(toIsoWithOffset("garbage"), "");
});

test("keys a moment to its day in the given time zone", () => {
  assert.equal(dayKey("2026-10-28T20:00:00Z", "Asia/Kolkata"), "2026-10-29");
  assert.equal(dayKey("2026-10-28T20:00:00Z", "UTC"), "2026-10-28");
});

test("normalises notifications and their seen state", () => {
  const hot = normalizeNotification({ id: 1, name: "Payroll done", type: "hot", status: "unseen", link_url: "/salaries" });
  assert.equal(hot.title, "Payroll done");
  assert.equal(hot.hot, true);
  assert.equal(hot.seen, false);
  assert.equal(normalizeNotification({ is_seen: "1" }).seen, true);
  assert.equal(normalizeNotification({}).title, "Notification");
  assert.deepEqual(notificationCounts({ unseen: "4", unseen_hot: 1 }), { unseen: 4, unseenHot: 1, total: 0 });
  assert.deepEqual(notificationCounts({ counts: { unread: 2 } }).unseen, 2);
});

test("opens in-app notification links with the router and others in a new tab", () => {
  assert.deepEqual(notificationTarget("/my-leaves"), { internal: true, to: "/my-leaves" });
  assert.deepEqual(notificationTarget("https://app.hrcrm.ai/hr-appointments", "https://app.hrcrm.ai"), { internal: true, to: "/hr-appointments" });
  assert.deepEqual(notificationTarget("https://example.com/x"), { internal: false, to: "https://example.com/x" });
  assert.equal(notificationTarget("//evil.example"), null);
  assert.equal(notificationTarget("javascript:alert(1)"), null);
  assert.equal(notificationTarget(""), null);
});

test("reads the leave balance and counts days that would be unpaid", () => {
  const balance = normalizeLeaveBalance({ planned_available: "8", sick_available: 3, total_available: 11, used_this_year: 4, unpaid_days: 1, monthly_accrual: 1.5 });
  assert.deepEqual(balance, { planned: 8, sick: 3, total: 11, usedThisYear: 4, unpaidDays: 1, monthlyAccrual: 1.5 });
  assert.equal(unpaidExtraDays(5, 3), 2);
  assert.equal(unpaidExtraDays(2, 3), 0);
  assert.equal(unpaidExtraDays(2, -1), 2);
});

test("reads the leave_balance response: available, per-type usage and the accrual policy", () => {
  const balance = normalizeLeaveBalance({
    balance: {
      available: { planned: 4, sick: 2.5, total: 6.5 },
      types: [{ key: "planned", used: 3 }, { key: "sick", used: 1.5 }],
      unpaid_days: 1,
      policy: { stage: "Confirmed", planned_per_month: 1.5, sick_per_month: 0.5 },
    },
  });
  assert.deepEqual(balance, { planned: 4, sick: 2.5, total: 6.5, usedThisYear: 4.5, unpaidDays: 1, monthlyAccrual: 2 });
  assert.equal(normalizeLeaveBalance({ balance: { available: { planned: 2, sick: 1 } } }).total, 3);
});

test("reads payslips and revision amounts from the salary response", () => {
  const salary = normalizeSalary({
    current: { basic: 30000, gross_monthly: 30000, net_monthly: 28000, annual_ctc: 360000 },
    history: [{ id: "s1", revision_type: "increment", effective_from: "2026-04-01", annual_ctc: 360000, gross_monthly: 30000 }],
    payslips: [{ id: "p1", month: "October", salary_year: "2026", paid_amount: "27500", payment_status: "Paid" }],
  });
  assert.equal(salary.revisions[0].ctc, 360000);
  assert.equal(salary.revisions[0].date, "2026-04-01");
  assert.equal(salary.payslips[0].period, "October 2026");
  assert.equal(salary.payslips[0].net, 27500);
  assert.equal(salary.payslips[0].status, "paid");
});

test("counts notification pages from total and per_page", () => {
  assert.equal(pageCount({ total: 41, per_page: 20 }), 3);
  assert.equal(pageCount({ total: 0, per_page: 20 }), 1);
  assert.equal(pageCount({ total_pages: 4 }), 4);
  assert.equal(pageCount(undefined), 1);
});

test("builds the salary structure from flat components when no lines are sent", () => {
  const salary = normalizeSalary({
    structure: { basic: "30,000", hra: 12000, special_allowance: 0, pf_employee: 1800, tds: 1200, ctc: 600000 },
    revisions: [{ id: 1 }],
  });
  assert.deepEqual(salary.earnings.map((line) => line.label), ["Basic", "HRA"]);
  assert.equal(salary.gross, 42000);
  assert.equal(salary.net, 39000);
  assert.equal(salary.ctc, 600000);
  assert.equal(salary.revisions.length, 1);
  assert.equal(normalizeSalary(null).hasStructure, false);
});

test("uses the backend's own lines and totals when present", () => {
  const salary = normalizeSalary({ current: { earnings: [{ label: "Basic", amount: 100 }], deductions: { tds: 10 }, gross: 120, net: 105 } });
  assert.deepEqual(salary.earnings, [{ label: "Basic", amount: 100 }]);
  assert.deepEqual(salary.deductions, [{ label: "TDS", amount: 10 }]);
  assert.equal(salary.gross, 120);
  assert.equal(salary.net, 105);
});

test("sorts the career timeline newest first", () => {
  const events = sortTimeline([
    { id: 1, event_type: "joining", event_date: "2023-01-10" },
    { id: 2, event_type: "promotion", event_date: "2025-04-01", is_major: "1" },
  ]);
  assert.deepEqual(events.map((event) => event.id), ["2", "1"]);
  assert.equal(events[0].typeLabel, "Promotion");
  assert.equal(events[0].major, true);
  assert.equal(events[1].major, false);
});

test("reads the timeline response and its next anniversary, and counts event types", () => {
  const summary = timelineSummary({
    timeline: {
      tenure: { label: "1 year 8 months", next_anniversary: { date: "2027-02-12", years: 2, in_days: 107 } },
      events: [
        { id: null, event_type: "hired", type_label: "Hired", event_date: "2025-02-12", is_major: true },
        { id: "t2", event_type: "team_change", type_label: "Team changed", event_date: "2025-09-01" },
        { id: "t3", event_type: "team_change", type_label: "Team changed", event_date: "2026-03-01" },
      ],
    },
  });
  assert.equal(summary.events.length, 3);
  assert.equal(summary.events[0].id, "t3");
  assert.equal(summary.tenure.label, "1 year 8 months");
  assert.equal(summary.nextAnniversary, "2027-02-12");
  assert.deepEqual(timelineSummary({ timeline: { events: [], event_types: { award: "Award", note: "Note" } } }).eventTypes, [["award", "Award"], ["note", "Note"]]);
  assert.deepEqual(timelineTypes(summary.events).map((item) => [item.type, item.count]), [["team_change", 2], ["hired", 1]]);
  assert.deepEqual(timelineSummary(undefined).events, []);
});

test("splits appointments into upcoming and past", () => {
  const now = new Date("2026-10-28T10:00:00Z");
  const { upcoming, past } = splitAppointments([
    { id: "a", start: "2026-10-30T10:00:00Z", status: "booked" },
    { id: "b", start: "2026-10-29T10:00:00Z", status: "confirmed" },
    { id: "c", start: "2026-10-31T10:00:00Z", status: "cancelled" },
    { id: "d", start: "2026-10-01T10:00:00Z", status: "completed" },
  ], now);
  assert.deepEqual(upcoming.map((item) => item.id), ["b", "a"]);
  assert.deepEqual(past.map((item) => item.id), ["c", "d"]);
});

test("groups open slots by day in the HR time zone", () => {
  const days = groupSlots({
    slots: [
      { start: "2026-10-29T04:30:00Z", hr_employee_id: "h1" },
      { start: "2026-10-28T20:00:00Z" },
      { start: "2026-10-29T03:30:00Z", available: false },
      { start: "bad" },
    ],
  }, "Asia/Kolkata");
  assert.deepEqual(days.map((day) => day.day), ["2026-10-29"]);
  assert.equal(days[0].slots.length, 2);
  assert.equal(days[0].slots[0].start, "2026-10-28T20:00:00Z");
  assert.equal(groupSlots({ days: [{ date: "x", slots: ["2026-10-29T04:30:00Z"] }] }, "UTC")[0].slots.length, 1);
});

test("finds the Monday-to-Sunday week and list records", () => {
  assert.deepEqual(
    (({ from, to }) => ({ from, to }))(weekRange(new Date(2026, 9, 28))),
    { from: "2026-10-26", to: "2026-11-01" },
  );
  assert.equal(weekRange(new Date(2026, 10, 1)).from, "2026-10-26");
  assert.deepEqual(recordsOf({ records: [1] }), [1]);
  assert.deepEqual(recordsOf([2]), [2]);
  assert.deepEqual(recordsOf({ notifications: [3] }, ["notifications"]), [3]);
  assert.deepEqual(recordsOf(null), []);
});

test("reads the HR people and their time zone", () => {
  assert.deepEqual(normalizeHrList({ hr: [{ id: "h1", name: "Nisha", designation: "HRBP" }, { name: "No id" }], timezone: "Asia/Kolkata" }), {
    people: [{ id: "h1", name: "Nisha", title: "HRBP" }],
    timeZone: "Asia/Kolkata",
  });
  assert.equal(normalizeHrList([{ employee_id: "h2", full_name: "Om", timezone: "Europe/London" }]).timeZone, "Europe/London");
  assert.deepEqual(normalizeHrList(null), { people: [], timeZone: undefined });
});

test("limits notice audiences to what the sender's scope can reach", () => {
  const ids = (scope) => noticeAudiences(scope).map(([id]) => id);
  assert.deepEqual(ids("all"), ["all", "department", "team", "role", "employee"]);
  assert.deepEqual(ids("team"), ["team", "employee"]);
  assert.deepEqual(ids("dept"), ["department", "team", "employee"]);
  assert.deepEqual(ids("own"), []);
  assert.deepEqual(ids("none"), []);
});

test("offers only the sender's own teams below all scope, and never the sender as a person", () => {
  const me = { employee: { id: "e1", teams: [{ id: "t1", name: "Frontend", membership: "lead" }], departments: [{ id: "d1", name: "Engineering" }] } };
  const lookups = { teams: [{ id: "t1", name: "Frontend" }, { id: "t2", name: "Design" }], roles: [{ id: "r1", name: "Team Lead" }] };
  assert.deepEqual(noticeTargets("team", { scope: "team", me, lookups }), [{ id: "t1", name: "Frontend" }]);
  assert.equal(noticeTargets("team", { scope: "all", me, lookups }).length, 2);
  assert.deepEqual(noticeTargets("role", { scope: "team", me, lookups }), []);
  assert.deepEqual(noticeTargets("employee", { me, people: [{ id: "e1", name: "Me" }, { id: "e2", name: "Asha" }] }), [{ id: "e2", name: "Asha" }]);
});

test("reads sent notices with their read counts", () => {
  const notice = normalizeSentNotice({ id: "n1", title: "Stand-up moved", notification_type: "hot", for_notification: "team", recipient_count: "6", seen_count: "4", sent_at: "2026-10-28 09:00:00" });
  assert.equal(notice.audience, "A team");
  assert.equal(notice.hot, true);
  assert.equal(notice.recipients, 6);
  assert.equal(notice.seen, 4);
});

test("reads team leave balances", () => {
  const rows = normalizeTeamBalances({ scope: "team", balances: [
    { employee_id: "e2", name: "Asha", designation: "Developer", planned: 4, sick: 2, total: 6, used_this_year: 5, unpaid_this_year: 1 },
    { name: "No id" },
  ] });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { employeeId: "e2", name: "Asha", designation: "Developer", planned: 4, sick: 2, total: 6, usedThisYear: 5, unpaidThisYear: 1 });
});

test("computes salary totals with the backend's formulas", () => {
  const totals = computeSalary({ basic: "30,000", hra: 12000, special_allowance: "", pf_employee: 1800, tds: 1200, pf_employer: 1800, bonus_variable: 50000 });
  assert.deepEqual(totals, { gross: 42000, deductions: 3000, net: 39000, ctc: (42000 + 1800) * 12 + 50000 });
  assert.equal(salaryComponents({ basic: "100.555", hra: "" }).hra, 0);
  assert.equal(salaryComponents({ basic: "100.555" }).basic, 100.56);
  assert.equal(Object.keys(salaryComponents({})).length, 10);
});

test("starts a revision from the current structure and reports the change", () => {
  const values = salaryFormValues({ basic: 30000, hra: 0, tds: "1200" });
  assert.equal(values.basic, "30000");
  assert.equal(values.hra, "");
  assert.equal(values.tds, "1200");
  assert.equal(revisionPercent(40000, 44000), 10);
  assert.equal(revisionPercent(0, 44000), null);
});

test("reads the payroll overview", () => {
  const overview = normalizePayrollOverview({ scope: "reports", overview: { employees: 4, monthly_gross: "160000", monthly_net: 150000, annual_ctc: 2000000, without_structure: 1 } });
  assert.deepEqual(overview, { scope: "reports", employees: 4, monthlyGross: 160000, monthlyNet: 150000, annualCtc: 2000000, withoutStructure: 1 });
});

test("keeps the current deductions in a revision although the form doesn't show them", () => {
  assert.equal(SALARY_COMPONENT_GROUPS.some(([, fields]) => fields.some(([key]) => key === "tds")), false);
  const values = salaryFormValues({ basic: 30000, tds: 1200 });
  assert.equal(salaryComponents({ ...values, basic: "35000" }).tds, 1200);
});

test("payroll is run for the month just finished, across a year end", () => {
  assert.equal(previousMonth(new Date(2026, 9, 29)), "2026-09");
  assert.equal(previousMonth(new Date(2026, 0, 5)), "2025-12");
});

test("reads a payroll preview and flags part months", () => {
  const run = normalizePayrollRun({
    payroll: {
      month: "2026-09",
      dry_run: true,
      totals: { employees: 2, gross: 90000, deductions: 3600, unpaid_leave: 1000, net: 85400 },
      lines: [
        { employee_id: "e1", employee_name: "Gagan Kumar", days_in_month: 30, payable_days: 29, unpaid_leave_days: 1, gross_amount: 30000, total_deductions: 1800, unpaid_leave_deduction: 1000, net_amount: 27200 },
        { employee_id: "e2", employee_name: "", email: "new@hrcrm.ai", days_in_month: 30, payable_days: 15, unpaid_leave_days: 0, gross_amount: "60,000", net_amount: 58200, salary_id: "s2" },
      ],
    },
  });
  assert.equal(run.month, "2026-09");
  assert.equal(run.dryRun, true);
  assert.deepEqual(run.totals, { employees: 2, gross: 90000, deductions: 3600, unpaidLeave: 1000, net: 85400 });
  // An unpaid day is still a day worked in the month, so the first line is a full month.
  assert.deepEqual(run.lines.map((line) => [line.name, line.partMonth]), [["Gagan Kumar", false], ["new@hrcrm.ai", true]]);
  assert.equal(run.lines[1].gross, 60000);
  assert.equal(run.lines[1].salaryId, "s2");
  assert.equal(normalizePayrollRun({ payroll: { dry_run: false } }).dryRun, false);
  assert.deepEqual(normalizePayrollRun(null).lines, []);
});

test("groups HR availability into weekdays and time-off blocks", () => {
  const availability = normalizeAvailability({
    timezone: "Asia/Kolkata",
    rules: [
      { id: "r2", rule_type: "weekly", day_of_week: "1", start_time: "14:00:00", end_time: "17:00:00", slot_minutes: "45", is_active: true, valid_from: "0000-00-00" },
      { id: "r1", rule_type: "weekly", day_of_week: "1", start_time: "09:30", end_time: "13:00", is_active: false },
      { id: "r3", rule_type: "weekly", day_of_week: "5", start_time: "10:00", end_time: "12:00" },
      { id: "b2", rule_type: "block", block_start: "2026-11-20 03:30:00", block_end: "2026-11-21 12:30:00", description: "Training" },
      { id: "b1", rule_type: "block", block_start: "2026-11-02 03:30:00", block_end: "2026-11-02 12:30:00" },
    ],
  });
  assert.equal(availability.timeZone, "Asia/Kolkata");
  assert.equal(availability.weekly.length, 7);
  const monday = availability.weekly[0];
  assert.deepEqual(monday.rules.map((rule) => [rule.id, rule.start, rule.end, rule.slotMinutes, rule.active]), [
    ["r1", "09:30", "13:00", 30, false],
    ["r2", "14:00", "17:00", 45, true],
  ]);
  assert.equal(monday.rules[1].validFrom, "");
  assert.deepEqual(availability.weekly[4].rules.map((rule) => rule.id), ["r3"]);
  assert.deepEqual(availability.weekly[6].rules, []);
  assert.deepEqual(availability.blocks.map((block) => [block.id, block.note]), [["b1", ""], ["b2", "Training"]]);
});

test("cleans a typed leave code the way the backend does", () => {
  assert.equal(tokenCode(" k7p-2qx "), "K7P2QX");
  assert.equal(tokenCode(null), "");
});

test("reads leave tokens and who can give them", () => {
  const token = normalizeLeaveToken({
    id: "t1", status: "issued", token_code: "K7P2QX", employee_id: "e1", employee_name: "Gagan Kumar", issued_by_name: "Riya Kapoor",
    leave_from: "2026-11-10", leave_to: "2026-11-12", expires_at: "2026-11-03 10:00:00",
  });
  assert.equal(token.code, "K7P2QX");
  assert.equal(token.issuedByName, "Riya Kapoor");
  assert.equal(tokenDates(token), "10 Nov – 12 Nov 2026");
  assert.equal(tokenDates(normalizeLeaveToken({ leave_from: "2026-11-10", leave_to: "2026-11-10" })), "10 Nov 2026");
  assert.equal(tokenDates(normalizeLeaveToken({})), "");

  const approvers = normalizeTokenApprovers({
    settings: { required: true, expiry_hours: 48 },
    approvers: { manager: [{ id: "m1", name: "Riya Kapoor", relation: "team_lead" }, { id: "", name: "Nobody" }, { id: "m2", name: "Vikas", relation: "odd" }] },
  });
  assert.equal(approvers.required, true);
  assert.equal(approvers.expiryHours, 48);
  assert.deepEqual(approvers.approvers.map((person) => [person.id, person.relation]), [["m1", "Team lead"], ["m2", "Manager"]]);
  assert.equal(normalizeTokenApprovers({ settings: { required: false } }).required, false);
});

test("finds the code a leave was applied with", () => {
  const tokens = [
    { id: "t1", status: "used", token_code: "AAA111", employee_id: "e1", issued_by_id: "k1", issued_by_name: "Kamal Uniyal", issued_by_relation: "team_lead", remarks: "Covered by Anshika", leave_id: "l1" },
    { id: "t2", status: "used", token_code: "BBB222", employee_id: "e1", issued_by_name: "Vikas", leave_from: "2026-11-10", leave_to: "2026-11-12" },
    { id: "t3", status: "used", token_code: "CCC333", employee_id: "e2", kind_label: "Manager / team lead" },
  ].map(normalizeLeaveToken);
  assert.equal(tokens[0].issuedByRelation, "Team lead");
  assert.equal(tokens[0].issuedById, "k1");
  assert.equal(tokens[2].issuedByRelation, "Manager / team lead");
  assert.equal(tokenForLeave(tokens, { id: "l1", employee_id: "e1" })?.id, "t1");
  assert.equal(tokenForLeave(tokens, { id: "l9", employee_id: "e2", manager_token: "ccc-333" })?.id, "t3");
  // Another employee's code never matches.
  assert.equal(tokenForLeave(tokens, { id: "l9", employee_id: "e1", manager_token: "CCC333" }), null);
  assert.equal(tokenForLeave(tokens, { id: "l8", employee_id: "e1", leave_from: "2026-11-10", leave_to: "2026-11-12" })?.id, "t2");
  assert.equal(tokenForLeave(tokens, { id: "l8", employee_id: "e1", leave_from: "2026-11-10", leave_to: "2026-11-11" }), null);
  assert.equal(tokenForLeave(null, { id: "l1" }), null);
});

test("a token fits the leave when it has no dates or the same dates", () => {
  const fixed = normalizeLeaveToken({ leave_from: "2026-11-10", leave_to: "2026-11-12" });
  assert.equal(tokenFitsDates(fixed, "2026-11-10", "2026-11-12"), true);
  assert.equal(tokenFitsDates(fixed, "2026-11-10", "2026-11-11"), false);
  assert.equal(tokenFitsDates(fixed, "", ""), true);
  assert.equal(tokenFitsDates(normalizeLeaveToken({}), "2026-11-10", "2026-11-12"), true);
  const oneDay = normalizeLeaveToken({ leave_from: "2026-11-10" });
  assert.equal(tokenFitsDates(oneDay, "2026-11-10", "2026-11-10"), true);
});
