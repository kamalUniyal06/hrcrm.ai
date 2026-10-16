import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Ban, BriefcaseBusiness, CalendarCheck2, CalendarClock, Check, CircleCheckBig, Clock3, ExternalLink, Hourglass, Info, ListTodo, MapPin, RefreshCw, Timer, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCandidateProfile } from "../../../queries/candidate.queries";
import { useSidebarLayout } from "../../../queries/sidebar.queries";
import { sidebarDestination } from "../../../utils/sidebarNavigation";
import { onboardingStyles } from "../profile/onboardingStyles";
import { CandidateChip, CandidatePageHeader, CandidateStats, EmptyState, StepDot } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { groupRounds } from "../candidate/candidateStatus";
import { fetchMyInterviews } from "./candidateInterviews.api";
import { interviewJourney, timeUntil } from "./candidateInterviewData";
import { isFirstRound } from "./interviewUtils";
import { fetchMyTestInvitation } from "./candidateTest.api";
import CandidateTestInvitation from "./CandidateTestInvitation";

// Each state pairs a shared tone with an icon, so status never relies on colour alone.
const statusChips = {
  scheduled: { icon: CalendarCheck2, tone: "progress" },
  passed: { icon: Check, tone: "success" },
  completed: { icon: Check, tone: "neutral" },
  pending: { icon: Hourglass, tone: "neutral" },
  failed: { icon: X, tone: "closed" },
  cancelled: { icon: Ban, tone: "neutral" },
};
const stepState = (round) => ["passed", "completed"].includes(round.status.key) ? "done"
  : ["failed", "cancelled"].includes(round.status.key) ? "closed"
  : round.upNext ? "current" : "upcoming";

const longDate = (date, year = true) => date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", ...(year && { year: "numeric" }) });
const shortDate = (date) => date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const clockTime = (date, zone = false) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", ...(zone && { timeZoneName: "short" }) });
const zoneName = () => new Date().toLocaleTimeString(undefined, { timeZoneName: "short" }).split(" ").at(-1);

// Summary cards jump to the records they count; the target takes focus so screen readers follow.
function jumpTo(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  target.focus({ preventScroll: true });
}

// Re-render every minute so countdowns and "Up next" stay current while the page is open.
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function CandidateInterviewPage() {
  const email = useSelector((state) => state.user.user?.email)?.trim() || "";
  const profile = useCandidateProfile();
  const sidebar = useSidebarLayout();
  const groups = Array.isArray(sidebar.data) ? sidebar.data : sidebar.data?.data || [];
  const uiModuleId = groups.flatMap((group) => group.data || [])
    .find((item) => sidebarDestination(item)?.split(/[?#]/)[0] === "/interviews")?.ui_module_id;
  const candidate = profile.data;
  const interviews = useQuery({
    queryKey: ["interviews", "candidate", email, candidate?.id || "", uiModuleId || ""],
    queryFn: () => fetchMyInterviews({ candidate, email, uiModuleId }),
    enabled: Boolean(candidate?.id && email && !profile.isError && !sidebar.isPending),
    retry: false,
  });
  const loading = profile.isPending || Boolean(candidate?.id && (sidebar.isPending || interviews.isPending));
  const error = !email ? new Error("Your login email is unavailable. Please sign in again.") : profile.error || interviews.error;
  const records = interviews.data || [];
  const firstRound = records.find((record) => isFirstRound({ description: record.round }));
  const hasFirstRound = Boolean(firstRound);
  const testInvitation = useQuery({
    queryKey: ["candidate-test-invitation", email, candidate?.id || ""],
    queryFn: ({ signal }) => fetchMyTestInvitation({ candidate, email, signal }),
    enabled: Boolean(candidate?.id && email && interviews.isSuccess && hasFirstRound),
    retry: false,
    staleTime: 15000,
    refetchInterval: (query) => hasFirstRound && query.state.error?.code !== "HRCRM_CANDIDATE_EMAIL_REQUIRED" ? 60000 : false,
    refetchOnWindowFocus: (query) => query.state.error?.code !== "HRCRM_CANDIDATE_EMAIL_REQUIRED",
  });
  const refreshing = profile.isFetching || sidebar.isFetching || interviews.isFetching || testInvitation.isFetching;
  const now = useNow();
  const journey = interviewJourney(records, now);
  const ready = !error && !loading && Boolean(candidate?.id) && records.length > 0;
  const invitation = testInvitation.data;
  const testDue = invitation?.status === "pending" && invitation.url && Date.parse(invitation.expiresAt) > now;

  function refresh() {
    if (profile.isError || !candidate?.id) void profile.refetch();
    else {
      void interviews.refetch();
      if (hasFirstRound) void testInvitation.refetch();
    }
  }

  const stats = ready ? [
    journey.next
      ? { label: "Next interview", value: shortDate(journey.next.date), hint: clockTime(journey.next.date), icon: CalendarClock, tone: "primary", onClick: () => jumpTo(`round-card-${journey.next.record.id}`) }
      : { label: "Next interview", value: "None yet", hint: "HR will confirm dates", icon: CalendarClock, tone: "neutral", onClick: () => jumpTo("interview-upcoming") },
    testDue
      ? { label: "To do", value: 1, hint: timeUntil(new Date(invitation.expiresAt), now).replace(/^In /, "due in ").replace(/^Today.*/, "due today"), icon: ListTodo, tone: "attention", onClick: () => jumpTo("interview-todo") }
      : { label: "To do", value: 0, hint: "nothing due", icon: ListTodo, tone: "success", onClick: () => jumpTo("interview-todo") },
    { label: "Rounds completed", value: journey.completed, hint: `of ${journey.rounds.length}`, icon: CircleCheckBig, tone: "info", onClick: () => jumpTo("interview-past") },
    { label: "Roles in interviews", value: new Set(records.map((record) => record.jobTitle).filter(Boolean)).size || 1, icon: BriefcaseBusiness, tone: "primary", to: "/job-application" },
  ] : [];

  return (
    <section className={candidateStyles.page} aria-labelledby="my-interviews-heading">
      <CandidatePageHeader
        icon={CalendarClock}
        title="My interviews"
        titleId="my-interviews-heading"
        description="What you need to do, and when each round happens. This page updates as soon as HR changes anything."
      >
        <button type="button" onClick={refresh} disabled={refreshing} className={cn(onboardingStyles.secondary, "w-full sm:w-auto")}>
          <RefreshCw size={15} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
          Refresh
        </button>
      </CandidatePageHeader>

      {ready && <CandidateStats items={stats} label="Interview summary" />}

      {error ? (
        <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          <p>{error.message}</p>
          <button type="button" onClick={refresh} disabled={refreshing} className="mt-3 rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Retry</button>
        </div>
      ) : loading ? (
        <LoadingRounds />
      ) : !candidate?.id ? (
        <EmptyState icon={CalendarClock} title="Complete your profile" description="Save your candidate profile to see your interview details.">
          <Link to="/profile" className={onboardingStyles.primary}>View profile</Link>
        </EmptyState>
      ) : !records.length ? (
        <EmptyState icon={CalendarClock} title="No interviews yet" description="Your interview rounds and schedule will appear here when HR adds them.">
          <Link to="/job-posting" className={onboardingStyles.secondary}>Browse open roles</Link>
        </EmptyState>
      ) : (
        <InterviewOverview journey={journey} busy={interviews.isFetching} testInvitation={testInvitation} testDue={testDue} firstRound={firstRound} now={now} />
      )}
    </section>
  );
}

function InterviewOverview({ journey, busy, testInvitation, testDue, firstRound, now }) {
  const { rounds } = journey;
  const { upcoming, unscheduled, past } = groupRounds(rounds);
  const showJob = new Set(rounds.map((round) => round.record.jobTitle).filter(Boolean)).size > 1;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy={busy}>
      <div className="min-w-0 space-y-7">
        <section id="interview-todo" tabIndex={-1} aria-labelledby="interview-todo-heading" className="scroll-mt-6 space-y-3 outline-none">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="interview-todo-heading" className={candidateStyles.sectionTitle}>To do</h2>
            <p className="text-[13px] text-muted-foreground">Tasks with a deadline</p>
          </div>
          {firstRound ? (
            <CandidateTestInvitation query={testInvitation} roundLabel={firstRound.round} jobTitle={firstRound.jobTitle} />
          ) : (
            <p className={cn(candidateStyles.card, "flex items-center gap-2.5 px-4 py-3.5 text-sm text-muted-foreground")}>
              <Check size={16} className="shrink-0 text-primary" aria-hidden="true" />
              Nothing due right now.
            </p>
          )}
        </section>

        <section id="interview-upcoming" tabIndex={-1} aria-labelledby="interview-upcoming-heading" className="scroll-mt-6 space-y-3 outline-none">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="interview-upcoming-heading" className={candidateStyles.sectionTitle}>Upcoming</h2>
            <p className="text-[13px] text-muted-foreground">All times in {zoneName()}</p>
          </div>
          {upcoming.length || unscheduled.length ? (
            <div className="space-y-3">
              {upcoming.map((round) => (
                <UpcomingRound key={round.record.id} round={round} showJob={showJob} now={now} needsTest={testDue && isFirstRound({ description: round.record.round })} />
              ))}
              {unscheduled.map((round) => (
                <article key={round.record.id} className={cn(candidateStyles.card, "flex items-start gap-3.5 border-dashed p-4 sm:p-5")}>
                  <span className={cn(candidateStyles.tile, "size-12 rounded-[14px] bg-muted text-muted-foreground")}><CalendarClock size={20} aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{round.record.round}</h3>
                    {showJob && round.record.jobTitle && <p className="text-[13px] text-muted-foreground">{round.record.jobTitle}</p>}
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Date and time to be confirmed. HR will confirm the schedule for this round.</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No interviews scheduled" description="New dates will appear here as soon as HR confirms them." />
          )}
        </section>

        <section id="interview-past" tabIndex={-1} aria-labelledby="interview-past-heading" className="scroll-mt-6 space-y-3 outline-none">
          <h2 id="interview-past-heading" className={candidateStyles.sectionTitle}>Past</h2>
          {past.length ? (
            <ul className={cn(candidateStyles.card, "divide-y divide-border overflow-hidden")}>
              {past.map((round) => {
                const chip = statusChips[round.status.key] || statusChips.pending;
                return (
                  <li key={round.record.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="font-semibold">{round.record.round}</p>
                      {showJob && round.record.jobTitle && <p className="text-[13px] text-muted-foreground">{round.record.jobTitle}</p>}
                    </div>
                    {round.date && (
                      <p className="text-[13px] text-muted-foreground">
                        <time dateTime={round.date.toISOString()}>{shortDate(round.date)} · {clockTime(round.date)}</time>
                      </p>
                    )}
                    <CandidateChip tone={chip.tone} icon={chip.icon}>{round.status.label}</CandidateChip>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No completed rounds yet" description="After each round, you'll see it here with its outcome." className="py-7" />
          )}
        </section>
      </div>

      <aside className="min-w-0 space-y-4">
        <section aria-labelledby="interview-rounds-heading" className={cn(candidateStyles.card, "p-5")}>
          <h2 id="interview-rounds-heading" className="text-base font-semibold">Your rounds</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{journey.completed} of {rounds.length} {rounds.length === 1 ? "round" : "rounds"} complete</p>
          <ol className="mt-4">
            {rounds.map((round, index) => {
              const state = stepState(round);
              const last = index === rounds.length - 1;
              return (
                <li key={round.record.id} className="flex gap-3" aria-current={state === "current" ? "step" : undefined}>
                  <div className="flex flex-col items-center">
                    <StepDot state={state === "closed" ? "done" : state} tone={state === "closed" ? "closed" : "progress"} index={index + 1} />
                    {!last && <span aria-hidden="true" className={cn("my-1 w-0.5 flex-1", state === "done" ? "bg-primary" : "bg-border")} />}
                  </div>
                  <div className={cn("min-w-0 pt-0.5", !last && "pb-4")}>
                    <p className="text-sm font-semibold">{round.record.round}</p>
                    <p className={cn("text-[13px]", state === "current" ? "font-medium text-primary" : "text-muted-foreground")}>
                      {state === "current" ? "Up next" : round.status.label}
                      {round.date && ` · ${shortDate(round.date)}, ${clockTime(round.date)}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        <section aria-labelledby="interview-help-heading" className="rounded-2xl border border-primary/15 bg-accent/60 p-5">
          <h2 id="interview-help-heading" className="flex items-center gap-2 text-[15px] font-semibold">
            <Info size={16} className="text-primary" aria-hidden="true" />
            Can't make it?
          </h2>
          <p className="mt-1.5 text-[13px] leading-5 text-foreground/80">Ask to reschedule at least 24 hours before the interview. Reply to your interview email or contact HR.</p>
        </section>
      </aside>
    </div>
  );
}

function UpcomingRound({ round, showJob, now, needsTest }) {
  const { record, date } = round;
  const countdown = timeUntil(date, now);
  return (
    <article id={`round-card-${record.id}`} tabIndex={-1} className={cn(candidateStyles.card, "scroll-mt-6 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring")} aria-labelledby={`round-${record.id}`}>
      <div className="flex flex-wrap gap-4 p-4 sm:gap-5 sm:p-5">
        <DateTile date={date} />
        <div className="min-w-0 flex-1 basis-60">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 id={`round-${record.id}`} className="text-lg font-semibold tracking-tight wrap-break-word">{record.round} interview</h3>
              {showJob && record.jobTitle && <p className="text-[13px] text-muted-foreground wrap-break-word">{record.jobTitle}</p>}
            </div>
            {countdown && <CandidateChip tone="progress" icon={Timer}>{countdown}</CandidateChip>}
          </div>
          <ul className="mt-3 grid gap-x-5 gap-y-1.5 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2 text-foreground/85">
              <Clock3 size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <time dateTime={date.toISOString()}>{longDate(date)} · {clockTime(date, true)}</time>
            </li>
            {record.location && (
              <li className="flex min-w-0 items-start gap-2 text-foreground/85">
                <MapPin size={15} className="mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="wrap-break-word"><span className="sr-only">Location: </span>{record.location}</span>
              </li>
            )}
            {record.meetingUrl && (
              <li className="flex items-center gap-2 text-foreground/85">
                <Video size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                Video call
              </li>
            )}
          </ul>
        </div>
      </div>
      {(needsTest || record.meetingUrl) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3 sm:px-5">
          {needsTest ? (
            <p className={cn("inline-flex items-center gap-2 text-[13px] font-medium", candidateStyles.attentionText)}>
              <Info size={15} aria-hidden="true" />
              Before this round: finish the {record.round} test
            </p>
          ) : <span />}
          {record.meetingUrl && (
            <a href={record.meetingUrl} target="_blank" rel="noopener noreferrer" className={cn(needsTest ? onboardingStyles.secondary : onboardingStyles.primary, "w-full sm:w-auto")}>
              <Video size={16} aria-hidden="true" />
              Join meeting
              <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
    </article>
  );
}

function DateTile({ date }) {
  return (
    <div aria-hidden="true" className="flex w-[4.75rem] shrink-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card text-center">
      <span className="bg-primary py-1 text-[11px] font-semibold tracking-[0.08em] text-primary-foreground uppercase">{date.toLocaleDateString(undefined, { month: "short" })}</span>
      <span className="pt-1.5 text-[28px] leading-none font-semibold tabular-nums">{date.toLocaleDateString(undefined, { day: "numeric" })}</span>
      <span className="pt-1 pb-2 text-[11px] text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>
    </div>
  );
}

function LoadingRounds() {
  return (
    <div role="status" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <span className="sr-only">Loading your interviews…</span>
      <div aria-hidden="true" className="space-y-7 motion-safe:animate-pulse">
        <div className="space-y-3"><div className="h-5 w-16 rounded bg-muted" /><div className={cn(candidateStyles.card, "h-24")} /></div>
        <div className="space-y-3"><div className="h-5 w-24 rounded bg-muted" /><div className={cn(candidateStyles.card, "h-40")} /></div>
      </div>
      <div aria-hidden="true" className={cn(candidateStyles.card, "h-56 motion-safe:animate-pulse")} />
    </div>
  );
}
