import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Tabs as TabsPrimitive } from "radix-ui";
import { ArrowLeft, ArrowRight, Ban, CalendarCheck2, CalendarClock, Check, ExternalLink, Hourglass, MapPin, RefreshCw, Timer, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import { useCandidateProfile } from "../../../queries/candidate.queries";
import { useSidebarLayout } from "../../../queries/sidebar.queries";
import { sidebarDestination } from "../../../utils/sidebarNavigation";
import { onboardingStyles } from "../profile/onboardingStyles";
import { fetchMyInterviews } from "./candidateInterviews.api";
import { interviewJourney, timeUntil } from "./candidateInterviewData";
import { isFirstRound } from "./interviewUtils";
import { fetchMyTestInvitation } from "./candidateTest.api";
import CandidateTestInvitation from "./CandidateTestInvitation";

// Each state pairs its tint with an icon, so status never relies on color alone.
const statusStyles = {
  scheduled: { icon: CalendarCheck2, chip: "border-primary/20 bg-primary/5 text-primary", step: "border-primary/40 bg-card text-primary" },
  passed: { icon: Check, chip: "border-primary/20 bg-primary/10 text-primary", step: "border-primary bg-primary text-primary-foreground" },
  completed: { icon: Check, chip: "border-border bg-muted text-muted-foreground", step: "border-border bg-muted text-muted-foreground" },
  pending: { icon: Hourglass, chip: "border-border bg-card text-muted-foreground", step: "border-dashed border-border bg-card text-muted-foreground" },
  failed: { icon: X, chip: "border-destructive/20 bg-destructive/10 text-destructive", step: "border-destructive/30 bg-destructive/10 text-destructive" },
  cancelled: { icon: Ban, chip: "border-border bg-muted text-muted-foreground", step: "border-border bg-muted text-muted-foreground" },
};
const upNextStep = "border-transparent bg-highlight text-highlight-foreground ring-4 ring-highlight/30";

const longDate = (date, year = true) => date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", ...(year && { year: "numeric" }) });
const shortDate = (date) => date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const clockTime = (date, zone = false) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", ...(zone && { timeZoneName: "short" }) });

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
  const hasFirstRound = records.some((record) => isFirstRound({ description: record.round }));
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

  function refresh() {
    if (profile.isError || !candidate?.id) void profile.refetch();
    else {
      void interviews.refetch();
      if (hasFirstRound) void testInvitation.refetch();
    }
  }

  return (
    <section className="relative min-w-0 flex-1 space-y-5 rounded-2xl bg-card/40 px-3 py-5 text-foreground sm:px-5 sm:py-7 xl:px-7" aria-labelledby="my-interviews-heading">
      <header className="relative overflow-hidden rounded-3xl bg-linear-to-r from-sidebar-primary to-sidebar-secondary p-6 text-white sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-16 size-96 rounded-full border-50 border-white/5" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">Career space</p>
            <h1 id="my-interviews-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">My interviews</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">Your interview schedule and updates for each round.</p>
            <Button variant="outline" onClick={refresh} disabled={refreshing} className="mt-5 h-10 gap-2 border-white/20 bg-white/10 px-3.5 text-xs text-white hover:bg-white/20 hover:text-white">
              <RefreshCw size={15} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
              Refresh
            </Button>
          </div>
          {ready && <NextInterview next={journey.next} now={now} />}
        </div>
      </header>

      {error ? (
        <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          <p>{error.message}</p>
          <button type="button" onClick={refresh} disabled={refreshing} className="mt-3 rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Retry</button>
        </div>
      ) : loading ? (
        <LoadingRounds />
      ) : !candidate?.id ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
          <h2 className="text-lg font-semibold">Complete your profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">Save your candidate profile to see your interview details.</p>
          <Link to="/profile" className="mt-4 inline-block rounded-sm text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">View profile</Link>
        </div>
      ) : !records.length ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center">
          <CalendarClock size={32} className="mx-auto text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold">No interviews yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your interview rounds and schedule will appear here when HR adds them.</p>
        </div>
      ) : (
        <InterviewRounds journey={journey} busy={interviews.isFetching} testInvitation={testInvitation} now={now} />
      )}
    </section>
  );
}

function NextInterview({ next, now }) {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:w-auto sm:min-w-80">
      <p className="flex items-center gap-2 text-xs font-medium text-white/70"><CalendarClock size={15} aria-hidden="true" />Next interview</p>
      {next ? (
        <>
          <p className="mt-2 text-xl font-semibold tracking-tight"><time dateTime={next.date.toISOString()}>{longDate(next.date, false)}</time></p>
          <p className="mt-1 text-sm text-white/80">{clockTime(next.date, true)} · {next.record.round}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
            <span className="size-1.5 rounded-full bg-highlight" aria-hidden="true" />
            {timeUntil(next.date, now)}
          </p>
        </>
      ) : (
        <p className="mt-2 max-w-xs text-sm leading-6 text-white/80">No interview is scheduled right now. New dates will appear here as soon as HR confirms them.</p>
      )}
    </div>
  );
}

function InterviewRounds({ journey, busy, testInvitation, now }) {
  const [selectedId, setSelectedId] = useState("");
  const triggers = useRef({});
  const { rounds, completed } = journey;
  // Follow the round that needs attention until the candidate picks one.
  const selected = rounds.find((round) => round.record.id === selectedId) || rounds.find((round) => round.record.id === journey.focusId);
  const showJob = new Set(rounds.map((round) => round.record.jobTitle).filter(Boolean)).size > 1;

  // Move focus to the step, because the button that was clicked leaves with the old panel.
  function select(id) {
    setSelectedId(id);
    triggers.current[id]?.focus();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-labelledby="interview-rounds-heading" aria-busy={busy}>
      <TabsPrimitive.Root value={selected.record.id} onValueChange={setSelectedId}>
        <div className="border-b border-border px-5 pt-5 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="interview-rounds-heading" className="text-base font-semibold">Interview rounds</h2>
            <p className="text-xs text-muted-foreground">{completed} of {rounds.length} {rounds.length === 1 ? "round" : "rounds"} complete</p>
          </div>
          <TabsPrimitive.List aria-label="Interview rounds" className="-mx-2 mt-3 flex overflow-x-auto pb-3">
            {rounds.map((round, index) => (
              <RoundStep key={round.record.id} triggerRef={(element) => { triggers.current[round.record.id] = element; }} round={round} last={index === rounds.length - 1} showJob={showJob} />
            ))}
          </TabsPrimitive.List>
        </div>
        {rounds.map((round, index) => (
          <TabsPrimitive.Content key={round.record.id} value={round.record.id} className="animate-in p-5 duration-200 outline-none fade-in-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:p-6 motion-reduce:animate-none">
            <RoundDetails round={round} step={index + 1} total={rounds.length} previous={rounds[index - 1]} following={rounds[index + 1]} onSelect={select} testInvitation={testInvitation} now={now} />
          </TabsPrimitive.Content>
        ))}
      </TabsPrimitive.Root>
    </section>
  );
}

function RoundStep({ triggerRef, round, last, showJob }) {
  const { record, date, status, upNext } = round;
  const style = statusStyles[status.key];
  const Icon = upNext ? CalendarClock : style.icon;
  const done = ["passed", "completed"].includes(status.key);
  return (
    <TabsPrimitive.Trigger ref={triggerRef} value={record.id} className="group relative flex min-w-40 flex-1 basis-0 cursor-pointer flex-col items-start rounded-xl p-2 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none">
      <span className="flex w-full items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border-2", upNext ? upNextStep : style.step)}>
          <Icon size={16} aria-hidden="true" />
        </span>
        {!last && <span aria-hidden="true" className={cn("h-0.5 flex-1 rounded-full", done ? "bg-primary" : "bg-border")} />}
      </span>
      <span className="mt-3 text-sm font-semibold wrap-break-word group-data-[state=active]:text-primary">{record.round}</span>
      {showJob && record.jobTitle && <span className="text-xs wrap-break-word text-muted-foreground">{record.jobTitle}</span>}
      <span className={cn("mt-1 text-xs font-medium", upNext ? "text-primary" : "text-muted-foreground")}>{upNext ? "Up next" : status.label}</span>
      {date && <span className="mt-0.5 text-xs text-muted-foreground">{shortDate(date)} · {clockTime(date)}</span>}
      <span aria-hidden="true" className="absolute inset-x-2 -bottom-3 h-0.5 rounded-full bg-primary opacity-0 group-data-[state=active]:opacity-100" />
    </TabsPrimitive.Trigger>
  );
}

function RoundDetails({ round, step, total, previous, following, onSelect, testInvitation, now }) {
  const { record, date, status, upNext } = round;
  const style = statusStyles[status.key];
  const StatusIcon = style.icon;
  const countdown = status.key === "scheduled" ? timeUntil(date, now) : "";
  const firstRound = isFirstRound({ description: record.round });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Step {step} of {total}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight wrap-break-word">{record.round}</h3>
          {record.jobTitle && <p className="mt-1 text-sm wrap-break-word text-muted-foreground">{record.jobTitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {upNext && <span className="rounded-full bg-highlight px-2.5 py-1 text-[11px] font-bold text-highlight-foreground">Up next</span>}
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium", style.chip)}>
            <StatusIcon size={13} aria-hidden="true" />{status.label}
          </span>
        </div>
      </div>

      {date ? (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-linear-to-br from-card to-accent p-4 sm:p-5">
          <DateTile date={date} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold sm:text-lg"><time dateTime={date.toISOString()}>{longDate(date)}</time></p>
            <p className="mt-1 text-sm text-muted-foreground">{clockTime(date, true)}</p>
          </div>
          {countdown && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              <Timer size={14} aria-hidden="true" />{countdown}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-border p-4 sm:p-5">
          <CalendarClock size={20} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Date and time to be confirmed</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">HR will confirm the schedule for this round. Check back here for updates.</p>
          </div>
        </div>
      )}
      {date && status.key === "pending" && <p className="mt-3 text-sm leading-6 text-muted-foreground">The scheduled time for this round has passed. Your update will appear here once HR shares it.</p>}

      {(record.location || record.meetingUrl) && (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {record.location && (
            <p className="flex min-w-0 items-start gap-2">
              <MapPin size={17} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="relative wrap-break-word"><span className="sr-only left-0 top-0">Location: </span>{record.location}</span>
            </p>
          )}
          {record.meetingUrl && (
            <a href={record.meetingUrl} target="_blank" rel="noopener noreferrer" className={cn(firstRound ? onboardingStyles.secondary : onboardingStyles.primary, "relative w-full sm:w-auto")}>
              <Video size={17} aria-hidden="true" />Join meeting<ExternalLink size={15} aria-hidden="true" /><span className="sr-only left-0 top-0"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}

      {firstRound && <CandidateTestInvitation query={testInvitation} />}

      {total > 1 && (
        <nav aria-label="More rounds" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {previous && <RoundLink round={previous} direction="previous" onSelect={onSelect} />}
          {following && <RoundLink round={following} direction="next" onSelect={onSelect} />}
        </nav>
      )}
    </>
  );
}

function RoundLink({ round, direction, onSelect }) {
  const next = direction === "next";
  return (
    <button type="button" onClick={() => onSelect(round.record.id)} className={cn("inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none", next ? "ml-auto flex-row-reverse text-right" : "text-left")}>
      {next ? <ArrowRight size={16} className="text-muted-foreground" aria-hidden="true" /> : <ArrowLeft size={16} className="text-muted-foreground" aria-hidden="true" />}
      <span>
        <span className="block text-[11px] text-muted-foreground">{next ? "Next round" : "Previous round"}</span>
        <span className="block text-sm font-semibold">{round.record.round}</span>
      </span>
    </button>
  );
}

function DateTile({ date }) {
  return (
    <div aria-hidden="true" className="flex w-16 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-center shadow-sm">
      <span className="bg-primary py-1 text-[11px] font-semibold tracking-wider text-primary-foreground uppercase">{date.toLocaleDateString(undefined, { month: "short" })}</span>
      <span className="pt-1.5 text-2xl leading-none font-semibold tabular-nums">{date.toLocaleDateString(undefined, { day: "numeric" })}</span>
      <span className="pt-1 pb-1.5 text-[11px] text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>
    </div>
  );
}

function LoadingRounds() {
  return (
    <div role="status" className="relative rounded-2xl border border-border bg-card p-5 sm:p-6">
      <span className="sr-only left-0 top-0">Loading your interviews…</span>
      <div aria-hidden="true" className="animate-pulse space-y-5 motion-reduce:animate-none">
        <div className="flex gap-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="flex flex-1 items-center gap-3">
              <div className="size-9 shrink-0 rounded-full bg-muted" />
              <div className="h-0.5 flex-1 rounded-full bg-muted" />
            </div>
          ))}
        </div>
        <div className="h-6 w-40 rounded-md bg-muted" />
        <div className="h-24 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
