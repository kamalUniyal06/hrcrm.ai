import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { fetchAllRecords } from "../candidates/candidatesApi";
import { employeeDate, employeeName, formatJoinDate, tenure } from "./employeesApi";
import EmployeeDetails, { EmployeeAvatar } from "./EmployeeDetails";
import { pageGutter } from "../../employement/components/home/homeUi";

const PAGE_SIZE = 20;
const clean = (value) => String(value || "").trim();
const department = (record) =>
  clean(record.department) ||
  clean(record.hrc_departments_hrc_employees_1_name);
const phone = (record) =>
  clean(record.phone_mobile) || clean(record.phone_work);
const designation = (record) =>
  clean(record.current_designation) || clean(record.title);
const columns = [
  ["name", "Employee"],
  ["email1", "Contact"],
  ["department", "Department"],
  ["joining_date", "Joined"],
];
const value = (record, key) =>
  key === "name"
    ? employeeName(record)
    : key === "department"
      ? department(record)
      : key === "joining_date"
        ? employeeDate(record[key])
        : clean(record[key]);
const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const CARD_FILTERS = {
  all: () => true,
  newThisMonth: (record) => employeeDate(record.joining_date).startsWith(thisMonth()),
  missingContact: (record) => !clean(record.email1) || !phone(record),
};
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40";
const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40";

export default function EmployeesPage() {
  const query = useQuery({
    queryKey: ["employees", "list"],
    queryFn: () => fetchAllRecords("hrc_employees"),
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [cardFilter, setCardFilter] = useState("all");
  const [view, setView] = useState("table");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "name", direction: 1 });
  const [selection, setSelection] = useState(null);
  const records = query.data || [];
  const departments = [
    ...new Set(records.map(department).filter(Boolean)),
  ].sort();
  const term = search.trim().toLowerCase();
  const visible = records
    .filter(
      (record) =>
        CARD_FILTERS[cardFilter](record) &&
        (!filter || department(record) === filter) &&
        [
          employeeName(record),
          record.email1,
          phone(record),
          designation(record),
          department(record),
        ].some((item) => clean(item).toLowerCase().includes(term)),
    )
    .sort(
      (a, b) =>
        value(a, sort.key).localeCompare(value(b, sort.key), undefined, {
          numeric: true,
          sensitivity: "base",
        }) * sort.direction,
    );
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtered = Boolean(search || filter || cardFilter !== "all");
  const overview = [
    ["all", "Total employees", records.length, Users, "text-indigo-600 bg-indigo-50"],
    ["departments", "Departments", departments.length, Building2, "text-sky-600 bg-sky-50"],
    ["newThisMonth", "Joined this month", records.filter(CARD_FILTERS.newThisMonth).length, UserPlus, "text-emerald-700 bg-emerald-50"],
    ["missingContact", "Missing contact info", records.filter(CARD_FILTERS.missingContact).length, UserX, "text-amber-600 bg-amber-50"],
  ];

  function resetPage(update) {
    update();
    setPage(1);
  }
  function clearFilters() {
    resetPage(() => {
      setSearch("");
      setFilter("");
      setCardFilter("all");
    });
  }
  function toggleSort(key) {
    setSort((previous) => ({
      key,
      direction: previous.key === key ? -previous.direction : 1,
    }));
  }

  return (
    <main className={`min-h-full space-y-6 rounded-2xl bg-slate-50 ${pageGutter}`}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            People workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Employees
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Find your people, review their profiles and keep records up to date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className={buttonClass}
          >
            <RefreshCw size={15} className={query.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setSelection({})}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add employee
          </button>
        </div>
      </header>

      <section aria-label="Employee overview" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {overview.map((item) => {
          const [id, label, count, Icon, color] = item;
          const selectable = id in CARD_FILTERS;
          const active = selectable && cardFilter === id;
          return (
            <button
              key={id}
              type="button"
              disabled={!selectable}
              aria-pressed={selectable ? active : undefined}
              onClick={() => resetPage(() => setCardFilter(id))}
              className={`flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 text-left transition enabled:hover:border-indigo-200 enabled:hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-default ${active ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"}`}
            >
              <span className={`rounded-xl p-3 ${color}`}>
                <Icon size={21} />
              </span>
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {query.isPending ? "—" : count.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </button>
          );
        })}
      </section>

      <section
        aria-label="Employee directory"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
            <Search size={16} className="text-slate-400" />
            <input
              type="search"
              aria-label="Search employees"
              placeholder="Search name, email, phone, designation or department"
              value={search}
              onChange={(event) => resetPage(() => setSearch(event.target.value))}
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </label>
          <select
            aria-label="Filter by department"
            value={filter}
            onChange={(event) => resetPage(() => setFilter(event.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"
          >
            <option value="">All departments</option>
            {departments.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Directory layout">
            {[["table", List, "Table view"], ["cards", LayoutGrid, "Card view"]].map((option) => {
              const [id, Icon, label] = option;
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={`rounded-lg p-1.5 transition ${view === id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
          {filtered && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline">
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>

        {query.isError && (
          <p role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {query.error.message}{" "}
            <button type="button" onClick={() => query.refetch()} className="font-semibold underline">
              Retry
            </button>
          </p>
        )}

        {query.isPending ? (
          <p role="status" className="flex justify-center gap-2 p-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Loading employees…
          </p>
        ) : !rows.length ? (
          <div className="p-16 text-center">
            <Users className="mx-auto text-slate-300" size={32} />
            <h3 className="mt-4 font-semibold text-slate-800">
              {query.isError
                ? "Employees unavailable"
                : filtered
                  ? "No matching employees"
                  : "No employees yet"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {filtered
                ? "Try another search or clear your filters."
                : "Add an employee to get started."}
            </p>
          </div>
        ) : view === "cards" ? (
          <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.map((record, index) => (
              <li key={record.id || index}>
                <button
                  type="button"
                  disabled={!record.id}
                  onClick={() => setSelection({ id: record.id })}
                  className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-indigo-200 enabled:hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar name={employeeName(record)} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{employeeName(record)}</p>
                      <Designation value={designation(record)} />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <ContactLine kind="email" value={clean(record.email1)} />
                    <ContactLine kind="phone" value={phone(record)} />
                  </div>
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                      <DepartmentChip name={department(record)} />
                      <span className="text-slate-400">{formatJoinDate(record.joining_date)}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <tr>
                  {columns.map(([key, label]) => (
                    <th
                      key={key}
                      scope="col"
                      className="px-5 py-3 font-semibold"
                      aria-sort={sort.key === key ? (sort.direction === 1 ? "ascending" : "descending") : "none"}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1 transition hover:text-slate-800"
                      >
                        {label}
                        {sort.key === key && (sort.direction === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((record, index) => (
                  <tr
                    key={record.id || index}
                    onClick={record.id ? () => setSelection({ id: record.id }) : undefined}
                    className="group cursor-pointer transition hover:bg-indigo-50/40"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar name={employeeName(record)} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            disabled={!record.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelection({ id: record.id });
                            }}
                            className="max-w-56 truncate text-left font-semibold text-slate-900 transition hover:text-indigo-600 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                          >
                            {employeeName(record)}
                          </button>
                          <Designation value={designation(record)} className="max-w-56" />
                        </div>
                      </div>
                    </td>
                    <td className="space-y-1.5 px-5 py-3.5">
                      <ContactLine kind="email" value={clean(record.email1)} className="max-w-64" />
                      <ContactLine kind="phone" value={phone(record)} />
                    </td>
                    <td className="px-5 py-3.5">
                      <DepartmentChip name={department(record)} />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-700">{formatJoinDate(record.joining_date)}</p>
                      {tenure(record.joining_date) && (
                        <p className="mt-0.5 text-xs text-slate-400">{tenure(record.joining_date)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        aria-label={`Edit ${employeeName(record)}`}
                        title="Edit employee"
                        disabled={!record.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelection({ id: record.id, edit: true });
                        }}
                        className={`${iconButton} opacity-60 group-hover:opacity-100`}
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <p>
            {visible.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length} employees
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className={buttonClass}
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Page {currentPage} of {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
              className={buttonClass}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </footer>
      </section>

      {selection && (
        <EmployeeDetails
          key={selection.id || "new"}
          selection={selection}
          departments={departments}
          onClose={() => setSelection(null)}
        />
      )}
    </main>
  );
}

function Designation({ value, className = "" }) {
  return (
    <p className={`truncate text-xs ${value ? "font-medium text-violet-600" : "text-slate-400"} ${className}`}>
      {value || "No designation"}
    </p>
  );
}

const CONTACT_STYLES = {
  email: { icon: Mail, missing: "No email", iconTone: "bg-sky-50 text-sky-600", text: "text-sky-700" },
  phone: { icon: Phone, missing: "No phone", iconTone: "bg-emerald-50 text-emerald-600", text: "text-emerald-700" },
};

// Email and phone each get their own colour so they're easy to tell apart at a glance.
function ContactLine({ kind, value, className = "" }) {
  const style = CONTACT_STYLES[kind];
  const Icon = style.icon;
  return (
    <p className={`flex items-center gap-2 text-xs ${className}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${value ? style.iconTone : "bg-slate-100 text-slate-400"}`}>
        <Icon size={11} />
      </span>
      <span className={`truncate ${value ? `font-medium ${style.text}` : "text-slate-400"}`}>{value || style.missing}</span>
    </p>
  );
}

function DepartmentChip({ name }) {
  return name ? (
    <span className="inline-flex max-w-44 items-center gap-1.5 truncate rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
      <Building2 size={12} className="shrink-0" />
      {name}
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
      Unassigned
    </span>
  );
}
