import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectIsAdmin } from "../../utils/pageAccess";
import CandidateInterviewPage from "./interviews/CandidateInterviewPage";
import { Link, Navigate } from "react-router-dom";
import { BriefcaseBusiness, CalendarCheck2, CalendarClock, ChevronRight, CircleAlert, Clock3, GripVertical, Layers3, MousePointerClick, RefreshCw, Search, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { fetchAllRecords } from "./candidates/candidatesApi";
import { findInterviewCandidate, jobPostingTitle } from "../../services/recruitmentUtils";
import { useRecruitment } from "../../context/recruitmentContext";
import InterviewActionDialog from "./interviews/InterviewActionDialog";
import InterviewBoard, { InterviewBoardSkeleton } from "./interviews/InterviewBoard";
import RecruitmentPanel from "./recruitment/RecruitmentPanel";
import { boardState, clean, groupInterviews, isFirstRound, sortForBoard, withPipelineRounds } from "./interviews/interviewUtils";
import { pageGutter } from "../employement/components/home/homeUi";

// Status filters double as the board summary, so counts and filtering never disagree.
const STATUS_FILTERS = [
  ["", "All", Layers3],
  ["due", "Needs a decision", CircleAlert],
  ["upcoming", "Upcoming", CalendarCheck2],
  ["unscheduled", "Needs a date", Clock3],
  ["decided", "Failed", X],
];

export default function Interview() {
  const isAdmin = useSelector(selectIsAdmin);
  // Admins manage interviews inside the Candidates workspace.
  return isAdmin ? <Navigate to="/candidates?view=interviews" replace /> : <CandidateInterviewPage />;
}

export function AdminInterviews({ embedded = false, onOpenCandidate }) {
  const [search, setSearch] = useState("");
  const [round, setRound] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const interviews = useQuery({ queryKey: ["interviews"], queryFn: () => fetchAllRecords("hrc_interviews") });
  const candidates = useQuery({ queryKey: ["candidates", "list"], queryFn: () => fetchAllRecords("hrc_candidates") });
  const statuses = useQuery({ queryKey: ["candidate-workflow", "status"], queryFn: () => fetchAllRecords("hrc_status"), staleTime: 300000 });
  const jobs = useQuery({ queryKey: ["interview-jobs"], queryFn: () => fetchAllRecords("hrc_job_postings"), staleTime: 300000 });
  const recruitment = useRecruitment();
  const client = useQueryClient();
  const jobMap = useMemo(() => new Map((jobs.data || []).map((job) => [String(job.id), jobPostingTitle(job)])), [jobs.data]);
  const groups = useMemo(() => withPipelineRounds(groupInterviews(interviews.data || [])), [interviews.data]);
  const all = groups.flatMap((group) => group.records);
  // Round 1 cards show each candidate's test progress.
  const testReferences = [...new Set(all.filter(isFirstRound).map((record) => String(findInterviewCandidate(record, candidates.data || [])?.id || "").trim()).filter(Boolean))].sort();
  const testStatusKey = ["recruitment", recruitment.owner, "test-statuses"];
  const tests = useQuery({
    queryKey: [...testStatusKey, testReferences],
    enabled: Boolean(recruitment.user && testReferences.length), staleTime: 30000, retry: false,
    queryFn: async ({ signal }) => {
      const statuses = {};
      for (let start = 0; start < testReferences.length; start += 100) {
        const data = await recruitment.request("/invitation-statuses", { params: { external_references: testReferences.slice(start, start + 100).join(",") }, signal });
        Object.assign(statuses, data.statuses);
      }
      return statuses;
    },
  });
  // "Now" is when the data was fetched, so states stay stable between renders and update on refetch.
  const now = interviews.dataUpdatedAt;
  const assessmentInterview = assessment && all.find((record) => String(record.id) === String(assessment.interview?.id));
  const visibleGroups = groups.map((group, index) => ({
    ...group,
    index,
    records: sortForBoard(group.records.filter((record) => (!status || boardState(record, now) === status) &&
      [record.name, record.email, record.job_id, jobMap.get(String(record.job_id)), group.name].some((value) => clean(value).toLowerCase().includes(search.trim().toLowerCase()))), now),
  })).filter((group) => !round || group.key === round);
  const visibleCount = visibleGroups.reduce((count, group) => count + group.records.length, 0);
  const stateCounts = all.reduce((counts, record) => ({ ...counts, [boardState(record, now)]: (counts[boardState(record, now)] || 0) + 1 }), { "": all.length });
  const filtered = Boolean(search || round || status);
  const refreshing = [interviews, candidates, statuses, jobs, tests].some((query) => query.isFetching);

  function refresh() { [interviews, candidates, statuses, jobs].forEach((query) => { void query.refetch(); }); if (recruitment.user && testReferences.length) void tests.refetch(); }
  function clearFilters() { setSearch(""); setRound(""); setStatus(""); }
  function openAssessment(candidate, interview = null) {
    if (!isFirstRound(interview)) return;
    setAssessment({ candidate, interview });
  }
  function closeInterviewAction() {
    const dropped = selected?.targetRound;
    const recordId = selected?.record.id;
    setSelected(null);
    if (dropped) requestAnimationFrame(() => {
      const handle = document.getElementById(`interview-drag-${recordId}`);
      (handle || document.getElementById("interview-round-board") || document.getElementById("interviews-heading"))?.focus();
    });
  }

  return <section className={embedded ? "min-w-0 text-foreground" : cn("min-w-0 flex-1 rounded-2xl bg-card/40 text-foreground", pageGutter)} aria-labelledby="interviews-heading">
    {!embedded && <header className="mb-7 flex flex-wrap items-center justify-between gap-5">
      <div>
        <p className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold tracking-[.15em] text-muted-foreground uppercase"><BriefcaseBusiness size={13} aria-hidden="true" />Recruitment workspace</p>
        <h1 id="interviews-heading" tabIndex={-1} className="font-serif text-[32px] leading-tight tracking-[-.045em] outline-none sm:text-4xl">Interviews <span className="text-muted-foreground">& assessments</span></h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">Plan interviews, record decisions, and share candidate test links.</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
        <Button asChild variant="outline" className="h-10 flex-1 gap-2 bg-card px-4 text-xs sm:flex-none"><Link to="/candidates?view=shortlisted">View shortlist <ChevronRight size={15} aria-hidden="true" /></Link></Button>
      </div>
    </header>}

    {assessment && <RecruitmentPanel key={assessment.candidate?.id || assessment.interview?.id || "select-candidate"} initialCandidate={assessment.candidate} interview={assessmentInterview || assessment.interview} job={(jobs.data || []).find((job) => String(job.id) === String((assessmentInterview || assessment.interview)?.job_id))} onClose={() => { setAssessment(null); void client.invalidateQueries({ queryKey: testStatusKey }); }} />}

    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 id={embedded ? "interviews-heading" : undefined} tabIndex={embedded ? -1 : undefined} className="text-base font-semibold tracking-tight outline-none">Interviews by round</h2>
      <p className="text-[11px] text-muted-foreground tabular-nums" role="status" aria-live="polite">{interviews.isPending ? "Loading your pipeline…" : `${visibleCount} ${visibleCount === 1 ? "interview" : "interviews"}${filtered ? ` of ${all.length}` : ` across ${groups.length} ${groups.length === 1 ? "round" : "rounds"}`}`}</p>
    </div>

    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <div role="group" aria-label="Filter by interview status" className="custom-scrollbar -mx-1 flex w-[calc(100%+0.5rem)] gap-1.5 overflow-x-auto px-1 py-0.5 2xl:w-auto">
        {STATUS_FILTERS.map((filter) => {
          const [value, label, Icon] = filter;
          const active = status === value;
          const count = interviews.isPending ? null : stateCounts[value] || 0;
          return <button key={label} type="button" aria-pressed={active} onClick={() => setStatus(value)} className={cn("inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none", active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted")}>
            <Icon size={14} aria-hidden="true" className={!active && value === "due" && count ? "text-[var(--candidate-attention)]" : undefined} />{label}
            {count !== null && <span className={cn("min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", active ? "bg-primary-foreground/20" : value === "due" && count ? "bg-[var(--candidate-attention-soft)] text-[var(--candidate-attention)]" : "bg-muted text-muted-foreground")}>{count}</span>}
          </button>;
        })}
      </div>
      <label className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5 rounded-lg border border-border bg-card pl-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/50 2xl:ml-auto 2xl:max-w-sm"><Search size={16} className="shrink-0" aria-hidden="true" /><input type="search" aria-label="Search interviews" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email or job…" className="h-10 w-full min-w-0 bg-transparent pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground" /></label>
      <select className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:max-w-52 sm:flex-none sm:min-w-32" aria-label="Filter interviews by round" value={round} onChange={(event) => setRound(event.target.value)}><option value="">All rounds</option>{groups.map((group) => <option value={group.key} key={group.key}>{group.name}</option>)}</select>
      <Button onClick={refresh} disabled={refreshing} variant="outline" className="size-10 bg-card p-0" aria-label={refreshing ? "Refreshing interviews" : "Refresh interviews"} title="Refresh interviews"><RefreshCw size={15} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" /></Button>
      {filtered && <Button onClick={clearFilters} variant="ghost" className="h-10 gap-1 text-xs text-muted-foreground"><X size={14} aria-hidden="true" />Clear filters</Button>}
    </div>

    {(candidates.isError || statuses.isError) && <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground"><CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Candidate eligibility could not be loaded. Refresh to enable scheduling and test links. <button onClick={refresh} className="cursor-pointer font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">Retry</button></span></p>}
    {interviews.isError && <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive"><CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{interviews.error.message} <button onClick={refresh} className="cursor-pointer font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">Retry</button></span></p>}
    {interviews.isPending ? <InterviewBoardSkeleton /> : interviews.isError && !interviews.data ? null : !visibleCount ? <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-14 text-center">
      <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><CalendarClock size={30} strokeWidth={1.4} aria-hidden="true" /></span>
      <h2 className="font-serif text-2xl tracking-tight">{filtered ? "No interviews match these filters" : "Your interview pipeline starts here"}</h2>
      <p className="mx-auto mt-3 mb-5 max-w-md text-[13px] leading-relaxed text-muted-foreground">{filtered ? "Try another name, round or status to find your candidates." : "Schedule an interview from your shortlist, or share a candidate test link."}</p>
      {filtered ? <Button onClick={clearFilters} variant="outline" className="h-10 bg-card text-xs">Clear filters</Button> : <Button asChild variant="outline" className="h-10 gap-2 bg-card text-xs"><Link to="/candidates?view=shortlisted">View shortlist <ChevronRight size={15} aria-hidden="true" /></Link></Button>}
    </div> : <InterviewBoard groups={visibleGroups} filtered={filtered} now={now} onOpen={onOpenCandidate} candidates={candidates.data || []} statusOptions={statuses.data || []} jobMap={jobMap} canSchedule={candidates.isSuccess && statuses.isSuccess} canAssess={candidates.isSuccess} testStatuses={tests.data} onAction={setSelected} onAssessment={openAssessment} />}

    {!interviews.isPending && (!interviews.isError || interviews.data) && <footer className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px] leading-relaxed text-muted-foreground"><span className="inline-flex items-center gap-1.5"><GripVertical size={13} className="shrink-0" aria-hidden="true" />Drag a card's handle to another round to record feedback.</span>{onOpenCandidate ? <span className="inline-flex items-center gap-1.5"><MousePointerClick size={13} className="shrink-0" aria-hidden="true" />Select a card to see the candidate's profile and interview history.</span> : <span>Completed rounds stay in candidate history.</span>}</footer>}
    {selected && <InterviewActionDialog {...selected} statusOptions={statuses.data} onClose={closeInterviewAction} />}
  </section>;
}
