import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { fetchAllRecords } from "../../../pages/candidates/candidatesApi";
import { selectIsAdmin } from "../../../../utils/pageAccess";
import {
  buildAttendanceRows,
  dateKey,
  daySummary,
  formatMinutes,
  weekDays,
} from "./adminAttendanceUtils";

const statuses = {
  onTime: {
    label: "On time",
    color: "border-l-rose-200 bg-rose-50/60 text-slate-700",
    dot: "bg-rose-300",
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
  upcoming: {
    label: "Upcoming",
    color: "border-l-transparent bg-white text-slate-300",
    dot: "bg-slate-200",
  },
};
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40";
const shortDate = (date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function AdminAttendanceDashboard() {
  const isAdmin = useSelector(selectIsAdmin);
  const [anchor, setAnchor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const employees = useQuery({
    queryKey: ["employees", "list"],
    queryFn: () => fetchAllRecords("hrc_employees"),
    enabled: isAdmin,
  });
  const activity = useQuery({
    queryKey: ["dailyActivity", "admin", "all"],
    queryFn: () => fetchAllRecords("hrc_daily_activity"),
    enabled: isAdmin,
    refetchInterval: 60000,
  });
  const days = weekDays(anchor);
  const today = dateKey(new Date());
  const start = dateKey(days[0]);
  const end = dateKey(days[6]);
  const rows = useMemo(
    () => buildAttendanceRows(employees.data || [], activity.data || []),
    [employees.data, activity.data],
  );
  const visible = rows.filter(
    (row) =>
      (row.matched ||
        Object.keys(row.days).some((day) => day >= start && day <= end)) &&
      [row.name, row.email, row.designation].some((value) =>
        value.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  const totals = { onTime: 0, late: 0, incomplete: 0, missing: 0, upcoming: 0 };
  visible.forEach((row) =>
    days.forEach((day) => {
      const key = dateKey(day);
      totals[daySummary(row.days[key], key, today).status] += 1;
    }),
  );
  const totalPages = Math.max(1, Math.ceil(visible.length / 20));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * 20, currentPage * 20);
  const loading = employees.isPending || activity.isPending;
  const failed = employees.isError || activity.isError;
  const fetching = employees.isFetching || activity.isFetching;
  const selectedRow = selected && rows.find((row) => row.key === selected.key);
  const selectedRecords = selectedRow?.days[selected?.date] || [];

  function moveWeek(direction) {
    setAnchor(
      new Date(
        days[0].getFullYear(),
        days[0].getMonth(),
        days[0].getDate() + direction * 7,
      ),
    );
    setPage(1);
  }
  function refresh() {
    void employees.refetch();
    void activity.refetch();
  }

  if (!isAdmin)
    return (
      <p role="alert" className="p-6">
        You are not authorized to enter this page.
      </p>
    );

  return (
    <main className="min-h-full space-y-6 rounded-2xl bg-slate-50 p-3 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            People workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Employee attendance
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            A weekly view of every employee. Select a recorded day for login,
            logout and lunch details.
          </p>
        </div>
        <button onClick={refresh} disabled={fetching} className={buttonClass}>
          <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <section
        aria-label="Weekly attendance overview"
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          [
            "Employees shown",
            visible.length,
            Users,
            "text-indigo-600 bg-indigo-50",
          ],
          [
            "Days with check-in",
            totals.onTime + totals.late,
            CalendarDays,
            "text-rose-600 bg-rose-50",
          ],
          ["Late check-ins", totals.late, Clock3, "text-amber-600 bg-amber-50"],
        ].map((item) => {
          const [label, count, Icon, color] = item;
          return (
            <div
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4"
            >
              <span className={`rounded-xl p-3 ${color}`}>
                <Icon size={21} />
              </span>
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading || failed ? "—" : count}
                </p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section
        aria-label="Employee attendance grid"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-xs font-medium text-white">
              <CalendarDays size={14} />
              {shortDate(days[0])} – {shortDate(days[6])}{" "}
              {days[6].getFullYear()}
            </span>
            <button
              aria-label="Previous week"
              onClick={() => moveWeek(-1)}
              className={buttonClass}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next week"
              onClick={() => moveWeek(1)}
              className={buttonClass}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => {
                setAnchor(new Date());
                setPage(1);
              }}
              className={buttonClass}
            >
              This week
            </button>
            <input
              type="date"
              aria-label="Choose a date to view its week"
              value={dateKey(anchor)}
              onChange={(event) => {
                if (!event.target.value) return;
                const [year, month, day] = event.target.value
                  .split("-")
                  .map(Number);
                setAnchor(new Date(year, month - 1, day));
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
            />
          </div>
          <div className="flex flex-wrap gap-3" aria-label="Attendance legend">
            {["onTime", "late", "incomplete", "missing"].map((status) => (
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
            Late after 10:00 AM · Times shown as recorded in CRM
          </p>
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
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left text-sm">
              <caption className="sr-only">
                Employee attendance from {start} to {end}
              </caption>
              <thead className="sticky top-0 z-20 bg-white">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-30 w-64 min-w-64 border-y border-r border-slate-100 bg-white px-5 py-4 text-xs font-semibold text-slate-700"
                  >
                    Employee profile
                  </th>
                  {days.map((day) => (
                    <th
                      key={dateKey(day)}
                      scope="col"
                      aria-current={dateKey(day) === today ? "date" : undefined}
                      className={`min-w-32 border-y border-r border-slate-100 px-3 py-3 text-center ${dateKey(day) === today ? "bg-indigo-50" : "bg-white"}`}
                    >
                      <span
                        className={`text-sm font-semibold ${dateKey(day) === today ? "text-indigo-600" : "text-slate-800"}`}
                      >
                        {day.getDate()}
                      </span>
                      <span className="mt-1 block text-[11px] font-normal text-slate-400">
                        {day.toLocaleDateString("en-GB", { weekday: "long" })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.key}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-5 py-4 font-normal"
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
                          <p
                            className="max-w-44 truncate font-medium text-slate-800"
                            title={row.name}
                          >
                            {row.name}
                          </p>
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
                    {days.map((day) => {
                      const key = dateKey(day);
                      const records = row.days[key] || [];
                      const summary = daySummary(records, key, today);
                      const style = statuses[summary.status];
                      return (
                        <td
                          key={key}
                          className="border-b border-r border-slate-100 p-0"
                        >
                          <button
                            disabled={!records.length}
                            onClick={() =>
                              setSelected({ key: row.key, date: key })
                            }
                            aria-label={`${row.name}, ${key}: ${style.label}${records.length ? ", view attendance details" : ""}`}
                            className={`flex min-h-24 w-full flex-col items-center justify-center border-l-[3px] px-2 py-3 text-center text-xs transition enabled:hover:brightness-95 focus-visible:outline-indigo-500 ${style.color}`}
                          >
                            <span className="font-medium">{style.label}</span>
                            {summary.first && (
                              <span className="mt-1 text-[10px] opacity-70">
                                {summary.first.time}
                              </span>
                            )}
                            {summary.worked !== null ? (
                              <span className="mt-1 text-[10px] opacity-60">
                                {formatMinutes(summary.worked)} worked
                              </span>
                            ) : (
                              summary.first && (
                                <span className="mt-1 text-[10px] opacity-60">
                                  {summary.sessions.some(
                                    (session) =>
                                      session.login && !session.logout,
                                  )
                                    ? "Not checked out"
                                    : "Incomplete times"}
                                </span>
                              )
                            )}
                            {records.length > 1 && (
                              <span className="mt-1 text-[10px] opacity-60">
                                {records.length} sessions
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <p>
            {loading || failed
              ? "Attendance directory"
              : `${visible.length ? (currentPage - 1) * 20 + 1 : 0}–${Math.min(currentPage * 20, visible.length)} of ${visible.length} employees`}
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
        No record means no activity was returned for that day. Holidays, leave
        and absence are not inferred. Worked time excludes recorded lunch
        breaks; incomplete sessions have no total.
      </p>

      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-999 max-h-[85vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  {selectedRow?.name || "Attendance details"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500">
                  {selected?.date} · Login, logout and lunch activity
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
              {selectedRecords.length ? (
                selectedRecords.map((record, index) => {
                  const summary = daySummary([record], selected.date, today);
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
                          ["Lunch started", session.lunchIn],
                          ["Lunch ended", session.lunchOut],
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
                            Lunch duration
                          </dt>
                          <dd className="mt-1 text-slate-700">
                            {formatMinutes(session.breakMinutes)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-400">
                            Worked time
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
                })
              ) : (
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
