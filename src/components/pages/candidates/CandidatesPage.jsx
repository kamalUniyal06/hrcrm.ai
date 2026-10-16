import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import he from "he";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Ellipsis,
  Eye,
  Link2,
  ListFilter,
  Loader2,
  PencilLine,
  RefreshCw,
  Search,
  SquareKanban,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import Skeleton from "react-loading-skeleton";
import toast from "react-hot-toast";
import { selectIsAdmin } from "../../../utils/pageAccess";
import ScheduleInterviewDialog from "./ScheduleInterviewDialog";
import CandidateDetails from "./CandidateDetails";
import CandidateAvatar from "./CandidateAvatar";
import CandidatePanel, { Pill } from "./CandidatePanel";
import { DateRangeFilter } from "../../DateRangeFilter";
import RecruitmentPanel from "../recruitment/RecruitmentPanel";
import InterviewActionDialog from "../interviews/InterviewActionDialog";
import { AdminInterviews } from "../Interview";
import StatTile from "../../employement/components/home/StatTile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { hasOutcome, interviewDate, uniqueInterviews } from "../interviews/interviewUtils";
import { pageGutter } from "../../employement/components/home/homeUi";
import {
  appliedDate,
  pageWindow,
  positionTone,
  profileCompleteness,
  workflowTone,
} from "./candidateView";
import {
  candidateName,
  fetchAllRecords,
  fetchCandidatePage,
  fetchShortlistSource,
  shortlistedCandidatesKey,
  updateCandidateRecord,
  workflowFields,
  workflowModules,
  workflowUpdate,
  workflowValue,
} from "./candidatesApi";

const kinds = Object.keys(workflowModules);
const VIEWS = ["all", "shortlisted", "interviews"];
const SHORTLIST_PAGE_SIZE = 20;
const XL_QUERY = "(min-width: 1280px)";
const tint = (color, amount = 12) => `color-mix(in oklab, ${color} ${amount}%, transparent)`;

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0");
  return { fromDate: `${year}-${month}-01`, fromTime: "00:00", toDate: `${year}-${month}-${lastDay}`, toTime: "23:59" };
}

function SortHeader({ label, sortKey, sort, onSort, className = "" }) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" aria-sort={active ? (sort.direction === 1 ? "ascending" : "descending") : "none"} className={`px-4 py-3 font-medium ${className}`}>
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {active && (sort.direction === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );
}

function RowSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <tr key={index} className="border-b border-border">
      <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton circle width={36} height={36} /><div><Skeleton width={120} /><Skeleton width={150} height={10} /></div></div></td>
      <td className="px-4 py-3"><Skeleton width={130} /></td>
      <td className="px-4 py-3"><Skeleton width={84} height={24} borderRadius={999} /></td>
      <td className="px-4 py-3"><Skeleton width={84} height={24} borderRadius={999} /></td>
      <td className="px-4 py-3"><Skeleton width={90} /></td>
      <td className="px-4 py-3"><Skeleton width={84} /></td>
      <td />
    </tr>
  ));
}

export default function CandidatesPage() {
  const isAdmin = useSelector(selectIsAdmin);
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.includes(params.get("view")) ? params.get("view") : "all";
  const selectedId = view === "interviews" ? null : params.get("candidate");
  // The interview board opens profiles in a drawer so the board keeps its full width.
  const interviewProfileId = view === "interviews" ? params.get("candidate") : null;
  const shortlistedOnly = view === "shortlisted";

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ stage: "", phase: "", status: "" });
  const [defaultRange] = useState(currentMonthRange);
  const [dateRange, setDateRange] = useState(defaultRange);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "date_entered", direction: -1 });
  const [scheduling, setScheduling] = useState(null);
  const [interviewAction, setInterviewAction] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const panelDismissed = useRef(false);
  const profileOpener = useRef(null);
  const profileDrawer = useRef(null);

  const updateParams = useCallback((changes, options = {}) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      return next;
    }, options);
  }, [setParams]);

  const request = {
    page,
    orderBy: sort.key === "name" ? "first_name" : workflowFields[sort.key] || sort.key,
    orderDir: sort.direction === 1 ? "ASC" : "DESC",
    dateRange,
  };
  const directoryKey = ["candidates", "list", "page", "assigned-workflow", request];
  const directory = useQuery({
    queryKey: directoryKey,
    queryFn: () => fetchCandidatePage(request),
    placeholderData: keepPreviousData,
  });
  const shortlist = useQuery({
    queryKey: [...shortlistedCandidatesKey, { dateRange }],
    queryFn: () => fetchShortlistSource({ dateRange }),
  });
  const interviews = useQuery({ queryKey: ["interviews"], queryFn: () => fetchAllRecords("hrc_interviews") });
  const lookupResults = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: ["candidate-workflow", kind],
      queryFn: async () => (await fetchAllRecords(workflowModules[kind])).filter((item) => item.id && item.name).sort((a, b) => a.name.localeCompare(b.name)),
      staleTime: 300000,
    })),
  });
  const lookups = Object.fromEntries(kinds.map((kind, index) => [kind, lookupResults[index]]));

  const source = shortlistedOnly ? shortlist : directory;
  const records = useMemo(
    () => (shortlistedOnly ? (Array.isArray(shortlist.data) ? shortlist.data : []) : directory.data?.records || []),
    [shortlistedOnly, shortlist.data, directory.data],
  );

  const value = (record, key) =>
    key === "name" ? candidateName(record) : key === "date_entered" ? record.date_entered || "" : workflowValue(record, key, lookups[key].data);
  const searchTerm = search.trim().toLowerCase();
  const visible = records.filter((record) =>
    [candidateName(record), record.email1, record.phone_mobile, record.current_designation, record.department].some((item) => String(item || "").toLowerCase().includes(searchTerm)) &&
    kinds.every((kind) => !filters[kind] || value(record, kind) === filters[kind]),
  );
  if (shortlistedOnly) {
    visible.sort((left, right) => sort.key === "date_entered"
      ? ((Date.parse(left.date_entered_uni_format || left.date_entered) || 0) - (Date.parse(right.date_entered_uni_format || right.date_entered) || 0)) * sort.direction
      : String(value(left, sort.key)).localeCompare(String(value(right, sort.key)), undefined, { numeric: true, sensitivity: "base" }) * sort.direction);
  }
  const pageSize = shortlistedOnly ? SHORTLIST_PAGE_SIZE : directory.data?.perPage ?? 20;
  const total = shortlistedOnly ? visible.length : directory.data?.total ?? 0;
  const pages = shortlistedOnly ? Math.max(1, Math.ceil(visible.length / pageSize)) : directory.data?.pages ?? 1;
  const currentPage = shortlistedOnly ? Math.min(page, pages) : directory.data?.page ?? page;
  const rows = shortlistedOnly ? visible.slice((currentPage - 1) * pageSize, currentPage * pageSize) : visible;
  const workflowFilterActive = kinds.some((kind) => filters[kind]);
  const filterActive = Boolean(searchTerm || workflowFilterActive);

  const openInterviews = useMemo(() => uniqueInterviews(interviews.data || []).filter((record) => !hasOutcome(record)), [interviews.data]);
  const upcomingCount = openInterviews.filter((record) => (interviewDate(record.interview_datetime)?.getTime() ?? 0) >= Date.now()).length;
  const unscheduledCount = openInterviews.filter((record) => !interviewDate(record.interview_datetime)).length;

  const selectCandidate = useCallback((id, options) => updateParams({ candidate: id }, options), [updateParams]);
  const closePanel = useCallback(() => {
    panelDismissed.current = true;
    updateParams({ candidate: null });
  }, [updateParams]);

  const openInterviewProfile = useCallback((id) => {
    profileOpener.current = document.activeElement;
    updateParams({ candidate: id });
  }, [updateParams]);
  const closeInterviewProfile = useCallback(() => {
    updateParams({ candidate: null });
    requestAnimationFrame(() => profileOpener.current?.focus?.());
  }, [updateParams]);

  useEffect(() => {
    if (interviewProfileId) profileDrawer.current?.focus();
  }, [interviewProfileId]);

  // Wide screens open the first candidate so the profile panel is never empty.
  useEffect(() => {
    if (view === "interviews" || selectedId || panelDismissed.current || !rows[0]?.id) return;
    if (window.matchMedia?.(XL_QUERY).matches) selectCandidate(rows[0].id, { replace: true });
  }, [rows, selectedId, selectCandidate, view]);

  useEffect(() => {
    if (source.isSuccess && !source.isPlaceholderData && page > pages) setPage(pages);
  }, [source.isSuccess, source.isPlaceholderData, page, pages]);

  function switchView(next) {
    setPage(1);
    setSearch("");
    setFilters({ stage: "", phase: "", status: "" });
    setSort(next === "shortlisted" ? { key: "name", direction: 1 } : { key: "date_entered", direction: -1 });
    panelDismissed.current = false;
    updateParams({ view: next === "all" ? null : next, candidate: null });
  }

  function onSort(key) {
    setSort((previous) => ({ key, direction: previous.key === key ? -previous.direction : 1 }));
    setPage(1);
  }

  function applyDateRange(range) {
    if (!range.fromDate || !range.toDate || `${range.fromDate} ${range.fromTime || "00:00"}` > `${range.toDate} ${range.toTime || "23:59"}`) {
      toast.error("Choose a valid date range with the start before the end.");
      return;
    }
    setDateRange(range);
    setPage(1);
  }

  function refresh() {
    void source.refetch();
    void interviews.refetch();
    lookupResults.forEach((query) => void query.refetch());
  }

  async function changeWorkflow(record, kind, name) {
    if (busyId) return;
    setBusyId(record.id);
    try {
      const data = workflowUpdate(record, kind, name, lookups[kind].data);
      await updateCandidateRecord(record.id, data);
      client.setQueryData(directoryKey, (previous) => previous && {
        ...previous,
        records: previous.records.map((item) => (item.id === record.id ? { ...item, ...data } : item)),
      });
      void client.invalidateQueries({ queryKey: ["candidates"] });
      void client.invalidateQueries({ queryKey: ["candidate-profile"] });
      toast.success(`${candidateName(record)} moved to ${name}`);
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusyId(null);
    }
  }

  const actions = {
    changeWorkflow,
    schedule: (record) => setScheduling(record),
    interview: (selection) => setInterviewAction(selection),
    assessment: (candidate, interview = null) => setAssessment({ candidate, interview }),
    editProfile: (record) => setEditingId(record.id),
  };

  const tabs = [
    ["all", "All candidates", Users, directory.data?.total],
    ["shortlisted", "Shortlisted", BookmarkCheck, shortlist.data?.length],
    ["interviews", "Interviews", SquareKanban, openInterviews.length],
  ];
  const selectedRecord = records.find((record) => record.id === selectedId);
  const filterOptions = (kind) => [...new Set([
    ...records.map((record) => value(record, kind)),
    ...(lookups[kind].data || []).map((option) => he.decode(String(option.name))),
  ])].filter((name) => name.trim() && name.trim().toLowerCase() !== "unassigned").sort();

  return (
    <main className={`min-h-full w-full space-y-5 bg-background ${pageGutter}`}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Candidates</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage candidates, interviews and decisions in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button type="button" onClick={() => setAssessment({ candidate: null })} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted">
              <ClipboardList size={14} />Assessments
            </button>
          )}
          <button type="button" onClick={refresh} disabled={source.isFetching} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50">
            <RefreshCw size={14} className={source.isFetching || interviews.isFetching ? "animate-spin" : ""} />Refresh
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Recruitment summary">
        <StatTile icon={Users} label="Candidates this period" value={directory.data?.total ?? "—"} hint="Assigned to the pipeline" loading={directory.isPending} onClick={() => switchView("all")} />
        <StatTile icon={UserRoundCheck} label="Shortlisted" value={shortlist.data?.length ?? "—"} hint="Ready for interviews" color="var(--attendance-present)" loading={shortlist.isPending} onClick={() => switchView("shortlisted")} />
        <StatTile icon={CalendarClock} label="Upcoming interviews" value={upcomingCount} hint="Scheduled ahead" color="var(--attendance-leave)" loading={interviews.isPending} onClick={() => switchView("interviews")} />
        <StatTile icon={CalendarPlus} label="Awaiting a date" value={unscheduledCount} hint="Rounds to schedule" color="var(--attendance-late)" loading={interviews.isPending} onClick={() => switchView("interviews")} />
      </section>

      <nav aria-label="Candidate views" className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1 shadow-sm sm:w-fit">
        {tabs.map(([key, label, Icon, count]) => (
          <button
            key={key}
            type="button"
            aria-current={view === key ? "page" : undefined}
            onClick={() => switchView(key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${view === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {createElement(Icon, { size: 14 })}
            {label}
            {count !== undefined && <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${view === key ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>}
          </button>
        ))}
      </nav>

      {view === "interviews" ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <AdminInterviews embedded onOpenCandidate={openInterviewProfile} />
          {interviewProfileId && (
            <div
              className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
              onClick={(event) => event.target === event.currentTarget && closeInterviewProfile()}
            >
              <div ref={profileDrawer} tabIndex={-1} className="h-full w-full max-w-md shadow-2xl outline-none motion-safe:animate-in motion-safe:slide-in-from-right-8 motion-safe:duration-200">
                <CandidatePanel
                  key={interviewProfileId}
                  id={interviewProfileId}
                  listRecord={client.getQueryData(["candidates", "list"])?.find((record) => String(record.id) === interviewProfileId)}
                  lookups={lookups}
                  interviews={interviews.data}
                  interviewsLoading={interviews.isPending}
                  isAdmin={isAdmin}
                  actions={actions}
                  initialTab="interviews"
                  onClose={closeInterviewProfile}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 items-start gap-4 ${selectedId ? "xl:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
          <section className="min-w-0 rounded-2xl border border-border bg-card shadow-sm" aria-label="Candidate list" aria-busy={source.isFetching}>
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
              <h2 className="mr-auto text-base font-semibold text-foreground">{shortlistedOnly ? "Shortlisted Candidates" : "All Candidates"}</h2>
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/40 sm:max-w-64">
                <Search size={15} className="shrink-0" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); if (shortlistedOnly) setPage(1); }}
                  placeholder={shortlistedOnly ? "Search shortlist…" : "Search this page…"}
                  aria-label={shortlistedOnly ? "Search shortlisted candidates" : "Search candidates on this page"}
                  className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition hover:bg-muted ${workflowFilterActive ? "border-primary/40 text-primary" : "border-border text-foreground"}`}>
                    <ListFilter size={14} />Filter
                    {workflowFilterActive && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{kinds.filter((kind) => filters[kind]).length}</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-3 p-4">
                  <p className="text-sm font-semibold text-foreground">Filter candidates</p>
                  {kinds.map((kind) => (
                    <label key={kind} className="block text-xs font-medium capitalize text-muted-foreground">
                      {kind}
                      <select
                        value={filters[kind]}
                        onChange={(event) => { setFilters((previous) => ({ ...previous, [kind]: event.target.value })); setPage(1); }}
                        className="mt-1 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">All {kind === "status" ? "statuses" : `${kind}s`}</option>
                        {filterOptions(kind).map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </label>
                  ))}
                  {!shortlistedOnly && <p className="text-[11px] text-muted-foreground">Filters and search apply to the current page.</p>}
                  {workflowFilterActive && (
                    <button type="button" onClick={() => { setFilters({ stage: "", phase: "", status: "" }); setPage(1); }} className="text-xs font-semibold text-primary hover:underline">Clear filters</button>
                  )}
                </PopoverContent>
              </Popover>
              <DateRangeFilter {...dateRange} filterActive onApply={applyDateRange} onReset={() => applyDateRange(defaultRange)} />
            </div>

            {source.isError && (
              <div role="alert" className="m-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {source.error.message} <button className="ml-2 font-semibold underline" onClick={() => source.refetch()}>Retry</button>
              </div>
            )}
            {lookupResults.some((query) => query.isError) && (
              <div role="alert" className="m-4 rounded-xl bg-[var(--leave-yellow-soft)] p-3 text-xs text-foreground">
                Some workflow names could not be loaded. <button onClick={refresh} className="font-semibold underline">Retry</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border text-[11px] text-muted-foreground">
                  <tr>
                    <SortHeader label="Candidate" sortKey="name" sort={sort} onSort={onSort} className="pl-5" />
                    <th scope="col" className="px-4 py-3 font-medium">Position</th>
                    <SortHeader label="Stage" sortKey="stage" sort={sort} onSort={onSort} />
                    <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                    <th scope="col" className="px-4 py-3 font-medium">Profile</th>
                    <SortHeader label="Applied" sortKey="date_entered" sort={sort} onSort={onSort} />
                    <th scope="col" className="w-12 px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {source.isPending ? <RowSkeleton /> : rows.map((record) => {
                    const selected = record.id === selectedId;
                    const designation = he.decode(String(record.current_designation || record.title || ""));
                    const department = he.decode(String(record.department || ""));
                    const tone = positionTone(department || designation);
                    const stage = value(record, "stage");
                    const status = value(record, "status");
                    const score = profileCompleteness(record);
                    const rejected = status.toLowerCase() === "rejected";
                    return (
                      <tr
                        key={record.id}
                        onClick={() => { panelDismissed.current = false; selectCandidate(record.id); }}
                        className={`group cursor-pointer border-b border-border transition last:border-0 ${selected ? "bg-primary/[0.06]" : "hover:bg-muted/50"}`}
                      >
                        <td className={`py-3 pl-5 pr-4 ${selected ? "shadow-[inset_3px_0_0_var(--primary)]" : ""}`}>
                          <button type="button" onClick={(event) => { event.stopPropagation(); panelDismissed.current = false; selectCandidate(record.id); }} className="flex min-w-0 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <CandidateAvatar record={record} className="h-9 w-9 rounded-full bg-primary/10 text-sm font-semibold text-primary" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">{candidateName(record)}</span>
                              <span className="block max-w-[200px] truncate text-[11px] text-muted-foreground">{record.email1 || "No email"}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ color: tone, backgroundColor: tint(tone) }}><BriefcaseBusiness size={14} /></span>
                            <span className="min-w-0">
                              <span className="block max-w-[180px] truncate text-xs font-semibold text-foreground">{designation || "—"}</span>
                              {department && <span className="block max-w-[180px] truncate text-[11px] font-medium" style={{ color: tone }}>{department}</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Pill color={workflowTone(stage)}>{stage}</Pill></td>
                        <td className="px-4 py-3"><Pill color={workflowTone(status)}>{status}</Pill></td>
                        <td className="px-4 py-3">
                          <div className="w-24">
                            <span className="text-xs font-semibold tabular-nums text-foreground">{score}%</span>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--employee-track)]">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{appliedDate(record)}</td>
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" aria-label={`Actions for ${candidateName(record)}`} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                                {busyId === record.id ? <Loader2 size={16} className="animate-spin" /> : <Ellipsis size={16} />}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={() => { panelDismissed.current = false; selectCandidate(record.id); }}><Eye />View details</DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={stage.toLowerCase() === "shortlisted" || !lookups.stage.isSuccess || Boolean(busyId)}
                                onSelect={() => changeWorkflow(record, "stage", "Shortlisted").catch(() => {})}
                              >
                                <BookmarkCheck />{stage.toLowerCase() === "shortlisted" ? "Already shortlisted" : "Shortlist"}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={rejected || !lookups.status.isSuccess} onSelect={() => setScheduling(record)}><CalendarPlus />Schedule interview</DropdownMenuItem>
                              {isAdmin && <DropdownMenuItem onSelect={() => setAssessment({ candidate: record })}><Link2 />View assessment</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setEditingId(record.id)}><PencilLine />Edit full profile</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!source.isPending && !rows.length && (
                <div className="px-6 py-16 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users size={26} /></span>
                  <h3 className="mt-4 font-semibold text-foreground">
                    {source.isError ? "Candidates unavailable" : filterActive ? "No matching candidates" : shortlistedOnly ? "Your shortlist starts here" : "No candidates in this period"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filterActive ? "Try a different search or clear your filters." : shortlistedOnly ? "Shortlist candidates from All candidates to see them here." : "Try a wider date range. Candidates appear once their stage, phase and status are assigned."}
                  </p>
                  {filterActive && (
                    <button type="button" onClick={() => { setSearch(""); setFilters({ stage: "", phase: "", status: "" }); setPage(1); }} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                      <X size={13} />Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <p>
                {!shortlistedOnly && filterActive
                  ? `${rows.length} ${rows.length === 1 ? "match" : "matches"} on this page · ${total} total`
                  : rows.length
                    ? `Showing ${(currentPage - 1) * pageSize + 1} to ${(currentPage - 1) * pageSize + rows.length} of ${total.toLocaleString()} candidates`
                    : `0 of ${total} candidates`}
              </p>
              <nav aria-label="Pagination" className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={source.isFetching || currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition hover:bg-muted disabled:opacity-30"><ChevronLeft size={15} /></button>
                {pageWindow(currentPage, pages).map((item, index) => item === "…" ? (
                  <span key={`gap-${index}`} className="px-1">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    aria-current={item === currentPage ? "page" : undefined}
                    disabled={source.isFetching && item !== currentPage}
                    onClick={() => setPage(item)}
                    className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold tabular-nums transition ${item === currentPage ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"}`}
                  >
                    {item}
                  </button>
                ))}
                <button type="button" aria-label="Next page" disabled={source.isFetching || currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition hover:bg-muted disabled:opacity-30"><ChevronRight size={15} /></button>
              </nav>
            </footer>
          </section>

          {selectedId && (
            <div
              className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-[1px] xl:sticky xl:inset-auto xl:top-4 xl:z-auto xl:block xl:h-[calc(100dvh-2rem)] xl:bg-transparent xl:backdrop-blur-none"
              onClick={(event) => event.target === event.currentTarget && closePanel()}
            >
              <div className="h-full w-full max-w-md shadow-2xl xl:max-w-none xl:shadow-none">
                <CandidatePanel
                  key={selectedId}
                  id={selectedId}
                  listRecord={selectedRecord}
                  lookups={lookups}
                  interviews={interviews.data}
                  interviewsLoading={interviews.isPending}
                  isAdmin={isAdmin}
                  actions={actions}
                  onClose={closePanel}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {interviewAction && <InterviewActionDialog {...interviewAction} statusOptions={lookups.status.data} onClose={() => setInterviewAction(null)} />}
      {scheduling && <ScheduleInterviewDialog record={scheduling} lookups={lookups} onClose={() => setScheduling(null)} />}
      {isAdmin && assessment && (
        <RecruitmentPanel
          key={assessment.candidate?.id || assessment.interview?.id || "select-candidate"}
          initialCandidate={assessment.candidate}
          interview={assessment.interview}
          onClose={() => setAssessment(null)}
        />
      )}
      {editingId && <CandidateDetails key={editingId} id={editingId} lookups={lookups} onClose={() => setEditingId(null)} />}
    </main>
  );
}
