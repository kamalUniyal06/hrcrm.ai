import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, CalendarClock, ChevronRight, CircleAlert, GripVertical, LayoutDashboard, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { fetchAllRecords } from "./candidates/candidatesApi";
import InterviewActionDialog from "./interviews/InterviewActionDialog";
import InterviewBoard, { InterviewBoardSkeleton } from "./interviews/InterviewBoard";
import InterviewStats from "./interviews/InterviewStats";
import RecruitmentPanel from "./recruitment/RecruitmentPanel";
import { clean, groupInterviews, hasOutcome, interviewDate, isFirstRound } from "./interviews/interviewUtils";

export default function Interview() {
  const [search, setSearch] = useState("");
  const [round, setRound] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const interviews = useQuery({ queryKey: ["interviews"], queryFn: () => fetchAllRecords("hrc_interviews") });
  const candidates = useQuery({ queryKey: ["candidates", "list"], queryFn: () => fetchAllRecords("hrc_candidates") });
  const statuses = useQuery({ queryKey: ["candidate-workflow", "status"], queryFn: () => fetchAllRecords("hrc_status"), staleTime: 300000 });
  const jobs = useQuery({ queryKey: ["interview-jobs"], queryFn: () => fetchAllRecords("hrc_job_postings"), staleTime: 300000 });
  const jobMap = useMemo(() => new Map((jobs.data || []).map((job) => [String(job.id), job.name || job.title])), [jobs.data]);
  const groups = useMemo(() => groupInterviews(interviews.data || []), [interviews.data]);
  const all = groups.flatMap((group) => group.records);
  const assessmentInterview = assessment && all.find((record) => String(record.id) === String(assessment.interview?.id));
  const visibleGroups = groups.map((group, index) => ({
    ...group,
    index,
    records: group.records.filter((record) => {
      const completed = hasOutcome(record);
      const scheduled = Boolean(interviewDate(record.interview_datetime));
      return (!status || (status === "scheduled" ? scheduled && !completed : status === "unscheduled" ? !scheduled && !completed : completed)) &&
        [record.name, record.email, record.job_id, jobMap.get(String(record.job_id)), group.name].some((value) => clean(value).toLowerCase().includes(search.trim().toLowerCase()));
    }),
  })).filter((group) => !round || group.key === round);
  const visibleCount = visibleGroups.reduce((count, group) => count + group.records.length, 0);
  const scheduledCount = all.filter((record) => interviewDate(record.interview_datetime) && !hasOutcome(record)).length;
  const unscheduledCount = all.filter((record) => !interviewDate(record.interview_datetime) && !hasOutcome(record)).length;
  const filtered = Boolean(search || round || status);
  const refreshing = [interviews, candidates, statuses, jobs].some((query) => query.isFetching);

  function refresh() { [interviews, candidates, statuses, jobs].forEach((query) => { void query.refetch(); }); }
  function clearFilters() { setSearch(""); setRound(""); setStatus(""); }
  function openAssessment(candidate, interview = null) {
    if (!isFirstRound(interview)) return;
    setAssessment({ candidate, interview });
    requestAnimationFrame(() => document.getElementById("assessment-invitations")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
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

  return <section className="min-w-0 flex-1 rounded-2xl bg-card/40 px-3 py-5 text-foreground sm:px-5 sm:py-7 xl:px-7 2xl:px-9" aria-labelledby="interviews-heading">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-5">
      <div>
        <p className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold tracking-[.15em] text-muted-foreground uppercase"><BriefcaseBusiness size={13} aria-hidden="true" />Recruitment workspace</p>
        <h1 id="interviews-heading" tabIndex={-1} className="font-serif text-[32px] leading-tight tracking-[-.045em] outline-none sm:text-4xl">Interviews <span className="text-muted-foreground">& assessments</span></h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">Plan interviews, record decisions, and share candidate test links.</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
        <Button asChild variant="outline" className="h-10 flex-1 gap-2 bg-card px-4 text-xs sm:flex-none"><Link to="/shortlisted">View shortlist <ChevronRight size={15} aria-hidden="true" /></Link></Button>
      </div>
    </header>

    <InterviewStats total={all.length} scheduled={scheduledCount} unscheduled={unscheduledCount} rounds={groups.length} loading={interviews.isPending || (interviews.isError && !interviews.data)} />
    {assessment && <RecruitmentPanel key={assessment.candidate?.id || assessment.interview?.id || "select-candidate"} candidates={candidates.data || []} initialCandidate={assessment.candidate} interview={assessmentInterview} onClose={() => setAssessment(null)} />}

    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5"><LayoutDashboard size={18} strokeWidth={1.7} className="text-primary" aria-hidden="true" /><h2 className="text-base font-semibold tracking-tight">Round by round</h2><span className="ml-1 hidden border-l border-border pl-3 text-[10px] text-muted-foreground sm:inline">Interview board</span></div>
      <p className="text-right text-[11px] text-muted-foreground tabular-nums" role="status" aria-live="polite">{interviews.isPending ? "Loading your pipeline…" : `${visibleCount} ${visibleCount === 1 ? "interview" : "interviews"}${filtered ? ` of ${all.length}` : ` across ${groups.length} ${groups.length === 1 ? "round" : "rounds"}`}`}</p>
    </div>

    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <label className="order-0 flex min-w-0 flex-[1_1_calc(100%-50px)] items-center gap-2.5 rounded-lg border border-border bg-card pl-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/50 sm:flex-[1_1_240px] xl:max-w-md"><Search size={16} className="shrink-0" aria-hidden="true" /><input type="search" aria-label="Search interviews" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email or job…" className="h-10 w-full min-w-0 bg-transparent pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground" /></label>
      <div className="order-2 flex w-full items-center gap-2 sm:order-0 sm:ml-auto sm:w-auto">
        <SlidersHorizontal size={15} className="mr-1 hidden shrink-0 text-muted-foreground xl:block" aria-hidden="true" />
        <select className="h-10 w-1/2 min-w-0 rounded-lg border border-border bg-card px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-auto sm:min-w-30 sm:max-w-52" aria-label="Filter interviews by round" value={round} onChange={(event) => setRound(event.target.value)}><option value="">All rounds</option>{groups.map((group) => <option value={group.key} key={group.key}>{group.name}</option>)}</select>
        <select className="h-10 w-1/2 min-w-0 rounded-lg border border-border bg-card px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-auto sm:min-w-32" aria-label="Filter interview status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="unscheduled">To schedule</option><option value="completed">Failed</option></select>
      </div>
      <Button onClick={refresh} disabled={refreshing} variant="outline" className="order-1 size-10 gap-2 bg-card p-0 text-xs sm:order-0 xl:w-auto xl:px-3" aria-label={refreshing ? "Refreshing interviews" : "Refresh interviews"}><RefreshCw size={15} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" /><span className="hidden xl:inline">Refresh</span></Button>
      {filtered && <Button onClick={clearFilters} variant="ghost" className="order-3 h-9 gap-1 text-xs text-muted-foreground sm:order-0"><X size={14} aria-hidden="true" />Clear filters</Button>}
    </div>

    {(candidates.isError || statuses.isError) && <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground"><CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Candidate eligibility could not be loaded. Refresh to enable scheduling and test links. <button onClick={refresh} className="cursor-pointer font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">Retry</button></span></p>}
    {interviews.isError && <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive"><CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{interviews.error.message} <button onClick={refresh} className="cursor-pointer font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">Retry</button></span></p>}
    {interviews.isPending ? <InterviewBoardSkeleton /> : interviews.isError && !interviews.data ? null : !visibleCount ? <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-14 text-center">
      <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><CalendarClock size={30} strokeWidth={1.4} aria-hidden="true" /></span>
      <h2 className="font-serif text-2xl tracking-tight">{filtered ? "No interviews match these filters" : "Your interview pipeline starts here"}</h2>
      <p className="mx-auto mt-3 mb-5 max-w-md text-[13px] leading-relaxed text-muted-foreground">{filtered ? "Try another name, round or status to find your candidates." : "Schedule an interview from your shortlist, or share a candidate test link."}</p>
      {filtered ? <Button onClick={clearFilters} variant="outline" className="h-10 bg-card text-xs">Clear filters</Button> : <Button asChild variant="outline" className="h-10 gap-2 bg-card text-xs"><Link to="/shortlisted">View shortlist <ChevronRight size={15} aria-hidden="true" /></Link></Button>}
    </div> : <InterviewBoard groups={visibleGroups} candidates={candidates.data || []} statusOptions={statuses.data || []} jobMap={jobMap} canSchedule={candidates.isSuccess && statuses.isSuccess} canAssess={candidates.isSuccess} onAction={setSelected} onAssessment={openAssessment} />}

    {!interviews.isPending && (!interviews.isError || interviews.data) && <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] leading-relaxed text-muted-foreground"><span className="inline-flex items-center gap-1.5"><GripVertical size={12} className="shrink-0" aria-hidden="true" />Drag a card's handle to another round to record feedback.</span><span>Completed rounds stay in candidate history.</span></footer>}
    {selected && <InterviewActionDialog {...selected} statusOptions={statuses.data} onClose={closeInterviewAction} />}
  </section>;
}
