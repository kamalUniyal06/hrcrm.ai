import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw, Search, Wallet, X } from "lucide-react";
import { fetchAllRecords } from "../candidates/candidatesApi";
import { amount, clean, difference, formatAmount, salaryName } from "./salaryUtils";

const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50";
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const columns = ["Employee / record", "Month", "Offered salary", "Paid amount", "Difference", "Working days", "Leaves", "Details"];

export default function SalariesPage() {
  const query = useQuery({ queryKey: ["salaries", "list"], queryFn: () => fetchAllRecords("hrc_salaries") });
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const records = query.data || [];
  const availableMonths = [...new Set(records.map(record => clean(record.month)).filter(Boolean))]
    .sort((a, b) => months.indexOf(a) - months.indexOf(b) || a.localeCompare(b));
  const filtered = records.filter(record => (!month || clean(record.month) === month) &&
    [salaryName(record), record.name, record.month].some(value => clean(value).toLowerCase().includes(search.trim().toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const total = field => {
    const values = filtered.map(record => amount(record[field])).filter(value => value !== null);
    return values.length ? formatAmount(values.reduce((sum, value) => sum + value, 0)) : "—";
  };
  const details = selected ? [
    ["Employee / record", salaryName(selected)], ["Record name", selected.name],
    ["Month", selected.month], ["Offered salary", formatAmount(selected.offered_salary)],
    ["Paid amount", formatAmount(selected.paid_amount)], ["Difference (offered − paid)", formatAmount(difference(selected))],
    ["Total working days", selected.total_working_days], ["Leaves of month", selected.leaves_of_month],
    ["Account number", selected.account_number], ["Assigned to", selected.assigned_user_name],
    ["Created", selected.date_entered_uni_format || selected.date_entered], ["Created by", selected.created_by_name],
    ["Last modified", selected.date_modified_uni_format || selected.date_modified], ["Modified by", selected.modified_by_name],
    ["Description", selected.description],
  ] : [];

  return <main className="min-h-full space-y-6 rounded-2xl bg-slate-50 p-3 sm:p-6">
    <header className="rounded-3xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary p-6 text-white sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">People workspace</p>
      <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold"><Wallet aria-hidden="true" />Salary management</h1>
      <p className="mt-3 text-sm text-slate-200">Review employee salaries, paid amounts and monthly attendance details.</p>
    </header>
    <div className="grid gap-4 sm:grid-cols-3">
      {[["Salary records", filtered.length.toLocaleString()], ["Total offered salary", total("offered_salary")], ["Total paid amount", total("paid_amount")]].map(([label, value]) =>
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{query.isPending || (query.isError && !query.data) ? "—" : value}</p><p className="mt-2 text-xs text-slate-400">Current filtered records</p></div>)}
    </div>
    <section aria-label="Salary records" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div><h2 className="font-semibold text-slate-900">Salary records</h2><p className="mt-1 text-xs text-slate-500">Amounts shown as supplied. Difference is offered salary minus paid amount.</p></div>
        <button className={button} disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} />Refresh</button>
      </div>
      <div className="flex flex-wrap gap-3 p-5">
        <label className="flex min-w-52 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={17} className="text-slate-400" /><input aria-label="Search salary records" type="search" placeholder="Search employee, email or month" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="w-full bg-transparent py-2.5 text-sm outline-none" /></label>
        <select aria-label="Filter by month" value={month} onChange={event => { setMonth(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All months</option>{availableMonths.map(value => <option key={value}>{value}</option>)}</select>
        {(search || month) && <button className={button} onClick={() => { setSearch(""); setMonth(""); setPage(1); }}>Clear filters</button>}
      </div>
      {query.isError && <p role="alert" className="mx-5 mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{query.error.message} <button className="underline" onClick={() => query.refetch()}>Retry</button></p>}
      {query.isPending ? <p role="status" className="flex justify-center gap-2 p-16 text-slate-500"><Loader2 size={18} className="animate-spin" />Loading salary records…</p> : rows.length ?
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(label => <th key={label} scope="col" className="px-5 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((record, index) => <tr key={record.id || index} className="hover:bg-indigo-50/50">
            <td className="px-5 py-4"><button onClick={() => setSelected(record)} className="text-left font-semibold text-slate-900 hover:text-indigo-600">{salaryName(record)}</button>{clean(record.name) && clean(record.name) !== salaryName(record) && <p className="mt-1 text-xs text-slate-500">{clean(record.name)}</p>}</td>
            <td className="px-5 py-4">{clean(record.month) || "—"}</td>
            {[record.offered_salary, record.paid_amount, difference(record)].map((value, index) => <td key={index} className="whitespace-nowrap px-5 py-4 tabular-nums">{formatAmount(value)}</td>)}
            <td className="px-5 py-4">{clean(record.total_working_days) || "—"}</td><td className="px-5 py-4">{clean(record.leaves_of_month) || "—"}</td>
            <td className="px-5 py-4"><button className={button} aria-label={`View salary details for ${salaryName(record)}`} onClick={() => setSelected(record)}><Eye size={16} /></button></td>
          </tr>)}</tbody>
        </table></div> : <div className="p-16 text-center text-slate-500"><Wallet size={32} className="mx-auto mb-4 text-slate-300" /><p>{query.isError ? "Salary records unavailable." : search || month ? "No matching salary records. Try clearing your filters." : "No salary records yet."}</p></div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
        <p>{filtered.length ? (currentPage - 1) * 20 + 1 : 0}–{Math.min(currentPage * 20, filtered.length)} of {filtered.length} records</p>
        <div className="flex items-center gap-3"><button className={button} aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>Page {currentPage} of {pages}</span><button className={button} aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div>
      </footer>
    </section>
    <Dialog.Root open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[1100] bg-slate-950/45" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[1101] max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <Dialog.Title className="pr-10 text-xl font-semibold text-slate-900">Salary details</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-slate-500">Salary, attendance and record information for the selected employee.</Dialog.Description>
        <Dialog.Close aria-label="Close salary details" className="absolute right-5 top-5 rounded-lg p-2 hover:bg-slate-100"><X size={18} /></Dialog.Close>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">{details.map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{clean(value) || "—"}</dd></div>)}</dl>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </main>;
}
