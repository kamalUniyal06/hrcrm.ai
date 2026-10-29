import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Clock3, Loader2, Palmtree, RefreshCw, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAllLeaves, updateLeaveStatus } from "../../../api/leaves.api";
import { fetchAllRecords } from "../../../../pages/candidates/candidatesApi";
import AdminLeaveFilters from "./AdminLeaveFilters";
import LeaveDetailPanel from "./LeaveDetailPanel";
import LeaveKanban from "./LeaveKanban";
import ApproveLeaveDialog from "./ApproveLeaveDialog";
import {
  ADMIN_LEAVE_QUERY_KEY,
  LEAVE_STATUSES,
  boardColumns,
  clean,
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
  // Applied-date order per column; SmartGateway does the sorting.
  const [sortDirs, setSortDirs] = useState({ Applied: "DESC", Accepted: "DESC", Rejected: "DESC" });
  const toggleSort = (status) => setSortDirs((current) => ({ ...current, [status]: current[status] === "DESC" ? "ASC" : "DESC" }));
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const closeDetails = useCallback(() => setSelectedRequest(null), []);
  // Approving asks for a reason first; rejecting is saved straight away.
  const [approving, setApproving] = useState(null);

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
  // Approval dates only exist on approved requests, so that mode has no rejected column feed.
  const activeStatuses = LEAVE_STATUSES.filter((status) => !(dateMode === "approved" && status === "Rejected"));
  // One feed per column so each can be sorted on its own. Pending requests ignore the
  // date range so nothing awaiting a decision is hidden; only search narrows them.
  const columnQueries = useQueries({
    queries: LEAVE_STATUSES.map((status) => {
      const request = {
        ...(status === "Applied" ? {} : {
          from: `${range.fromDate} ${range.fromTime || "00:00"}:00`,
          to: `${range.toDate} ${range.toTime || "23:59"}:59`,
          dateField: DATE_FIELDS[dateMode],
        }),
        email: searchedEmail || undefined,
        status,
        orderDir: sortDirs[status],
      };
      return {
        queryKey: [...ADMIN_LEAVE_QUERY_KEY, request],
        queryFn: () => getAllLeaves(request),
        enabled: isAdmin && !employees.isPending && hasEmployeeMatch && activeStatuses.includes(status),
        placeholderData: keepPreviousData,
      };
    }),
  });
  const feeds = Object.fromEntries(LEAVE_STATUSES.map((status, index) => [status, columnQueries[index]]));
  const activeQueries = activeStatuses.map((status) => feeds[status]);
  const mutation = useMutation({
    mutationFn: ({ id, status, details }) => updateLeaveStatus(id, status, details),
    onMutate: async ({ id, status, details }) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_LEAVE_QUERY_KEY });
      const previous = queryClient.getQueriesData({ queryKey: ADMIN_LEAVE_QUERY_KEY });
      const nameOf = (employeeId) => employeeId ? employeeName(employeeMap.get(employeeId) || {}) : "";
      const approval = details ? {
        verdict: details.reason,
        approved_by_id: details.approvedById,
        approved_by_id_name: nameOf(details.approvedById),
        work_handed_over_to_id: details.handoverToId || "",
        work_handed_over_to_id_name: nameOf(details.handoverToId),
        approved_date: new Date().toISOString().slice(0, 10),
      } : {};
      queryClient.setQueriesData({ queryKey: ADMIN_LEAVE_QUERY_KEY }, (current) => current?.records ? { ...current, records: current.records.map((record) => String(record.id) === String(id) ? { ...record, status, ...approval, date_modified: new Date().toISOString(), decidedHere: true } : record) } : current);
      return { previous };
    },
    onError: (_error, _variables, context) => context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ADMIN_LEAVE_QUERY_KEY }),
  });

  const employeeMap = useMemo(() => new Map((employees.data || []).map((employee) => [employee.id, employee])), [employees.data]);
  const appliedData = feeds.Applied.data;
  const acceptedData = feeds.Accepted.data;
  const rejectedData = feeds.Rejected.data;
  const columns = useMemo(() => boardColumns({
    Applied: appliedData?.records,
    Accepted: acceptedData?.records,
    Rejected: dateMode === "approved" ? [] : rejectedData?.records,
  }), [appliedData, acceptedData, rejectedData, dateMode]);
  const counts = {
    All: LEAVE_STATUSES.reduce((total, status) => total + columns[status].length, 0),
    ...Object.fromEntries(LEAVE_STATUSES.map((status) => [status, columns[status].length])),
  };
  const visibleColumns = Object.fromEntries(LEAVE_STATUSES.map((status) => [status, statusFilter === "All" || statusFilter === status ? columns[status] : []]));

  const decide = (record, status) => {
    if (!record) return;
    if (status === "Accepted") {
      mutation.reset();
      setApproving(record);
      return;
    }
    mutation.mutate({ id: record.id, status }, { onSuccess: closeDetails });
  };
  const approve = (details) => mutation.mutate(
    { id: approving.id, status: "Accepted", details },
    { onSuccess: () => { setApproving(null); closeDetails(); } },
  );

  if (!isAdmin) return null;
  const loading = employees.isPending || (hasEmployeeMatch && activeQueries.some((query) => query.isPending));
  const failed = activeQueries.some((query) => query.isError) || employees.isError;
  const fetching = activeQueries.some((query) => query.isFetching);
  const refresh = () => { activeQueries.forEach((query) => query.refetch()); employees.refetch(); };

  return (
    <section className="mx-auto min-h-full max-w-[1600px] space-y-5 pb-8 text-foreground">
      <header className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/70 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">People operations</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Leave approvals</h1><p className="mt-1 max-w-xl text-sm text-muted-foreground">Review pending requests, then drag them into Approved or Rejected.</p></div>
        <div className="flex items-center gap-2 self-start xl:self-auto">
          <button type="button" onClick={() => navigate("/team?tab=balances")} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"><Users size={17} />Team balances</button>
          <button type="button" onClick={() => navigate("/my-leaves")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><Palmtree size={17} />My leave &amp; apply</button>
          <button type="button" onClick={refresh} disabled={fetching || employees.isFetching} className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:bg-muted disabled:opacity-50" aria-label="Refresh leave requests"><RefreshCw size={17} className={fetching ? "animate-spin" : ""} /></button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map(({ id, label }) => <button key={id} type="button" onClick={() => setStatusFilter(id)} aria-pressed={statusFilter === id} className={`flex items-center gap-4 rounded-2xl p-4 text-left ring-1 transition active:scale-[0.99] ${statusFilter === id ? "bg-primary text-primary-foreground ring-primary shadow-lg shadow-primary/15" : "bg-card ring-border/70 hover:-translate-y-0.5 hover:shadow-md"}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${statusFilter === id ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"}`}><SummaryIcon status={id} /></span><span><span className="block text-2xl font-semibold tabular-nums">{loading ? "—" : counts[id]}</span><span className={`block text-xs ${statusFilter === id ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{label}</span></span></button>)}
      </div>

      <AdminLeaveFilters dateMode={dateMode} onDateModeChange={setDateMode} range={range} defaultRange={defaultRange} onRangeChange={setRange} search={search} onSearchChange={setSearch} />
      {mutation.isError && !approving && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{mutation.error.message}</p>}

      {loading ? <div className="grid min-h-72 place-items-center rounded-2xl bg-card ring-1 ring-border"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" />Loading leave requests…</p></div> : failed ? <div role="alert" className="rounded-2xl bg-card p-10 text-center ring-1 ring-border"><p className="text-sm text-destructive">Could not load leave requests.</p><button type="button" onClick={refresh} className="mt-3 text-sm font-semibold text-primary">Try again</button></div> : !hasEmployeeMatch ? <div className="grid min-h-72 place-items-center rounded-2xl bg-card ring-1 ring-border"><p className="text-sm text-muted-foreground">No employee with that name or email was found.</p></div> : <LeaveKanban columns={visibleColumns} sortDirs={sortDirs} onToggleSort={toggleSort} fetching={Object.fromEntries(LEAVE_STATUSES.map((status) => [status, feeds[status].isFetching]))} employeeMap={employeeMap} mutation={mutation} onOpen={setSelectedRequest} onDecide={decide} />}

      <LeaveDetailPanel record={selectedRequest} employeeMap={employeeMap} mutation={mutation} onClose={closeDetails} onDecide={decide} />
      <ApproveLeaveDialog
        key={approving?.id || "closed"}
        record={approving}
        employees={employees.data}
        employeeMap={employeeMap}
        pending={mutation.isPending}
        error={mutation.isError ? mutation.error?.message : ""}
        onCancel={() => setApproving(null)}
        onConfirm={approve}
      />
    </section>
  );
}
