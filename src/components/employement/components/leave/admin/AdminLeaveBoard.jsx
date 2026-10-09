import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Clock3, Loader2, Palmtree, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAllLeaves, updateLeaveStatus } from "../../../api/leaves.api";
import { fetchAllRecords } from "../../../../pages/candidates/candidatesApi";
import AdminLeaveFilters from "./AdminLeaveFilters";
import LeaveDetailPanel from "./LeaveDetailPanel";
import LeaveKanban from "./LeaveKanban";
import {
  ADMIN_LEAVE_QUERY_KEY,
  clean,
  statusOf,
} from "./leaveAdminUtils";

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0");
  return { fromDate: `${year}-${month}-01`, fromTime: "00:00", toDate: `${year}-${month}-${lastDay}`, toTime: "23:59" };
}

const SUMMARY_CARDS = [
  { id: "All", label: "All requests" },
  { id: "Applied", label: "Awaiting review" },
  { id: "Accepted", label: "Approved" },
  { id: "Rejected", label: "Rejected" },
];

const DATE_FIELDS = {
  leave: "leave_from",
  applied: "date_entered",
  approved: "date_modified",
};

function employeeName(employee) {
  return clean(employee.name) || [employee.first_name, employee.last_name].map(clean).filter(Boolean).join(" ");
}

function SummaryIcon({ status }) {
  if (status === "Applied") return <Clock3 size={19} />;
  if (status === "Accepted") return <Check size={19} />;
  if (status === "Rejected") return <X size={19} />;
  return <CalendarDays size={19} />;
}

export default function AdminLeaveBoard() {
  const isAdmin = useSelector((state) => state.user.userInfo?.status === "admin");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const defaultRange = useMemo(currentMonthRange, []);
  const [range, setRange] = useState(defaultRange);
  const [dateMode, setDateMode] = useState("applied");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const closeDetails = useCallback(() => setSelectedRequest(null), []);

  const employees = useQuery({ queryKey: ["employees", "list"], queryFn: () => fetchAllRecords("hrc_employees"), enabled: isAdmin });
  const searchedEmployee = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return null;
    return (employees.data || []).find((employee) => {
      const name = employeeName(employee).toLowerCase();
      const email = clean(employee.email1 || employee.email).toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [employees.data, search]);
  const searchedEmail = clean(searchedEmployee?.email1 || searchedEmployee?.email);
  const hasEmployeeMatch = !search.trim() || Boolean(searchedEmail);
  const leaveRequest = useMemo(() => ({
    from: `${range.fromDate} ${range.fromTime || "00:00"}:00`,
    to: `${range.toDate} ${range.toTime || "23:59"}:59`,
    dateField: DATE_FIELDS[dateMode],
    email: searchedEmail || undefined,
  }), [range, dateMode, searchedEmail]);
  const leaveQueryKey = [...ADMIN_LEAVE_QUERY_KEY, leaveRequest];
  const leaves = useQuery({
    queryKey: leaveQueryKey,
    queryFn: () => getAllLeaves(leaveRequest),
    enabled: isAdmin && !employees.isPending && hasEmployeeMatch,
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateLeaveStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: leaveQueryKey });
      const previous = queryClient.getQueryData(leaveQueryKey);
      queryClient.setQueryData(leaveQueryKey, (current) => current ? { ...current, records: current.records.map((record) => String(record.id) === String(id) ? { ...record, status, date_modified: new Date().toISOString() } : record) } : current);
      return { previous };
    },
    onError: (_error, _variables, context) => context?.previous && queryClient.setQueryData(leaveQueryKey, context.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ADMIN_LEAVE_QUERY_KEY }),
  });

  const employeeMap = useMemo(() => new Map((employees.data || []).map((employee) => [employee.id, employee])), [employees.data]);
  const rangeRecords = useMemo(() => {
    const records = leaves.data?.records || [];
    return dateMode === "approved"
      ? records.filter((record) => statusOf(record) === "Accepted")
      : records;
  }, [leaves.data, dateMode]);
  const counts = useMemo(() => ({
    All: rangeRecords.length,
    ...Object.fromEntries(["Applied", "Accepted", "Rejected"].map((status) => [status, rangeRecords.filter((record) => statusOf(record) === status).length])),
  }), [rangeRecords]);
  const visible = useMemo(() => rangeRecords.filter((record) =>
    statusFilter === "All" || statusOf(record) === statusFilter
  ), [rangeRecords, statusFilter]);

  if (!isAdmin) return null;
  const loading = employees.isPending || (hasEmployeeMatch && leaves.isPending);
  const failed = leaves.isError || employees.isError;
  const refresh = () => { leaves.refetch(); employees.refetch(); };

  return (
    <section className="mx-auto min-h-full max-w-[1600px] space-y-5 pb-8 text-foreground">
      <header className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/70 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">People operations</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Leave approvals</h1><p className="mt-1 max-w-xl text-sm text-muted-foreground">Review pending requests, then drag them into Approved or Rejected.</p></div>
        <div className="flex items-center gap-2 self-start xl:self-auto">
          <button type="button" onClick={() => navigate("/my-leaves")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><Palmtree size={17} />My leave &amp; apply</button>
          <button type="button" onClick={refresh} disabled={leaves.isFetching || employees.isFetching} className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:bg-muted disabled:opacity-50" aria-label="Refresh leave requests"><RefreshCw size={17} className={leaves.isFetching ? "animate-spin" : ""} /></button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map(({ id, label }) => <button key={id} type="button" onClick={() => setStatusFilter(id)} aria-pressed={statusFilter === id} className={`flex items-center gap-4 rounded-2xl p-4 text-left ring-1 transition active:scale-[0.99] ${statusFilter === id ? "bg-primary text-primary-foreground ring-primary shadow-lg shadow-primary/15" : "bg-card ring-border/70 hover:-translate-y-0.5 hover:shadow-md"}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${statusFilter === id ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"}`}><SummaryIcon status={id} /></span><span><span className="block text-2xl font-semibold tabular-nums">{loading ? "—" : counts[id]}</span><span className={`block text-xs ${statusFilter === id ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{label}</span></span></button>)}
      </div>

      <AdminLeaveFilters dateMode={dateMode} onDateModeChange={setDateMode} range={range} defaultRange={defaultRange} onRangeChange={setRange} search={search} onSearchChange={setSearch} />
      {mutation.isError && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{mutation.error.message}</p>}

      {loading ? <div className="grid min-h-72 place-items-center rounded-2xl bg-card ring-1 ring-border"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" />Loading leave requests…</p></div> : failed ? <div role="alert" className="rounded-2xl bg-card p-10 text-center ring-1 ring-border"><p className="text-sm text-destructive">Could not load leave requests.</p><button type="button" onClick={refresh} className="mt-3 text-sm font-semibold text-primary">Try again</button></div> : !hasEmployeeMatch ? <div className="grid min-h-72 place-items-center rounded-2xl bg-card ring-1 ring-border"><p className="text-sm text-muted-foreground">No employee with that name or email was found.</p></div> : <LeaveKanban records={visible} employeeMap={employeeMap} mutation={mutation} onOpen={setSelectedRequest} />}

      <LeaveDetailPanel record={selectedRequest} employeeMap={employeeMap} mutation={mutation} onClose={closeDetails} />
    </section>
  );
}
