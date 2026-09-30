import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Search, LogOut, ChevronDown, CheckCircle2, Clock3, ClipboardCheck, Users } from "lucide-react";
import { fetchAllRecords } from "../../pages/candidates/candidatesApi";
import { employeeName } from "../../pages/employees/employeesApi";
import {
  getAllResignations,
  updateResignationRecord,
} from "../api/resignation.api";

const RESIGNATIONS_KEY = ["resignations", "offboarding"];
const EMPLOYEES_KEY = ["employees", "list"];
const clean = (value) => String(value ?? "").trim();
const isComplete = (value) => value === true || value === 1 || value === "1";

const APPROVALS = [
  { field: "notify_tl", label: "Team lead" },
  { field: "notify_manager", label: "Manager" },
  { field: "notify_hr", label: "HR" },
];

const CHECKOUT_TASKS = [
  { field: "assets", label: "Assets returned" },
  { field: "kt", label: "Knowledge transfer" },
  { field: "exit_interview", label: "Exit interview" },
  { field: "reviews", label: "Reviews closed" },
  { field: "salary_slip", label: "Salary slip" },
  { field: "decleration_form", label: "Declaration form" },
];

function employeeForRecord(record, employees) {
  const email = clean(record.name).toLowerCase();
  return (
    employees.find(
      (employee) =>
        clean(employee.email1 || employee.email).toLowerCase() === email,
    ) || null
  );
}

function getState(record) {
  const approvalsReady = APPROVALS.every((a) => isComplete(record[a.field]));
  const doneTasks = CHECKOUT_TASKS.filter((t) =>
    isComplete(record[t.field]),
  ).length;
  const completed = approvalsReady && doneTasks === CHECKOUT_TASKS.length;
  const label = completed
    ? "Complete"
    : approvalsReady
      ? "Checkout in progress"
      : "Awaiting approvals";
  const cls = completed
    ? "text-emerald-700"
    : approvalsReady
      ? "text-indigo-700"
      : "text-amber-700";
  return { approvalsReady, doneTasks, completed, label, cls };
}

export default function OffboardingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const resignations = useQuery({
    queryKey: RESIGNATIONS_KEY,
    queryFn: getAllResignations,
  });
  const employeesQuery = useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: () => fetchAllRecords("hrc_employees"),
  });
  const mutation = useMutation({
    mutationFn: ({ id, field, value }) =>
      updateResignationRecord(id, { [field]: value }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: RESIGNATIONS_KEY }),
  });

  const records = resignations.data || [];
  const employees = employeesQuery.data || [];

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const state = getState(record);
      if (statusFilter === "pending" && state.approvalsReady) return false;
      if (statusFilter === "progress" && (!state.approvalsReady || state.completed)) return false;
      if (statusFilter === "complete" && !state.completed) return false;
      const employee = employeeForRecord(record, employees);
      const name = employee ? employeeName(employee) : clean(record.name);
      return (
        !query ||
        [name, record.name, record.status].some((value) =>
          clean(value).toLowerCase().includes(query),
        )
      );
    });
  }, [records, employees, search, statusFilter]);

  const handleTaskChange = (record, field, checked) => {
    mutation.mutate({ id: record.id, field, value: checked ? "1" : "0" });
  };

  if (resignations.isPending || employeesQuery.isPending) {
    return (
      <main className="grid min-h-0 flex-1 place-items-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" />
          Loading offboarding records…
        </span>
      </main>
    );
  }

  if (resignations.isError) {
    return (
      <main className="p-4">
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p>
            {resignations.error?.message ||
              "Could not load offboarding records."}
          </p>
          <button
            type="button"
            onClick={() => resignations.refetch()}
            className="mt-1 font-semibold underline"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const busy = mutation.isPending ? mutation.variables : null;
  const counts = {
    all: records.length,
    pending: records.filter((record) => !getState(record).approvalsReady).length,
    progress: records.filter((record) => getState(record).approvalsReady && !getState(record).completed).length,
    complete: records.filter((record) => getState(record).completed).length,
  };
  return (
    <main className="min-w-0 space-y-6 pb-8 text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-primary/10 p-3 text-primary"><LogOut className="size-6" /></span>
          <div><h1 className="text-2xl font-semibold tracking-tight">Employee offboarding</h1><p className="mt-1 text-sm text-muted-foreground">Manage approvals, handovers, and every step of an employee's exit.</p></div>
        </div>
        <button type="button" onClick={() => { resignations.refetch(); employeesQuery.refetch(); }} disabled={resignations.isFetching || employeesQuery.isFetching} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm hover:bg-muted disabled:opacity-50"><RefreshCw className={resignations.isFetching || employeesQuery.isFetching ? "size-4 animate-spin" : "size-4"} />Refresh</button>
      </header>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["all", "Total cases", Users],
          ["pending", "Awaiting approvals", Clock3],
          ["progress", "Checkout in progress", ClipboardCheck],
          ["complete", "Completed", CheckCircle2],
        ].map(([key, label, Icon]) => <button key={key} type="button" aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)} className={"rounded-2xl border bg-card p-5 text-left transition " + (statusFilter === key ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/40")}><div className="flex items-start justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className="size-5 text-primary" /></div><p className="mt-3 text-3xl font-semibold tabular-nums">{counts[key]}</p></button>)}
      </div>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-label="Offboarding cases">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <div><h2 className="font-semibold">Offboarding cases <span className="ml-2 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{rows.length}</span></h2><p className="mt-1 text-xs text-muted-foreground">Open a case to review approvals and update its checklist.</p></div>
          <label className="relative w-full sm:w-72"><span className="sr-only">Search employees</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus-visible:outline-primary" /></label>
        </div>
        {employeesQuery.isError && <p role="alert" className="m-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Employee profiles could not be loaded. Showing saved case details. Use Refresh to retry.</p>}
        {mutation.isError && <p role="alert" className="m-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{mutation.error?.message || "Could not save checklist update."}</p>}
        {rows.length === 0 ? <div className="px-6 py-16 text-center"><ClipboardCheck className="mx-auto mb-4 size-10 text-muted-foreground/50" /><h3 className="font-semibold">{records.length ? "No matching cases" : "No offboarding cases yet"}</h3><p className="mt-2 text-sm text-muted-foreground">{records.length ? "Try another search or status filter." : "Employee resignation requests will appear here."}</p>{(search || statusFilter !== "all") && <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="mt-4 text-sm font-semibold text-primary">Clear filters</button>}</div> :
          <div className="divide-y divide-border">{rows.map((record) => {
            const employee = employeeForRecord(record, employees);
            const name = employee ? employeeName(employee) : clean(record.name) || "Employee";
            const email = employee?.email1 || record.name || "";
            const state = getState(record);
            const approvalsDone = APPROVALS.filter((item) => isComplete(record[item.field])).length;
            return <details key={record.id} className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-5 transition hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">{name.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1 basis-48"><h3 className="break-words text-sm font-semibold">{name}</h3><p className="mt-1 break-all text-xs text-muted-foreground">{email}</p></div>
                <div className="min-w-36"><span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-medium " + (state.completed ? "bg-emerald-100 text-emerald-800" : state.approvalsReady ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-800")}>{state.label}</span><p className="mt-2 text-xs text-muted-foreground">{record.notice_period ? record.notice_period + " days notice" : "Notice period not specified"}</p></div>
                <div className="w-32"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Checklist</span><span>{state.doneTasks}/{CHECKOUT_TASKS.length}</span></div><div role="progressbar" aria-label={name + " checkout tasks"} aria-valuemin={0} aria-valuemax={CHECKOUT_TASKS.length} aria-valuenow={state.doneTasks} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: (state.doneTasks / CHECKOUT_TASKS.length * 100) + "%" }} /></div></div>
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-5 border-t border-border bg-muted/20 p-5 sm:p-6">
                <p className="text-xs text-muted-foreground">Submitted {record.date_entered_uni_format || record.date_entered || "date unavailable"}</p>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <section className="rounded-xl border border-border bg-card p-4"><h4 className="text-sm font-semibold">Approvals <span className="ml-2 text-xs font-normal text-muted-foreground">{approvalsDone}/{APPROVALS.length} verified</span></h4><div className="mt-4 space-y-3">{APPROVALS.map((item) => <div key={item.field} className="flex items-center justify-between gap-3 text-sm"><span>{item.label}</span><span className={"flex items-center gap-1.5 text-xs " + (isComplete(record[item.field]) ? "text-emerald-700" : "text-muted-foreground")}>{isComplete(record[item.field]) ? <CheckCircle2 className="size-3.5" /> : <Clock3 className="size-3.5" />}{isComplete(record[item.field]) ? "Verified" : "Pending"}</span></div>)}</div></section>
                  <section className="rounded-xl border border-border bg-card p-4"><h4 className="text-sm font-semibold">Exit checklist</h4><p className="mt-1 text-xs text-muted-foreground">{state.approvalsReady ? "Mark each task complete as the employee finishes their handover." : "Checklist updates unlock after all three approvals are verified."}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{CHECKOUT_TASKS.map((task) => {
                    const saving = busy?.id === record.id && busy?.field === task.field;
                    return <label key={task.field} className={"flex items-center gap-3 rounded-lg border p-3 text-sm " + (isComplete(record[task.field]) ? "border-primary/20 bg-primary/5 " : "border-border ") + (!state.approvalsReady || busy ? "cursor-not-allowed" : "cursor-pointer hover:bg-muted/40")}><input type="checkbox" checked={isComplete(record[task.field])} disabled={!state.approvalsReady || Boolean(busy)} onChange={(event) => handleTaskChange(record, task.field, event.target.checked)} className="size-4 shrink-0 accent-primary disabled:opacity-40" /><span className="flex-1">{task.label}</span>{saving && <Loader2 aria-label="Saving" className="size-4 animate-spin text-primary" />}</label>;
                  })}</div></section>
                </div>
              </div>
            </details>;
          })}</div>}
      </section>
    </main>
  );
}
