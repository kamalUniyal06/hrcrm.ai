import { useState } from "react";
import { useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileText, Loader2, RefreshCw, Search, Users, X } from "lucide-react";
import { getAllLeaves, getLeaveDocuments, updateLeaveStatus } from "../../api/leaves.api";
import { fetchAllRecords } from "../../../pages/candidates/candidatesApi";
import { employeeName } from "../../../pages/employees/employeesApi";

const key = ["leaves", "admin-feed"];
const clean = (value) => String(value || "").trim();

function LeaveDocuments({ leaveId }) {
  const documents = useQuery({
    queryKey: ["leaves", "documents", leaveId],
    queryFn: () => getLeaveDocuments(leaveId),
    enabled: Boolean(leaveId),
  });

  if (documents.isPending) return <p className="mt-3 text-xs text-slate-400">Loading attached documents…</p>;
  if (documents.isError) return <p className="mt-3 text-xs text-rose-600">Could not load attached documents.</p>;
  if (!documents.data?.length) return null;

  return <div className="mt-3 space-y-3">
    <p className="text-xs font-semibold text-slate-600">Attached documents</p>
    {documents.data.map((document) => {
      const url = clean(document.image_url || document.file_url);
      const name = clean(document.filename || document.name) || "Leave document";
      const mime = clean(document.file_mime_type).toLowerCase();
      return <div key={document.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 p-3">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700"><FileText size={17} className="shrink-0 text-indigo-500" /><span className="truncate">{name}</span></span>
          {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Open <ExternalLink size={13} /></a>}
        </div>
        {url && mime.startsWith("image/") && <a href={url} target="_blank" rel="noreferrer" aria-label={"Open " + name}><img src={url} alt={name} loading="lazy" className="max-h-72 w-full object-contain bg-slate-50" /></a>}
        {url && mime === "application/pdf" && <iframe title={name} src={url} loading="lazy" className="h-80 w-full border-t border-slate-100" />}
      </div>;
    })}
  </div>;
}

export default function AdminLeaveNews() {
  const isAdmin = useSelector((state) => state.user.userInfo?.status === "admin");
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("All statuses");
  const [search, setSearch] = useState("");
  const leaves = useQuery({ queryKey: key, queryFn: getAllLeaves, enabled: isAdmin });
  const employees = useQuery({ queryKey: ["employees", "list"], queryFn: () => fetchAllRecords("hrc_employees"), enabled: isAdmin });
  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateLeaveStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  if (!isAdmin) return null;
  const response = leaves.data;
  const employeeMap = new Map((employees.data || []).map((employee) => [employee.id, employee]));
  const records = response?.records || [];
  const pendingCount = records.filter((record) => record.status === "Applied").length;
  const visible = records.filter((record) => {
    if (filter !== "All statuses" && record.status !== filter) return false;
    const employee = employeeMap.get(record.employee_id || record.hrc_employees_hrc_leaves_1hrc_employees_ida);
    const name = employee ? employeeName(employee) : [record.hrc_employees_hrc_leaves_1_name, record.hrc_candidates_hrc_leaves_1_name, record.assigned_user_name, record.name].map(clean).find(Boolean) || "Employee";
    return [name, employee?.email1, record.name, record.type_of_leave, record.status].some((value) => clean(value).toLowerCase().includes(search.trim().toLowerCase()));
  });
  const totalPages = Math.max(1, Math.ceil(visible.length / 12));
  const currentPage = Math.min(page, totalPages);
  const rows = visible.slice((currentPage - 1) * 12, currentPage * 12);

  return <section className="mx-auto max-w-7xl space-y-6">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary px-6 py-8 text-white shadow-lg sm:px-9 sm:py-10"><div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[32px] border-white/10" /><div className="relative flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">People & culture / Leave desk</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Team leave requests</h1><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">A clear view of who's taking time away. Search your team, review the details, and respond to pending requests.</p></div><div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur"><p className="text-xs text-indigo-100">Requests awaiting review</p><p className="mt-1 text-3xl font-semibold">{leaves.isPending ? "..." : pendingCount}</p></div></div></header>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><CalendarDays size={19} /></span><div><p className="text-xs text-slate-500">Total requests</p><p className="text-2xl font-semibold text-slate-900">{response?.total ?? "—"}</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><Clock3 size={19} /></span><div><p className="text-xs text-slate-500">Awaiting review</p><p className="text-2xl font-semibold text-slate-900">{leaves.isPending ? "—" : pendingCount}</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Users size={19} /></span><div><p className="text-xs text-slate-500">Employees in directory</p><p className="text-2xl font-semibold text-slate-900">{employees.data?.length ?? "—"}</p></div></div></div></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="font-semibold text-slate-900">Recent requests</h2><p className="mt-1 text-xs text-slate-500">Search by employee name or email address.</p></div><div className="flex flex-wrap gap-2"><label className="relative"><span className="sr-only">Search employee name or email</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name or email" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 sm:w-56" /></label><label className="sr-only" htmlFor="leave-status-filter">Filter leave requests</label><select id="leave-status-filter" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>All statuses</option><option>Applied</option><option>Accepted</option><option>Rejected</option></select><button type="button" onClick={() => { leaves.refetch(); employees.refetch(); }} disabled={leaves.isFetching || employees.isFetching} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50" aria-label="Refresh leave requests"><RefreshCw size={16} className={leaves.isFetching || employees.isFetching ? "animate-spin" : ""} /></button></div></div>
    {mutation.isError && <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-7">{mutation.error.message}</p>}
    {leaves.isPending || employees.isPending ? <p role="status" className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Loading employee requests...</p>
      : leaves.isError || response?.success !== true ? <div role="alert" className="p-10 text-center text-sm text-red-700">{leaves.error?.message || response?.message || "Could not load leave requests."}<button type="button" onClick={() => leaves.refetch()} className="ml-2 underline">Retry</button></div>
      : employees.isError ? <div role="alert" className="p-8 text-center text-sm text-red-700">Employee names could not be loaded. <button type="button" onClick={() => employees.refetch()} className="underline">Retry</button></div>
      : !rows.length ? <div className="p-12 text-center"><CalendarDays size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">{search || filter !== "All statuses" ? "No matching leave requests. Try a different search or status." : "No employee leave requests yet."}</p></div>
      : <div className="divide-y divide-slate-100">{rows.map((record) => {
        const pending = mutation.isPending && mutation.variables?.id === record.id;
        const employee = employeeMap.get(record.employee_id || record.hrc_employees_hrc_leaves_1hrc_employees_ida);
        const name = employee ? employeeName(employee) : [record.hrc_employees_hrc_leaves_1_name, record.hrc_candidates_hrc_leaves_1_name, record.assigned_user_name, record.name].map(clean).find(Boolean) || "Employee";
        return <article key={record.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.status === "Accepted" ? "bg-emerald-50 text-emerald-700" : record.status === "Rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{record.status || "Applied"}</span></div><p className="mt-1 break-all text-xs text-slate-500">{employee?.email1 || record.name || "Email not provided"}</p>
          <p className="mt-2 text-sm text-slate-600">{record.type_of_leave || "Leave"} / {record.leave_days || "N/A"} day{record.leave_days === "1" ? "" : "s"}</p><p className="mt-1 text-xs text-slate-500">{record.leave_from || "Date not set"}{record.leave_to ? ` - ${record.leave_to}` : ""}{record.date_entered_time_ago ? ` / ${record.date_entered_time_ago}` : ""}</p>{record.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{record.description}</p>}<LeaveDocuments leaveId={record.id} /></div>
          {record.status === "Applied" && <div className="flex shrink-0 gap-2"><button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: record.id, status: "Accepted" })} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Accept</button><button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: record.id, status: "Rejected" })} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X size={15} />Reject</button></div>}
        </article>;
      })}</div>}
    {!leaves.isPending && !leaves.isError && !employees.isPending && <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:px-7"><span>Showing {visible.length ? (currentPage - 1) * 12 + 1 : 0}-{Math.min(currentPage * 12, visible.length)} of {visible.length} requests</span><div className="flex gap-2"><button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></footer>}
    </div>
  </section>;
}
