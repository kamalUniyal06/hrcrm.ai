import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { fetchAllRecords } from "../../../pages/candidates/candidatesApi";
import he from "he";
import { calendarDateKey, dateKey, daySummary, formatMinutes, parseActivityTime } from "./adminAttendanceUtils";
import AttendanceDayCell from "./AttendanceDayCell";
import { useEmployeeLeaves, usePublicHolidays } from "../../queries/leaves.queries";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_FILTERS = [
  ["all", "All status"],
  ["onTime", "On time"],
  ["late", "Late"],
  ["incomplete", "Incomplete"],
  ["missing", "Absent"],
  ["leave", "On leave"],
  ["dayOff", "Weekend / holiday"],
];

// Accepted leaves expanded to { "YYYY-MM-DD": leave record }.
function buildLeaveRecords(records = []) {
  const byDay = {};
  for (const record of records) {
    if (String(record?.status).toLowerCase() !== "accepted" || String(record?.deleted) === "1") continue;
    const from = calendarDateKey(record.leave_from);
    const to = calendarDateKey(record.leave_to) || from;
    if (!from || !to) continue;
    const cursor = new Date(`${from}T00:00:00`);
    const last = new Date(`${to}T00:00:00`);
    while (cursor <= last) {
      byDay[dateKey(cursor)] = record;
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return byDay;
}

export default function EmployeeAttendanceDrawer({
  row,
  position: listPosition,
  total,
  onPrevious,
  onNext,
  onClose,
  onSelectDay,
  lateAfter,
}) {
  const [month, setMonth] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const email = row?.email || "";
  const from = dateKey(new Date(month.getFullYear(), month.getMonth(), 1));
  const to = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const activity = useQuery({
    queryKey: ["dailyActivity", "admin", email, from, to],
    queryFn: () => fetchAllRecords("hrc_daily_activity", {
      field: "date_entered",
      from: `${from} 00:00:00`,
      to: `${to} 23:59:59`,
    }, { name: email }),
    enabled: Boolean(email),
    refetchInterval: 60000,
  });
  const employeeId = row?.key.startsWith("employee:") ? row.key.slice("employee:".length) : undefined;
  const publicHolidays = usePublicHolidays();
  const employeeLeaves = useEmployeeLeaves({ employeeId, email });
  const holidayNames = useMemo(() => {
    const names = {};
    for (const record of publicHolidays.data?.records || []) {
      const key = calendarDateKey(record?.holiday_date);
      if (key && String(record.deleted) !== "1") names[key] = he.decode(String(record.name || "Public holiday"));
    }
    return names;
  }, [publicHolidays.data]);
  const leaveRecords = useMemo(
    () => buildLeaveRecords(employeeLeaves.data?.records || employeeLeaves.data?.data?.records),
    [employeeLeaves.data],
  );
  const leaveNames = useMemo(
    () => Object.fromEntries(Object.entries(leaveRecords).map(([day, record]) => [day, he.decode(String(record.type_of_leave || record.leave_type || "Approved leave"))])),
    [leaveRecords],
  );
  const today = dateKey(new Date());
  const monthDays = useMemo(() => {
    if (!row) return [];
    const recordsByDay = {};
    const seen = new Set();
    for (const record of activity.data || []) {
      if (String(record.deleted) === "1" || (record.id && seen.has(record.id))) continue;
      if (record.id) seen.add(record.id);
      const day = parseActivityTime(record.login)?.date || parseActivityTime(record.date_entered)?.date;
      if (day) (recordsByDay[day] ||= []).push(record);
    }
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
      const key = dateKey(date);
      const records = recordsByDay[key] || [];
      const summary = daySummary(records, key, today, Boolean(leaveNames[key]), lateAfter);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      // Weekends and holidays without activity are days off, not missing attendance.
      const status = summary.status === "missing" && (isWeekend || holidayNames[key]) ? "dayOff" : summary.status;
      return { key, date, records, summary, status, isWeekend };
    });
  }, [row, activity.data, month, today, leaveNames, holidayNames, lateAfter]);
  const totals = { onTime: 0, late: 0, incomplete: 0, missing: 0, leave: 0, upcoming: 0, dayOff: 0, holiday: 0, worked: 0 };
  monthDays.forEach(({ key, summary, status }) => {
    totals[status] += 1;
    if (holidayNames[key]) totals.holiday += 1;
    totals.worked += summary.worked ?? 0;
  });
  // Blank cells before the 1st and after the last day keep whole Monday-first weeks.
  const leadingBlanks = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const trailingBlanks = (7 - ((leadingBlanks + monthDays.length) % 7)) % 7;
  const isCurrentMonth = from.slice(0, 7) === today.slice(0, 7);

  function moveMonth(direction) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1));
  }

  return (
    <Dialog.Root open={Boolean(row)} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-6xl flex-col bg-slate-50 shadow-2xl outline-none sm:rounded-l-2xl">
          {row && (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 sm:rounded-tl-2xl">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <button type="button" aria-label="Previous employee" disabled={listPosition <= 1} onClick={onPrevious} className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50 disabled:opacity-40">
                    <ChevronLeft size={15} />
                  </button>
                  <button type="button" aria-label="Next employee" disabled={listPosition >= total} onClick={onNext} className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50 disabled:opacity-40">
                    <ChevronRight size={15} />
                  </button>
                  <span>{listPosition} out of {total}</span>
                </div>
                <Dialog.Close aria-label="Close employee attendance" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X size={18} />
                </Dialog.Close>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-base font-semibold text-indigo-600">
                      {row.name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <Dialog.Title className="truncate text-lg font-semibold text-slate-900">{row.name}</Dialog.Title>
                      <Dialog.Description asChild>
                        <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                          <div><dt className="text-slate-400">Designation</dt><dd className="font-medium text-slate-700">{row.designation || "Employee"}</dd></div>
                          <div><dt className="text-slate-400">Email</dt><dd className="font-medium text-indigo-600">{row.email || "—"}</dd></div>
                        </dl>
                      </Dialog.Description>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 divide-slate-100 rounded-xl border border-slate-200 sm:grid-cols-4 lg:grid-cols-7 lg:divide-x">
                    {[
                      ["On time", totals.onTime],
                      ["Late clock-in", totals.late],
                      ["Incomplete", totals.incomplete],
                      ["Absent", totals.missing],
                      ["On leave", totals.leave],
                      ["Holidays", totals.holiday],
                      ["Worked", formatMinutes(totals.worked)],
                    ].map(([label, value]) => (
                      <div key={label} className="px-4 py-3">
                        <p className="text-[11px] text-slate-500">{label}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{activity.isPending && email ? "—" : value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                    </h3>
                    <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="rounded-lg border border-slate-200 bg-white p-1.5 transition hover:bg-slate-50">
                      <ChevronLeft size={15} />
                    </button>
                    <button type="button" aria-label="Next month" disabled={isCurrentMonth} onClick={() => moveMonth(1)} className="rounded-lg border border-slate-200 bg-white p-1.5 transition hover:bg-slate-50 disabled:opacity-40">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  <select
                    aria-label="Filter days by status"
                    value={statusFilter}
                    onChange={event => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                  >
                    {STATUS_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>

                {!email ? (
                  <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    This employee does not have an email address for matching attendance.
                  </p>
                ) : activity.isError ? (
                  <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    {activity.error?.message || "Could not load attendance."}{" "}
                    <button type="button" onClick={() => activity.refetch()} className="font-semibold underline">Retry</button>
                  </p>
                ) : activity.isPending ? (
                  <p role="status" className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                    <Loader2 size={18} className="animate-spin" /> Loading monthly attendance…
                  </p>
                ) : (
                  <div className="w-full overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
                    <div className="min-w-[760px]">
                      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--muted)]">
                        {WEEKDAYS.map(weekday => (
                          <div key={weekday} className="border-r border-[var(--border)] px-3 py-2.5 text-center text-xs font-semibold text-[var(--muted-foreground)] last:border-r-0">
                            {weekday}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7">
                        {Array.from({ length: leadingBlanks }, (_, index) => <AttendanceDayCell key={`lead-${index}`} isCurrentMonth={false} />)}
                        {monthDays.map(({ key, date, records, summary, status, isWeekend }) => {
                          const logouts = summary.sessions.map(session => session.logout).filter(Boolean).sort((a, b) => a.stamp - b.stamp);
                          const lunch = summary.sessions.find(session => session.lunchIn || session.lunchOut);
                          const attendance = summary.first ? {
                            login: summary.first.time,
                            logout: logouts.at(-1)?.time || "",
                            lunch_in: lunch?.lunchIn?.time || "",
                            lunch_out: lunch?.lunchOut?.time || "",
                          } : undefined;
                          const dimmed = statusFilter !== "all" && status !== statusFilter;
                          return (
                            <div key={key} className={dimmed ? "opacity-30" : ""}>
                              <AttendanceDayCell
                                day={date.getDate()}
                                date={date}
                                isCurrentMonth
                                isToday={key === today}
                                attendance={attendance}
                                isWeekend={isWeekend}
                                holidayName={holidayNames[key]}
                                leaveName={!attendance ? leaveNames[key] : undefined}
                                lateAfterMinutes={lateAfter}
                                onClick={records.length || leaveRecords[key] ? () => onSelectDay(key, records, leaveRecords[key]) : undefined}
                              />
                            </div>
                          );
                        })}
                        {Array.from({ length: trailingBlanks }, (_, index) => <AttendanceDayCell key={`trail-${index}`} isCurrentMonth={false} />)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
