import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Eye, Loader2, Pencil, Phone, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { fetchAllRecords } from "../candidates/candidatesApi";
import { deleteEmployee, employeeDate, employeeName } from "./employeesApi";
import EmployeeDetails from "./EmployeeDetails";

const clean = value => String(value || "").trim();
const department = record => clean(record.department) || clean(record.hrc_departments_hrc_employees_1_name);
const phone = record => clean(record.phone_mobile) || clean(record.phone_work);
const columns = [["name", "Employee"], ["email1", "Email"], ["phone", "Phone"], ["department", "Department"], ["joining_date", "Joining date"]];
const value = (record, key) => key === "name" ? employeeName(record) : key === "department" ? department(record) : key === "phone" ? phone(record) : key === "joining_date" ? employeeDate(record[key]) : clean(record[key]);
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50";

export default function EmployeesPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["employees", "list"], queryFn: () => fetchAllRecords("hrc_employees") });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "name", direction: 1 });
  const [selection, setSelection] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const records = query.data || [];
  const departments = [...new Set(records.map(department).filter(Boolean))].sort();
  const visible = records.filter(record => (!filter || department(record) === filter) && [employeeName(record), record.email1, phone(record), record.current_designation, record.title, department(record)].some(item => clean(item).toLowerCase().includes(search.trim().toLowerCase()))).sort((a, b) => value(a, sort.key).localeCompare(value(b, sort.key), undefined, { numeric: true, sensitivity: "base" }) * sort.direction);
  const pages = Math.max(1, Math.ceil(visible.length / 20));
  const currentPage = Math.min(page, pages);
  const rows = visible.slice((currentPage - 1) * 20, currentPage * 20);
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteEmployee(removing.id);
      client.setQueryData(["employees", "list"], items => items?.filter(item => item.id !== removing.id));
      client.removeQueries({ queryKey: ["employees", "detail", removing.id] });
      void client.invalidateQueries({ queryKey: ["employees", "list"] });
      setRemoving(null);
      toast.success("Employee deleted");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="min-h-full space-y-6 rounded-2xl bg-slate-50 p-3 sm:p-6">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary p-6 text-white sm:p-8">
      <div aria-hidden="true" className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[45px] border-white/5" />
      <div className="relative flex flex-wrap items-center justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">People workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Employees</h1><p className="mt-3 text-sm text-slate-300">Find your people, review their information and keep employee records up to date.</p></div><div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4"><Users size={28} className="text-indigo-300" /><div><p className="text-3xl font-semibold">{query.isPending ? "—" : records.length.toLocaleString()}</p><p className="mt-1 text-xs text-slate-300">Total employees</p></div></div></div>
    </header>
    <section aria-label="Employee directory" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-900">Employee directory</h2><p className="mt-1 text-xs text-slate-500">Select an employee to view and edit their profile.</p></div><div className="flex gap-2"><button onClick={() => query.refetch()} disabled={query.isFetching} className={buttonClass}><RefreshCw size={15} className={query.isFetching ? "animate-spin" : ""} />Refresh</button><button onClick={() => setSelection({})} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={16} />Add employee</button></div></div>
      <div className="flex flex-wrap gap-3 p-5"><label className="flex min-w-52 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={17} className="text-slate-400" /><input type="search" aria-label="Search employees" placeholder="Search name, email, phone or designation" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="w-full bg-transparent py-2.5 text-sm outline-none" /></label><select aria-label="Filter by department" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All departments</option>{departments.map(item => <option key={item}>{item}</option>)}</select>{(search || filter) && <button onClick={() => { setSearch(""); setFilter(""); setPage(1); }} className={buttonClass}>Clear filters</button>}</div>
      {query.isError && <p role="alert" className="mx-5 mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{query.error.message} <button onClick={() => query.refetch()} className="underline">Retry</button></p>}
      {query.isPending ? <p role="status" className="flex justify-center gap-2 p-16 text-slate-500"><Loader2 size={18} className="animate-spin" />Loading employees…</p> : !rows.length ? <div className="p-16 text-center"><Users className="mx-auto text-slate-300" size={32} /><h3 className="mt-4 font-semibold text-slate-800">{query.isError ? "Employees unavailable" : search || filter ? "No matching employees" : "No employees yet"}</h3><p className="mt-2 text-sm text-slate-500">{search || filter ? "Try another search or clear your filters." : "Add an employee to get started."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([key, label]) => <th key={key} scope="col" className="px-5 py-3" aria-sort={sort.key === key ? sort.direction === 1 ? "ascending" : "descending" : "none"}><button className="font-semibold uppercase" onClick={() => setSort(previous => ({ key, direction: previous.key === key ? -previous.direction : 1 }))}>{label}{sort.key === key ? sort.direction === 1 ? " ↑" : " ↓" : ""}</button></th>)}<th scope="col" className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((record, index) => <tr key={record.id || index} className="transition hover:bg-indigo-50/50"><td className="px-5 py-4"><button disabled={!record.id} onClick={() => setSelection({ id: record.id })} className="flex items-center gap-3 text-left font-semibold text-slate-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{employeeName(record).slice(0, 1).toUpperCase()}</span><span>{employeeName(record)}<span className="mt-1 block text-xs font-normal text-slate-500">{clean(record.current_designation) || clean(record.title) || "View profile"}</span></span></button></td><td className="px-5 py-4 text-slate-600">{clean(record.email1) || "—"}</td><td className="px-5 py-4 text-slate-600">{phone(record) || "—"}</td><td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{department(record) || "Unassigned"}</span></td><td className="px-5 py-4 text-slate-600">{clean(record.joining_date) || "—"}</td><td className="px-5 py-4"><div className="flex gap-1"><button aria-label={`View ${employeeName(record)}`} title="View details" disabled={!record.id} onClick={() => setSelection({ id: record.id })} className={buttonClass}><Eye size={15} /></button><button aria-label={`Edit ${employeeName(record)}`} title="Edit employee" disabled={!record.id} onClick={() => setSelection({ id: record.id, edit: true })} className={buttonClass}><Pencil size={15} /></button>{phone(record) && String(record.do_not_call) !== "1" ? <a aria-label={`Call ${employeeName(record)}`} title="Call employee" href={`tel:${phone(record).replace(/[^+\d*#,;]/g, "")}`} className={buttonClass}><Phone size={15} /></a> : <button disabled aria-label={String(record.do_not_call) === "1" ? "Do not call" : "No phone number"} title={String(record.do_not_call) === "1" ? "Do not call" : "No phone number"} className={buttonClass}><Phone size={15} /></button>}<button aria-label={`Delete ${employeeName(record)}`} title="Delete employee" disabled={!record.id} onClick={() => { setError(""); setRemoving(record); }} className={`${buttonClass} text-red-600`}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500"><p>{visible.length ? (currentPage - 1) * 20 + 1 : 0}–{Math.min(currentPage * 20, visible.length)} of {visible.length} employees</p><div className="flex items-center gap-3"><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className={buttonClass}><ChevronLeft size={16} /></button><span>Page {currentPage} of {pages}</span><button aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className={buttonClass}><ChevronRight size={16} /></button></div></footer>
    </section>
    {selection && <EmployeeDetails key={selection.id || "new"} selection={selection} onClose={() => setSelection(null)} />}
    <Dialog.Root open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45" /><Dialog.Content className="fixed left-1/2 top-1/2 z-999 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl" onInteractOutside={event => event.preventDefault()}><Dialog.Title className="text-lg font-semibold">Delete employee?</Dialog.Title><Dialog.Description className="mt-2 text-sm text-slate-600">{removing ? employeeName(removing) : "This employee"} will be removed from the directory. Confirm to continue.</Dialog.Description>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button disabled={busy} onClick={() => setRemoving(null)} className={buttonClass}>Cancel</button><button disabled={busy} onClick={remove} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" />}Delete employee</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </main>;
}
