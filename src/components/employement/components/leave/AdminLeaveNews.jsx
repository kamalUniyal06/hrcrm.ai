import { useState } from "react";
import { useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  getAllLeaves,
  getLeaveDocuments,
  updateLeaveStatus,
} from "../../api/leaves.api";
import { fetchAllRecords } from "../../../pages/candidates/candidatesApi";
import { employeeName } from "../../../pages/employees/employeesApi";

const key = ["leaves", "admin-feed"];
const clean = (value) => String(value || "").trim();
const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
function leaveDateKey(value) {
  const text = clean(value);
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match)
    return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match)
    return `${match[3]}-${String(match[1]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;
  return "";
}
function formatLeaveDate(
  value,
  options = { day: "numeric", month: "long", year: "numeric" },
) {
  const key = leaveDateKey(value);
  if (!key) return "Date not set";
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en", options).format(
    new Date(year, month - 1, day),
  );
}

function LeaveDocuments({ leaveId }) {
  const documents = useQuery({
    queryKey: ["leaves", "documents", leaveId],
    queryFn: () => getLeaveDocuments(leaveId),
    enabled: Boolean(leaveId),
  });

  if (documents.isPending)
    return (
      <p className="mt-3 text-xs text-slate-400">Loading attached documents…</p>
    );
  if (documents.isError)
    return (
      <p className="mt-3 text-xs text-rose-600">
        Could not load attached documents.
      </p>
    );
  if (!documents.data?.length) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Attachments
      </p>
      {documents.data.map((document) => {
        const url = clean(document.image_url || document.file_url);
        const name =
          clean(document.filename || document.name) || "Leave document";
        const mime = clean(document.file_mime_type).toLowerCase();
        const kind =
          mime === "application/pdf"
            ? "PDF document"
            : mime.startsWith("image/")
              ? "Image"
              : "File attachment";
        return (
          <div
            key={document.id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm">
                <FileText size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {name}
                </span>
                <span className="block text-xs text-slate-500">{kind}</span>
              </span>
            </span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                View file <ExternalLink size={13} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminLeaveNews() {
  const isAdmin = useSelector(
    (state) => state.user.userInfo?.status === "admin",
  );
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("All statuses");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    monthKey(new Date()),
  );
  const [leaveYear, leaveMonth] = selectedMonth.split("-").map(Number);
  const requestMonthStart = `${selectedMonth}-01`;
  const requestMonthEnd = `${selectedMonth}-${String(new Date(leaveYear, leaveMonth, 0).getDate()).padStart(2, "0")}`;
  const leaves = useQuery({
    queryKey: [...key, selectedMonth],
    queryFn: () =>
      getAllLeaves({ from: requestMonthStart, to: requestMonthEnd }),
    enabled: isAdmin,
  });
  const employees = useQuery({
    queryKey: ["employees", "list"],
    queryFn: () => fetchAllRecords("hrc_employees"),
    enabled: isAdmin,
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateLeaveStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  if (!isAdmin) return null;
  const response = leaves.data;
  const employeeMap = new Map(
    (employees.data || []).map((employee) => [employee.id, employee]),
  );
  const records = [...(response?.records || [])].sort(
    (a, b) =>
      new Date(b.date_entered || b.leave_from || 0) -
      new Date(a.date_entered || a.leave_from || 0),
  );
  const [monthYear, monthNumber] = selectedMonth.split("-").map(Number);
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = `${selectedMonth}-${String(new Date(monthYear, monthNumber, 0).getDate()).padStart(2, "0")}`;
  const overlapsSelectedMonth = (record) => {
    const from =
      leaveDateKey(record.leave_from) || leaveDateKey(record.date_entered);
    const to = leaveDateKey(record.leave_to) || from;
    return Boolean(from && from <= monthEnd && to >= monthStart);
  };
  const pendingCount = records.filter(
    (record) => record.status === "Applied",
  ).length;
  const visible = records.filter((record) => {
    if (!overlapsSelectedMonth(record)) return false;
    if (filter !== "All statuses" && record.status !== filter) return false;
    const employee = employeeMap.get(
      record.employee_id || record.hrc_employees_hrc_leaves_1hrc_employees_ida,
    );
    const name = employee
      ? employeeName(employee)
      : [
          record.hrc_employees_hrc_leaves_1_name,
          record.hrc_candidates_hrc_leaves_1_name,
          record.assigned_user_name,
          record.name,
        ]
          .map(clean)
          .find(Boolean) || "Employee";
    return [
      name,
      employee?.email1,
      record.name,
      record.type_of_leave,
      record.status,
    ].some((value) =>
      clean(value).toLowerCase().includes(search.trim().toLowerCase()),
    );
  });
  const totalPages = Math.max(1, Math.ceil(visible.length / 12));
  const currentPage = Math.min(page, totalPages);
  const rows = visible.slice((currentPage - 1) * 12, currentPage * 12);
  const rejected = records
    .filter(
      (record) => record.status === "Rejected" && overlapsSelectedMonth(record),
    )
    .slice(0, 3);
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(monthYear, monthNumber - 1, 1));

  return (
    <section className="mx-auto space-y-6 pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Leave Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">{monthLabel}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <CalendarDays size={19} />
            </span>
            <div>
              <p className="text-xs text-slate-500">Total requests</p>
              <p className="text-2xl font-semibold text-slate-900">
                {response?.total ?? "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Clock3 size={19} />
            </span>
            <div>
              <p className="text-xs text-slate-500">Awaiting review</p>
              <p className="text-2xl font-semibold text-slate-900">
                {leaves.isPending ? "—" : pendingCount}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Users size={19} />
            </span>
            <div>
              <p className="text-xs text-slate-500">Employees in directory</p>
              <p className="text-2xl font-semibold text-slate-900">
                {employees.data?.length ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold text-slate-900">Leave Approval</h2>
            <p className="mt-1 text-xs text-slate-500">
              Requests overlapping the selected month.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => {
                  const date = new Date(monthYear, monthNumber - 2, 1);
                  setSelectedMonth(monthKey(date));
                  setPage(1);
                }}
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <ChevronLeft size={16} />
              </button>
              <label className="sr-only" htmlFor="leave-month-filter">
                Choose leave month
              </label>
              <input
                id="leave-month-filter"
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  if (event.target.value) {
                    setSelectedMonth(event.target.value);
                    setPage(1);
                  }
                }}
                className="border-0 bg-transparent px-1 py-1 text-sm text-slate-700 outline-none"
              />
              <button
                type="button"
                aria-label="Next month"
                onClick={() => {
                  const date = new Date(monthYear, monthNumber, 1);
                  setSelectedMonth(monthKey(date));
                  setPage(1);
                }}
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <label className="relative">
              <span className="sr-only">Search employee name or email</span>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Name or email"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 sm:w-56"
              />
            </label>
            <label className="sr-only" htmlFor="leave-status-filter">
              Filter leave requests
            </label>
            <select
              id="leave-status-filter"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option>All statuses</option>
              <option>Applied</option>
              <option>Accepted</option>
              <option>Rejected</option>
            </select>
            <button
              type="button"
              onClick={() => {
                leaves.refetch();
                employees.refetch();
              }}
              disabled={leaves.isFetching || employees.isFetching}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Refresh leave requests"
            >
              <RefreshCw
                size={16}
                className={
                  leaves.isFetching || employees.isFetching
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>
        </div>
        {mutation.isError && (
          <p
            role="alert"
            className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-7"
          >
            {mutation.error.message}
          </p>
        )}
        {leaves.isPending || employees.isPending ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"
          >
            <Loader2 size={18} className="animate-spin" />
            Loading employee requests...
          </p>
        ) : leaves.isError || response?.success !== true ? (
          <div role="alert" className="p-10 text-center text-sm text-red-700">
            {leaves.error?.message ||
              response?.message ||
              "Could not load leave requests."}
            <button
              type="button"
              onClick={() => leaves.refetch()}
              className="ml-2 underline"
            >
              Retry
            </button>
          </div>
        ) : employees.isError ? (
          <div role="alert" className="p-8 text-center text-sm text-red-700">
            Employee names could not be loaded.{" "}
            <button
              type="button"
              onClick={() => employees.refetch()}
              className="underline"
            >
              Retry
            </button>
          </div>
        ) : !rows.length ? (
          <div className="p-12 text-center">
            <CalendarDays size={28} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              {search || filter !== "All statuses"
                ? "No matching leave requests. Try a different search or status."
                : "No employee leave requests yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-4 sm:p-6">
            {rows.map((record) => {
              const pending =
                mutation.isPending && mutation.variables?.id === record.id;
              const employee = employeeMap.get(
                record.employee_id ||
                  record.hrc_employees_hrc_leaves_1hrc_employees_ida,
              );
              const name = employee
                ? employeeName(employee)
                : [
                    record.hrc_employees_hrc_leaves_1_name,
                    record.hrc_candidates_hrc_leaves_1_name,
                    record.assigned_user_name,
                    record.name,
                  ]
                    .map(clean)
                    .find(Boolean) || "Employee";
              const avatar =
                employee?.photo_url ||
                employee?.photo ||
                employee?.picture ||
                employee?.image_url ||
                employee?.avatar_url;
              const initials = name
                .split(/\s+/)
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <article
                  key={record.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {name}
                      </h3>
                      <p className="truncate text-xs text-slate-500">
                        {employee?.email1 || "Employee"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${record.status === "Accepted" ? "bg-emerald-50 text-emerald-700" : record.status === "Rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {record.status || "Applied"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {record.type_of_leave || "Leave"}{" "}
                        <span className="font-normal text-slate-400">·</span>{" "}
                        {record.leave_days || "N/A"} day
                        {record.leave_days === "1" ? "" : "s"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {formatLeaveDate(record.leave_from, {
                          day: "numeric",
                          month: "short",
                        })}
                        {record.leave_to
                          ? ` – ${formatLeaveDate(record.leave_to, { day: "numeric", month: "short" })}`
                          : ""}{" "}
                        <span className="text-slate-300">·</span>{" "}
                        {formatLeaveDate(record.leave_from, {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(record)}
                      aria-label={`View ${name}'s leave request`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <Eye size={15} />
                      Details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!leaves.isPending && !leaves.isError && !employees.isPending && (
          <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:px-7">
            <span>
              Showing {visible.length ? (currentPage - 1) * 12 + 1 : 0}-
              {Math.min(currentPage * 12, visible.length)} of {visible.length}{" "}
              requests
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </div>
      {selectedRequest &&
        (() => {
          const record = selectedRequest;
          const employee = employeeMap.get(
            record.employee_id ||
              record.hrc_employees_hrc_leaves_1hrc_employees_ida,
          );
          const name = employee
            ? employeeName(employee)
            : [
                record.hrc_employees_hrc_leaves_1_name,
                record.hrc_candidates_hrc_leaves_1_name,
                record.assigned_user_name,
                record.name,
              ]
                .map(clean)
                .find(Boolean) || "Employee";
          const avatar =
            employee?.photo_url ||
            employee?.photo ||
            employee?.picture ||
            employee?.image_url ||
            employee?.avatar_url;
          const pending =
            mutation.isPending && mutation.variables?.id === record.id;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget)
                  setSelectedRequest(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="leave-detail-title"
                className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        name
                          .split(/\s+/)
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Leave request details
                      </p>
                      <h2
                        id="leave-detail-title"
                        className="mt-1 text-lg font-semibold text-slate-900"
                      >
                        {name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {employee?.email1 || "Email not provided"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    aria-label="Close details"
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Leave type</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {record.type_of_leave || "Leave"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {record.leave_days || "N/A"} day
                        {record.leave_days === "1" ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                    <p className="text-xs font-medium text-indigo-700">
                      Requested dates
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatLeaveDate(record.leave_from)}
                      {record.leave_to
                        ? ` – ${formatLeaveDate(record.leave_to)}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatLeaveDate(record.leave_from, {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Applied on</p>
                      <p className="mt-1 text-sm text-slate-800">
                        {formatLeaveDate(
                          record.date_entered || record.leave_from,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {record.status || "Applied"}
                      </p>
                    </div>
                  </div>
                  {record.description && (
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Reason / notes
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {record.description}
                      </p>
                    </div>
                  )}
                  <LeaveDocuments leaveId={record.id} />
                </div>
                {record.status === "Applied" && (
                  <div className="flex justify-end gap-2 border-t border-slate-100 p-5 sm:px-6">
                    <button
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate(
                          { id: record.id, status: "Rejected" },
                          { onSuccess: () => setSelectedRequest(null) },
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <X size={15} />
                      Deny
                    </button>
                    <button
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate(
                          { id: record.id, status: "Accepted" },
                          { onSuccess: () => setSelectedRequest(null) },
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      Approve
                    </button>
                  </div>
                )}
              </section>
            </div>
          );
        })()}
      {rejected.length > 0 && (
        <section
          aria-labelledby="rejected-requests-title"
          className="space-y-3"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
                Decision history
              </p>
              <h2
                id="rejected-requests-title"
                className="mt-1 text-xl font-semibold text-slate-900"
              >
                Rejected this month
              </h2>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              {
                records.filter(
                  (record) =>
                    record.status === "Rejected" &&
                    overlapsSelectedMonth(record),
                ).length
              }{" "}
              total
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rejected.map((record) => {
              const employee = employeeMap.get(
                record.employee_id ||
                  record.hrc_employees_hrc_leaves_1hrc_employees_ida,
              );
              const name = employee
                ? employeeName(employee)
                : [
                    record.hrc_employees_hrc_leaves_1_name,
                    record.hrc_candidates_hrc_leaves_1_name,
                    record.assigned_user_name,
                    record.name,
                  ]
                    .map(clean)
                    .find(Boolean) || "Employee";
              return (
                <article
                  key={record.id}
                  className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">
                        {name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {employee?.email1 || "Email not provided"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      Rejected
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-700">
                    {record.type_of_leave || "Leave"}{" "}
                    <span className="font-normal text-slate-400">·</span>{" "}
                    {record.leave_days || "N/A"} day
                    {record.leave_days === "1" ? "" : "s"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {record.leave_from || "Date not set"}
                    {record.leave_to ? ` – ${record.leave_to}` : ""}
                  </p>
                  {record.description && (
                    <p className="mt-3 line-clamp-2 border-t border-slate-100 pt-3 text-sm leading-5 text-slate-600">
                      {record.description}
                    </p>
                  )}
                  <LeaveDocuments leaveId={record.id} />
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
