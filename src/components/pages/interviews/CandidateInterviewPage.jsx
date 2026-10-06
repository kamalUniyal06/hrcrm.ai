import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarDays, Clock3, Loader2, MapPin, RefreshCw, Video } from "lucide-react";
import { Button } from "../../ui/button";
import { useCandidateProfile } from "../../../queries/candidate.queries";
import { useSidebarLayout } from "../../../queries/sidebar.queries";
import { sidebarDestination } from "../../../utils/sidebarNavigation";
import { fetchMyInterviews } from "./candidateInterviews.api";
import { candidateInterviewStatus } from "./candidateInterviewData";
import { interviewDate, isFirstRound } from "./interviewUtils";
import { fetchMyTestInvitation } from "./candidateTest.api";
import CandidateTestInvitation from "./CandidateTestInvitation";

const statusStyles = {
  scheduled: "bg-primary/10 text-primary",
  passed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
};

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

  function refresh() {
    if (profile.isError || !candidate?.id) void profile.refetch();
    else {
      void interviews.refetch();
      if (hasFirstRound) void testInvitation.refetch();
    }
  }

  return (
    <section className="min-w-0 flex-1 rounded-2xl bg-card/40 px-3 py-5 text-foreground sm:px-5 sm:py-7 xl:px-7" aria-labelledby="my-interviews-heading">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Career space</p>
          <h1 id="my-interviews-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">My interviews</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Your interview schedule and updates for each round.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing} className="h-10 gap-2 bg-card text-xs">
          <RefreshCw size={15} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {error ? (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          <p>{error.message}</p>
          <button type="button" onClick={refresh} disabled={refreshing} className="mt-3 rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Retry</button>
        </div>
      ) : loading ? (
        <div role="status" className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Loading your interviews…
        </div>
      ) : !candidate?.id ? (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
          <h2 className="text-lg font-semibold">Complete your profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">Save your candidate profile to see your interview details.</p>
          <Link to="/profile" className="mt-4 inline-block rounded-sm text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">View profile</Link>
        </div>
      ) : !records.length ? (
        <div className="rounded-xl border border-border bg-card px-5 py-14 text-center">
          <CalendarClock size={32} className="mx-auto text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold">No interviews yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your interview rounds and schedule will appear here when HR adds them.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Your interview details" aria-busy={interviews.isFetching}>
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold">Interview details</h2>
            <p className="mt-1 text-xs text-muted-foreground">{records.length} {records.length === 1 ? "round" : "rounds"}</p>
          </div>
          <ol className="divide-y divide-border">
            {records.map((record) => <InterviewDetails key={record.id} record={record} testInvitation={testInvitation} />)}
          </ol>
        </section>
      )}
    </section>
  );
}

function InterviewDetails({ record, testInvitation }) {
  const date = interviewDate(record.scheduledAt);
  const status = candidateInterviewStatus({ interview_status: record.status, interview_datetime: record.scheduledAt });

  return (
    <li className="px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold">{record.round}</h3>
          {record.jobTitle && <p className="mt-1 break-words text-sm text-muted-foreground">{record.jobTitle}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[status.key]}`}>{status.label}</span>
      </div>
      {date ? (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2.5">
            <CalendarDays size={17} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div><dt className="text-xs text-muted-foreground">Date</dt><dd className="mt-1 text-sm"><time dateTime={date.toISOString()}>{date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</time></dd></div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock3 size={17} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div><dt className="text-xs text-muted-foreground">Time</dt><dd className="mt-1 text-sm">{date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</dd></div>
          </div>
        </dl>
      ) : status.key === "pending" && <p className="mt-4 text-sm leading-6 text-muted-foreground">HR will confirm the date and time for this round.</p>}
      {(record.location || record.meetingUrl) && (
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-sm">
          {record.location && <p className="flex items-start gap-2"><MapPin size={17} className="shrink-0 text-muted-foreground" aria-hidden="true" /><span className="break-words">{record.location}</span></p>}
          {record.meetingUrl && <a href={record.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Video size={17} aria-hidden="true" />Open meeting link</a>}
        </div>
      )}
      {isFirstRound({ description: record.round }) && <CandidateTestInvitation query={testInvitation} />}
    </li>
  );
}
