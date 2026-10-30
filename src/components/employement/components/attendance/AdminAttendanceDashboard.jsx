import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { fetchAllRecords } from "../../../pages/candidates/candidatesApi";
import { selectIsAdmin } from "../../../../utils/pageAccess";
import {
  buildAttendanceRows,
  buildLeaveDays,
  dateKey,
  daySummary,
  formatMinutes,
  isHalfDayLeave,
  isRowOnLeave,
  leaveForRow,
  matchesOverviewFilter,
} from "./adminAttendanceUtils";
import { timeToMinutes, useAttendanceLimits } from "../../attendanceLimits";
import { useAttendanceStats } from "../../../../queries/attendance.queries";
import { useTeamsPresenceDay } from "../../../../queries/teamsPresence.queries";
import { indexPresence, presenceForRow } from "./teamsPresenceUtils";
import { TeamsActivityPanel, TeamsCell, TeamsSummary } from "./TeamsPresence";
import { pageGutter } from "../home/homeUi";
import { useLeavesOnDay } from "../home/homeDashboard.queries";
import EmployeeAttendanceDrawer from "./EmployeeAttendanceDrawer";
import LeaveDetails from "../leave/LeaveDetails";

const statuses = {
  onTime: {
    label: "On time",
    color: "border-l-emerald-300 bg-emerald-50/70 text-emerald-800",
    dot: "bg-emerald-500",
  },
  late: {
    label: "Late",
    color: "border-l-amber-300 bg-amber-50/70 text-amber-900",
    dot: "bg-amber-400",
  },
  incomplete: {
    label: "Incomplete",
    color: "border-l-orange-300 bg-orange-50/70 text-orange-800",
    dot: "bg-orange-400",
  },
  missing: {
    label: "No record",
    color: "border-l-slate-200 bg-slate-50/60 text-slate-400",
    dot: "bg-slate-300",
  },
  leave: {
    label: "On leave",
    color: "border-l-indigo-300 bg-indigo-50/70 text-indigo-800",
    dot: "bg-indigo-500",
  },
  upcoming: {
    label: "Upcoming",
    color: "border-l-transparent bg-white text-slate-300",
    dot: "bg-slate-200",
  },
  halfDay: {
    label: "Half-day leave",
    color: "border-l-sky-300 bg-sky-50/70 text-sky-800",
    dot: "bg-sky-500",
  },
};
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40";
const headerCell = "border-y border-r border-slate-100 px-4 py-3 text-left text-xs font-semibold text-slate-700";
const bodyCell = "border-b border-r border-slate-100 px-4 py-3 text-sm text-slate-700";
const PAGE_SIZE = 50;
const OVERVIEW_FILTERS = ["all", "checkedIn", "onTime", "late", "missing", "leave", "halfDay"];

// "09:30 AM ●─ 8h 12m ─● 06:42 PM": a start time, an end time and the gap between them.
function TimeSpan({ start, end, middle, startClass = "text-slate-800", endClass = "text-slate-800", open = false }) {
  const line = `h-px w-3 ${open ? "border-t border-dashed border-slate-300" : "bg-slate-200"}`;
  return (
    <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`font-semibold ${startClass}`}>{start}</span>
      <span className="inline-flex items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        <span className={line} />
        <span className="px-1 text-[11px] text-slate-400">{middle}</span>
        <span className={line} />
        <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-orange-300" : "bg-slate-300"}`} />
      </span>
      <span className={endClass}>{end}</span>
    </div>
  );
}

// Late arrivals and missing clock-outs are highlighted.
function ClockInOut({ summary, isToday }) {
  if (!summary.first) return <span className="text-slate-400">—</span>;
  const logouts = summary.sessions.map((session) => session.logout).filter(Boolean).sort((a, b) => a.stamp - b.stamp);
  const lastLogout = logouts.at(-1);
  const stillIn = summary.sessions.some((session) => session.login && !session.logout);
  const closed = lastLogout && !stillIn;
  return (
    <TimeSpan
      start={summary.first.time}
      startClass={summary.status === "late" ? "text-amber-600" : "text-slate-800"}
      middle={summary.inOffice !== null ? formatMinutes(summary.inOffice) : stillIn && isToday ? "In office" : "—"}
      end={closed ? lastLogout.time : isToday ? "Working" : "No clock-out"}
      endClass={closed ? "font-semibold text-slate-800" : `text-xs font-medium ${isToday ? "text-emerald-600" : "text-orange-600"}`}
      open={!closed}
    />
  );
}

// First lunch in, last lunch out and the total break across the day's sessions.
// Lunch longer than the configured limit is highlighted.
function LunchInOut({ sessions, limit }) {
  const lunches = sessions.filter((session) => session.lunchIn || session.lunchOut);
  if (!lunches.length) return <span className="text-slate-400">—</span>;
  const lunchIns = lunches.map((session) => session.lunchIn).filter(Boolean).sort((a, b) => a.stamp - b.stamp);
  const lunchOuts = lunches.map((session) => session.lunchOut).filter(Boolean).sort((a, b) => a.stamp - b.stamp);
  const onLunch = lunches.some((session) => session.lunchIn && !session.lunchOut);
  const totalBreak = lunches.reduce((sum, session) =>
    session.lunchIn && session.lunchOut && session.lunchOut.stamp >= session.lunchIn.stamp
      ? sum + (session.lunchOut.stamp - session.lunchIn.stamp) / 60000
      : sum, 0);
  const longLunch = totalBreak > limit;
  return (
    <TimeSpan
      start={lunchIns[0]?.time || "—"}
      middle={totalBreak || !onLunch ? `${formatMinutes(totalBreak)} break` : "—"}
      end={onLunch ? "On lunch" : lunchOuts.at(-1)?.time || "—"}
      endClass={onLunch ? "text-xs font-medium text-orange-600" : `font-semibold ${longLunch ? "text-amber-600" : "text-slate-800"}`}
      open={onLunch}
    />
  );
}

export default function AdminAttendanceDashboard({ onViewMyAttendance }) {
  const isAdmin = useSelector(selectIsAdmin);
  const navigate = useNavigate();
  const { employeeId } = useParams();
  // /attendance/:employeeId opens the monthly drawer for that employee on top of the day list.
  const [drawerKey, setDrawerKey] = useState(() => (employeeId ? `employee:${employeeId}` : null));
  const [anchor, setAnchor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [searchParams] = useSearchParams();
  // The home dashboard links here with ?filter=<status> to open a filtered list.
  const [overviewFilter, setOverviewFilter] = useState(() => {
    const requested = searchParams.get("filter");
    return OVERVIEW_FILTERS.includes(requested) ? requested : "all";
  });
  const limits = useAttendanceLimits();
  const lateAfter = (timeToMinutes(limits.actualLoginTime) ?? 570) + limits.loginDelayMinutes;
  const activityDay = dateKey(anchor);
  const employees = useQuery({
    queryKey: ["employees", "list"],
    queryFn: () => fetchAllRecords("hrc_employees"),
    enabled: isAdmin,
  });
  const activity = useQuery({
    queryKey: ["dailyActivity", "admin", "all", activityDay, activityDay],
    queryFn: () => fetchAllRecords("hrc_daily_activity", {
      field: "date_entered",
      from: `${activityDay} 00:00:00`,
      to: `${activityDay} 23:59:59`,
    }),
    enabled: isAdmin,
    refetchInterval: 60000,
  });
  const leaves = useLeavesOnDay({ day: activityDay, enabled: isAdmin });
  const attendanceStats = useAttendanceStats(activityDay, { enabled: isAdmin });
  const today = dateKey(new Date());
  // Teams presence: live status for today, the stored daily report for other days.
  const teamsLive = activityDay === today;
  const teams = useTeamsPresenceDay(activityDay, { live: teamsLive, enabled: isAdmin });
  const presenceIndex = useMemo(() => indexPresence(teams.data?.employees), [teams.data]);
  const teamsState = teams.isPending ? "loading" : teams.isError ? "error" : "ready";
  const rows = useMemo(
    () => buildAttendanceRows(employees.data || [], activity.data || []),
    [employees.data, activity.data],
  );
  const leaveDays = useMemo(() => buildLeaveDays(leaves.data || []), [leaves.data]);
  const isOnLeave = useCallback((row, day) => isRowOnLeave(leaveDays, row, day), [leaveDays]);
  // Half-day leave comes straight from hrc_leaves for the selected day; "On leave" means a full day.
  const halfDayLeaveDays = useMemo(() => buildLeaveDays((leaves.data || []).filter(isHalfDayLeave)), [leaves.data]);
  const isOnHalfDay = useCallback((row) => isRowOnLeave(halfDayLeaveDays, row, activityDay), [halfDayLeaveDays, activityDay]);
  const halfDayCount = leaves.isPending ? undefined : rows.filter((row) => row.matched && isOnHalfDay(row)).length;
  const matchingRows = rows.filter(
    (row) =>
      (row.matched || Boolean(row.days[activityDay])) &&
      [row.name, row.email, row.designation].some((value) =>
        value.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  const visible = matchingRows.filter((row) =>
    matchesOverviewFilter(overviewFilter, {
      records: row.days[activityDay] || [],
      matched: row.matched,
      onLeave: isOnLeave(row, activityDay),
      halfDay: isOnHalfDay(row),
      day: activityDay,
      today,
      lateAfter,
    }),
  );
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const loading = employees.isPending || leaves.isPending || activity.isPending;
  const failed = employees.isError || activity.isError || leaves.isError;
  const fetching = employees.isFetching || activity.isFetching || leaves.isFetching || attendanceStats.isFetching || teams.isFetching;
  const selectedRow = selected && rows.find((row) => row.key === selected.key);
  const selectedRecords = selected?.records || selectedRow?.days[selected?.date] || [];
  const selectedSummary = daySummary(selectedRecords, selected?.date, today, selectedRow ? isOnLeave(selectedRow, selected?.date) : false, lateAfter);
  const effectiveMinutes = selectedSummary.worked;
  const breakMinutes = selectedSummary.sessions.every((session) => session.breakMinutes !== null)
    ? selectedSummary.sessions.reduce((sum, session) => sum + session.breakMinutes, 0)
    : null;
  const targetProgress = effectiveMinutes === null ? 0 : Math.min(Math.round((effectiveMinutes / 540) * 100), 100);
  const overviewItems = [
    ["All employees", attendanceStats.data?.all, Users, "text-slate-700 bg-slate-100", "all"],
    ["Checked in", attendanceStats.data?.checkedIn, UserCheck, "text-emerald-700 bg-emerald-50", "checkedIn"],
    ["Not checked in", attendanceStats.data?.notCheckedIn, Users, "text-orange-600 bg-orange-50", "missing"],
    ["On leave", attendanceStats.data?.leave, CalendarDays, "text-indigo-600 bg-indigo-50", "leave"],
    ["Half-day leave", halfDayCount, CalendarClock, "text-sky-600 bg-sky-50", "halfDay"],
    ["Late check-ins", attendanceStats.data?.late, Clock3, "text-amber-600 bg-amber-50", "late"],
    ["On time", attendanceStats.data?.onTime, Clock3, "text-white bg-emerald-600", "onTime", "border-emerald-200 bg-emerald-50"],
  ];
  // Employees the drawer can step through with its previous/next buttons.
  const drawerRows = visible.filter((row) => row.matched);
  const drawerRow = drawerKey ? rows.find((row) => row.key === drawerKey) : null;
  const drawerIndex = drawerRows.findIndex((row) => row.key === drawerKey);

  function moveDay(direction) {
    setAnchor(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + direction));
    setPage(1);
  }
  function closeDrawer() {
    setDrawerKey(null);
    if (employeeId) navigate("/attendance", { replace: true });
  }
  function refresh() {
    void employees.refetch();
    void activity.refetch();
    void leaves.refetch();
    void attendanceStats.refetch();
    void teams.refetch();
  }

  if (!isAdmin)
    return (
      <p role="alert" className="p-6">
        You are not authorized to enter this page.
      </p>
    );

  return (
    <main className={`min-h-full space-y-6 rounded-2xl bg-slate-50 ${pageGutter}`}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            People workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Employee attendance
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Today&apos;s attendance for every employee. Select a person to review their month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onViewMyAttendance && (
            <button type="button" onClick={onViewMyAttendance} className={buttonClass}>
              <CalendarDays size={15} />
              My attendance
            </button>
          )}
          <button onClick={refresh} disabled={fetching} className={buttonClass}>
            <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <section
        aria-label="Attendance overview"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7"
      >
        {overviewItems.map((item) => {
          const [label, count, Icon, color, filter, cardTone = "border-slate-200"] = item;
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                setOverviewFilter(filter);
                // Re-read hrc_leaves so the half-day list reflects leaves approved since the page loaded.
                if (filter === "halfDay") void leaves.refetch();
                setPage(1);
              }}
              aria-pressed={overviewFilter === filter}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition enabled:hover:border-indigo-200 enabled:hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${overviewFilter === filter ? "border-indigo-300 ring-1 ring-indigo-100" : cardTone}`}
            >
              <span className={`rounded-xl p-3 ${color}`}>
                <Icon size={21} />
              </span>
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {count ?? "—"}
                </p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </button>
          );
        })}
      </section>

      {attendanceStats.isError && (
        <p role="alert" className="text-sm text-red-700">
          {attendanceStats.error?.message || "Could not load attendance totals."}{" "}
          <button type="button" onClick={() => attendanceStats.refetch()} className="font-semibold underline">
            Retry
          </button>
        </p>
      )}

      {(overviewFilter === "onTime" || overviewFilter === "checkedIn") && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800">
            {overviewFilter === "onTime" ? "Showing on-time check-ins" : "Showing everyone who checked in"}
          </span>
          <button type="button" onClick={() => setOverviewFilter("all")} className="font-medium text-indigo-600 hover:underline">
            Clear
          </button>
        </div>
      )}

      <section
        aria-label="Employee attendance list"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button aria-label="Previous day" onClick={() => moveDay(-1)} className={buttonClass}>
              <ChevronLeft size={16} />
            </button>
            <p className="min-w-44 text-center text-sm font-semibold text-slate-800">
              {anchor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <button aria-label="Next day" onClick={() => moveDay(1)} className={buttonClass}>
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => {
                setAnchor(new Date());
                setPage(1);
              }}
              className={buttonClass}
            >
              Today
            </button>
            <input
              type="date"
              aria-label="Choose an attendance date"
              value={activityDay}
              onChange={(event) => {
                if (!event.target.value) return;
                const [year, month, day] = event.target.value.split("-").map(Number);
                setAnchor(new Date(year, month - 1, day));
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
            />
          </div>
          <div className="flex flex-wrap gap-3" aria-label="Attendance legend">
            {["onTime", "late", "incomplete", "leave", "halfDay", "missing"].map((status) => (
              <span
                key={status}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500"
              >
                <span
                  className={`h-2 w-2 rounded-full ${statuses[status].dot}`}
                />
                {statuses[status].label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 sm:max-w-sm">
            <Search size={16} className="text-slate-400" />
            <input
              type="search"
              aria-label="Search employees"
              placeholder="Search employee, email or designation"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </label>
          <p className="text-xs text-slate-400">
            Click an employee to view their monthly attendance
          </p>
        </div>
        <div className="border-t border-slate-100 px-5 py-3">
          <TeamsSummary query={teams} live={teamsLive} />
        </div>

        {failed ? (
          <div
            role="alert"
            className="m-5 rounded-xl bg-red-50 p-5 text-sm text-red-700"
          >
            <p>
              {employees.error?.message ||
                activity.error?.message ||
                "Could not load attendance."}
            </p>
            <button onClick={refresh} className="mt-2 font-semibold underline">
              Retry loading attendance
            </button>
          </div>
        ) : loading ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500"
          >
            <Loader2 size={18} className="animate-spin" />
            Loading employee attendance…
          </p>
        ) : !pageRows.length ? (
          <div className="p-16 text-center">
            <Users size={32} className="mx-auto text-slate-300" />
            <p className="mt-4 font-medium text-slate-700">
              {search
                ? "No matching employees"
                : "No employees or attendance found"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "Try another name or email."
                : "Records will appear here when available."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
              <caption className="sr-only">
                Employee attendance for {activityDay}
              </caption>
              <thead className="sticky top-0 z-20 bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-30 w-56 min-w-56 border-y border-r border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700"
                  >
                    Employee profile
                  </th>
                  <th scope="col" className={headerCell}>Status</th>
                  <th scope="col" className={headerCell}>Clock-in &amp; out</th>
                  <th scope="col" className={headerCell}>Lunch in &amp; out</th>
                  <th scope="col" className={headerCell}>Teams activity</th>
                  <th scope="col" className={headerCell}>Login from</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const records = row.days[activityDay] || [];
                  const onLeave = isOnLeave(row, activityDay);
                  const summary = daySummary(records, activityDay, today, onLeave, lateAfter);
                  const halfDay = isOnHalfDay(row);
                  const style = statuses[summary.status === "leave" && halfDay ? "halfDay" : summary.status];
                  const rowLeave = onLeave ? leaveForRow(leaves.data || [], row, activityDay) : null;
                  return (
                    <tr
                      key={row.key}
                      onClick={row.matched ? () => setDrawerKey(row.key) : undefined}
                      className={`transition ${drawerKey === row.key ? "bg-indigo-50/60" : ""} ${row.matched ? "cursor-pointer hover:bg-slate-50" : ""}`}
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-4 py-2 font-normal"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                            {row.name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <button
                              type="button"
                              disabled={!row.matched}
                              onClick={(event) => {
                                event.stopPropagation();
                                setDrawerKey(row.key);
                              }}
                              className="max-w-44 truncate font-medium text-slate-800 transition hover:text-indigo-600 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-default disabled:hover:text-slate-800"
                              title={row.name}
                            >
                              {row.name}
                            </button>
                            <p
                              className="mt-1 max-w-44 truncate text-[11px] text-slate-400"
                              title={row.email || row.designation}
                            >
                              {row.email || row.designation || "Employee"}
                            </p>
                            {!row.matched && (
                              <p className="mt-1 text-[10px] text-amber-600">
                                Employee not linked
                              </p>
                            )}
                          </div>
                        </div>
                      </th>
                      <td className="border-b border-r border-slate-100 px-3 py-2">
                        <button
                          type="button"
                          disabled={!records.length && !rowLeave}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected({ key: row.key, date: activityDay, leave: rowLeave });
                          }}
                          className={`inline-flex min-w-24 items-center justify-center gap-2 rounded-lg border-l-[3px] px-3 py-2 text-xs font-medium disabled:cursor-default ${style.color}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${style.dot}`} />{style.label}
                        </button>
                        {halfDay && summary.status !== "leave" && (
                          <span className="mt-1 block w-fit rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                            Half-day leave
                          </span>
                        )}
                        {/* Logged in on a full day of approved leave: listed under both "On leave" and their check-in status. */}
                        {onLeave && !halfDay && summary.status !== "leave" && (
                          <span className="mt-1 block w-fit rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                            On leave
                          </span>
                        )}
                      </td>
                      <td className={bodyCell}>
                        <ClockInOut summary={summary} isToday={activityDay === today} />
                      </td>
                      <td className={bodyCell}>
                        <LunchInOut sessions={summary.sessions} limit={limits.lunchOutMinutes} />
                      </td>
                      <td className={bodyCell}>
                        <TeamsCell record={presenceForRow(presenceIndex, row)} live={teamsLive} state={teamsState} />
                      </td>
                      <td className={bodyCell}>
                        {records.length ? (records[0]?.ip_address === "122.176.54.204" ? "Office" : "Remote") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <p>
            {loading || failed
              ? "Attendance directory"
              : `${visible.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–${Math.min(currentPage * PAGE_SIZE, visible.length)} of ${visible.length} employees`}
          </p>
          <div className="flex items-center gap-3">
            <button
              aria-label="Previous employee page"
              disabled={currentPage === 1 || loading || failed}
              onClick={() => setPage(currentPage - 1)}
              className={buttonClass}
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              aria-label="Next employee page"
              disabled={currentPage === totalPages || loading || failed}
              onClick={() => setPage(currentPage + 1)}
              className={buttonClass}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </footer>
      </section>
      <p className="px-1 text-xs leading-5 text-slate-400">
        No record means no activity or approved leave was returned for that day. Approved leave
        comes from the leave module; holidays and absence are not inferred. Effective time is calculated from login to logout;
        recorded lunch time is shown separately and is not deducted. Teams activity comes from Microsoft Teams presence,
        collected every minute; active time counts Available and Busy, online time also counts Away.
      </p>

      <EmployeeAttendanceDrawer
        key={drawerKey || "closed"}
        row={drawerRow}
        position={drawerIndex + 1}
        total={drawerRows.length}
        onPrevious={() => drawerIndex > 0 && setDrawerKey(drawerRows[drawerIndex - 1].key)}
        onNext={() => drawerIndex < drawerRows.length - 1 && setDrawerKey(drawerRows[drawerIndex + 1].key)}
        onClose={closeDrawer}
        onSelectDay={(date, records, leave) => setSelected({ key: drawerKey, date, records, leave })}
        lateAfter={lateAfter}
      />

      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-999 max-h-[85vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  {selectedRow?.name || "Attendance details"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500">
                  {selected?.date} · {selected?.leave && !selectedRecords.length ? "Leave details" : "Login, logout and lunch activity"}
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Close attendance details"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="mt-6 space-y-4">
              {selected?.leave && <LeaveDetails record={selected.leave} />}
              {selectedRecords.length ? (
                <>
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Day report · {selectedRow?.email || selectedRow?.name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Time in office</p><p className="mt-1 font-semibold">{formatMinutes(selectedSummary.inOffice)}</p></div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Effective time</p><p className="mt-1 font-semibold">{formatMinutes(effectiveMinutes)}</p></div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Break time</p><p className="mt-1 font-semibold">{formatMinutes(breakMinutes)}</p></div>
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex justify-between text-xs"><span>Daily target</span><span className="font-semibold text-indigo-600">{targetProgress}%</span></div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${targetProgress}%` }} /></div>
                      <p className="mt-2 text-xs text-slate-500">{formatMinutes(effectiveMinutes)} of 9h 00m</p>
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-600">Activity timeline</p>
                  </section>
                  {selected.key.startsWith("employee:") && (
                    <TeamsActivityPanel
                      employeeId={selected.key.slice("employee:".length)}
                      date={selected.date}
                      live={selected.date === today}
                    />
                  )}
                  {selectedRecords.map((record, index) => {
                    const summary = daySummary([record], selected.date, today, false, lateAfter);
                    const session = summary.sessions[0];
                    return (
                      <section
                        key={record.id || index}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex justify-between gap-3 text-sm">
                          <h3 className="font-semibold text-slate-800">
                            Session {index + 1}
                          </h3>
                          <span className="text-slate-500">
                            {statuses[summary.status].label}
                          </span>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          {[
                            ["Login", session.login],
                            ["Logout", session.logout],
                            ["Lunch in", session.lunchIn],
                            ["Lunch out", session.lunchOut],
                          ].map(([label, time]) => (
                            <div key={label}>
                              <dt className="text-xs text-slate-400">{label}</dt>
                              <dd className="mt-1 text-slate-700">
                                {time?.time || "Not recorded"}
                                {time && time.date !== selected.date && (
                                  <span className="block text-xs text-slate-400">
                                    {time.date}
                                  </span>
                                )}
                              </dd>
                            </div>
                          ))}
                          <div>
                            <dt className="text-xs text-slate-400">
                              Break duration
                            </dt>
                            <dd className="mt-1 text-slate-700">
                              {formatMinutes(session.breakMinutes)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-400">
                              Effective time (excluding lunch)
                            </dt>
                            <dd className="mt-1 font-semibold text-indigo-600">
                              {formatMinutes(session.worked)}
                            </dd>
                          </div>
                        </dl>
                        {record.description?.trim() && (
                          <p className="mt-4 whitespace-pre-wrap break-words border-t pt-3 text-xs text-slate-500">
                            {record.description}
                          </p>
                        )}
                      </section>
                    );
                  })}
                </>
              ) : selected?.leave ? null : (
                <p className="text-sm text-slate-500">
                  This activity is no longer available. Refresh the directory.
                </p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
