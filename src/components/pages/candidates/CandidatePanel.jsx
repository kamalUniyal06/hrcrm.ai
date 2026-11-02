import { createElement, useEffect, useMemo, useState } from "react";
import he from "he";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleX,
  Clock3,
  Github,
  GraduationCap,
  Link2,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  PencilLine,
  Phone,
  Sparkles,
  X,
} from "lucide-react";
import Skeleton from "react-loading-skeleton";
import CandidateAvatar from "./CandidateAvatar";
import { candidateName, fetchCandidateRecord, workflowValue } from "./candidatesApi";
import { fetchCandidateRelated } from "../profile/candidateApi";
import { readResumeSections } from "../profile/resumeSections";
import {
  acceptedScore,
  appliedDate,
  candidateLocation,
  friendlyDateTime,
  interviewsForCandidate,
  isoDate,
  positionTone,
  readableSource,
  roundJourney,
  scoreLabel,
  upcomingInterview,
  workflowTone,
} from "./candidateView";
import { experienceDuration, formatDateRange } from "../profile/profileDisplay";
import { isFirstRound } from "../interviews/interviewUtils";

const clean = (value) => he.decode(String(value ?? "")).trim();
const tint = (color, amount = 12) => `color-mix(in oklab, ${color} ${amount}%, transparent)`;
const RELATED = ["skills", "experiences", "education"];
const TABS = [["overview", "Overview"], ["interviews", "Interviews & feedback"], ["experience", "Experience"], ["education", "Education"]];

// Icon and colour per interview status key; a round the candidate hasn't reached uses `null`.
const ROUND_LOOK = {
  passed: [CircleCheck, "var(--attendance-present)"],
  completed: [CircleCheck, "var(--attendance-present)"],
  failed: [CircleX, "var(--attendance-absent)"],
  cancelled: [CircleX, "var(--muted-foreground)"],
  scheduled: [CalendarClock, "var(--attendance-leave)"],
  pending: [Clock3, "var(--attendance-late)"],
  null: [Circle, "var(--muted-foreground)"],
};
const roundLook = (item) => ROUND_LOOK[item?.status.key ?? "null"] || ROUND_LOOK.null;

export function Pill({ children, color }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color, backgroundColor: tint(color) }}>
      {children}
    </span>
  );
}

function ScoreRing({ score }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const color = score === null ? "var(--muted-foreground)" : score >= 80 ? "var(--attendance-present)" : score >= 50 ? "var(--primary)" : "var(--attendance-late)";
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--employee-track)" strokeWidth="5" />
        <circle cx="24" cy="24" r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${((score ?? 0) / 100) * circumference} ${circumference}`} className="transition-[stroke-dasharray] duration-700" />
        <text x="24" y="24" textAnchor="middle" dominantBaseline="central" transform="rotate(90 24 24)" className="fill-foreground text-[11px] font-bold">{score === null ? "—" : `${score}%`}</text>
      </svg>
      <div className="leading-tight">
        <p className="text-[11px] text-muted-foreground">Accepted score</p>
        <p className="text-xs font-semibold" style={{ color }}>{scoreLabel(score)}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, children, href }) {
  if (!children) return null;
  const body = <span className="min-w-0 truncate">{children}</span>;
  return (
    <li className="flex items-center gap-2.5 text-xs text-foreground">
      {createElement(icon, { size: 14, className: "shrink-0 text-muted-foreground" })}
      {href ? <a href={href} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:text-primary hover:underline">{children}</a> : body}
    </li>
  );
}

function Timeline({ query, kind }) {
  const records = query?.data || [];
  if (!query || query.isPending) return <div className="space-y-2">{[0, 1].map((index) => <Skeleton key={index} height={64} borderRadius={12} />)}</div>;
  if (query.isError) return <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">Couldn&apos;t load {kind}. <button className="underline" onClick={() => query.refetch()}>Retry</button></p>;
  if (!records.length) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No {kind} added yet.</p>;
  const isExperience = kind === "experience";
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
      {records.map((record, index) => {
        // Experience records keep the company in `name` and the role in `position`.
        const role = clean(record.position || record.designation);
        const company = clean(record.company_name || record.company || record.name);
        const title = isExperience ? role || company : clean(record.qualification || record.name);
        const subtitle = isExperience ? (role ? company : "") : clean(record.institution || record.university || record.school);
        const location = isExperience ? clean(record.company_location) : "";
        const from = isoDate(isExperience ? record.joining_date : record.from_time);
        const to = isoDate(isExperience ? record.leaving_date : record.to_time);
        const period = formatDateRange(from, to, isExperience ? "Present" : "");
        const tenure = isExperience ? experienceDuration(from, to) : "";
        const extra = clean(isExperience ? record.description || record.responsibilities : record.specialization || (record.percentage && `Score: ${record.percentage}`));
        return (
          <li key={record.id || index} className="relative flex gap-3">
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
              {isExperience ? <BriefcaseBusiness size={14} /> : <GraduationCap size={14} />}
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{title || "Untitled"}</p>
                  {subtitle && <p className="text-xs font-medium text-primary">{subtitle}</p>}
                </div>
                {tenure && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{tenure}</span>}
              </div>
              {(period || location) && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {period && <span className="inline-flex items-center gap-1"><CalendarClock size={12} />{period}</span>}
                  {location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{location}</span>}
                </p>
              )}
              {extra && <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{extra}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Round 1 → Round 2 → … as buttons; the chosen round is outlined. Each step names its status, so colour is never the only signal. */
function RoundStepper({ steps, active, onSelect, compact = false }) {
  return (
    <ol className="hide-scrollbar flex items-start overflow-x-auto pb-1" aria-label="Interview rounds">
      {steps.map((step, index) => {
        const [icon, color] = roundLook(step.item);
        const selected = active === step.name;
        return (
          <li key={step.name} className="flex min-w-0 flex-1 items-start">
            <button
              type="button"
              onClick={() => onSelect(step.name)}
              disabled={!step.item}
              aria-current={selected ? "step" : undefined}
              className={`group flex w-full min-w-[84px] flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default ${selected ? "bg-primary/[0.07]" : step.item ? "hover:bg-muted/60" : ""}`}
            >
              <span
                className={`flex shrink-0 items-center justify-center rounded-full transition ${compact ? "h-8 w-8" : "h-10 w-10"} ${selected ? "ring-2 ring-offset-2 ring-offset-card" : ""}`}
                style={{ color, backgroundColor: tint(color, step.item ? 14 : 6), "--tw-ring-color": color }}
              >
                {createElement(icon, { size: compact ? 15 : 18, "aria-hidden": true })}
              </span>
              <span className="block max-w-full truncate text-xs font-semibold text-foreground">{step.name}</span>
              <span className="block max-w-full truncate text-[11px]" style={{ color: step.item ? color : undefined }}>
                {step.item ? step.item.status.label : <span className="text-muted-foreground">Not reached</span>}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span aria-hidden="true" className={`h-0.5 w-6 shrink-0 rounded-full sm:w-10 ${compact ? "mt-[23px]" : "mt-[27px]"}`} style={{ backgroundColor: steps[index + 1].item ? roundLook(step.item)[1] : "var(--border)" }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums" style={{ color: value ? color : undefined }}>{value}</p>
    </div>
  );
}

/** One round: date, status and the interviewer's feedback, expanded on demand, with the actions an open round allows. */
function RoundCard({ step, expanded, onToggle, rejected, isAdmin, candidate, actions }) {
  const { record: interview, date, status, open } = step.item;
  const [icon, color] = roundLook(step.item);
  const feedback = clean(interview.interview_feedback);
  const panelId = `round-${interview.id}`;
  return (
    <article className={`overflow-hidden rounded-2xl border transition ${expanded ? "border-primary/30 shadow-sm" : "border-border"}`}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ color, backgroundColor: tint(color) }}>{createElement(icon, { size: 17, "aria-hidden": true })}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{step.name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{date ? friendlyDateTime(date) : "Date to be confirmed"}</span>
        </span>
        <Pill color={color}>{status.label}</Pill>
        {feedback && !expanded && <MessageSquareText size={15} className="shrink-0 text-muted-foreground" aria-label="Has feedback" />}
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {expanded && (
        <div id={panelId} className="space-y-3 border-t border-border p-4">
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><MessageSquareText size={14} className="text-primary" aria-hidden="true" />Interviewer feedback</h4>
            {feedback
              ? <p className="mt-2 whitespace-pre-line rounded-xl bg-muted/60 p-3 text-sm leading-relaxed text-foreground">{feedback}</p>
              : <p className="mt-2 text-xs text-muted-foreground">{open ? "Feedback is added when the round is marked pass or fail." : "No feedback was recorded for this round."}</p>}
          </div>
          {(open && !rejected) || (isAdmin && isFirstRound(interview)) ? (
            <div className="flex flex-wrap gap-1.5">
              {open && !rejected && (
                <>
                  <button type="button" onClick={() => actions.interview({ record: interview, action: "schedule" })} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted"><CalendarPlus size={13} />{date ? "Reschedule" : "Schedule"}</button>
                  <button type="button" onClick={() => actions.interview({ record: interview, action: "Pass" })} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-[var(--attendance-present)] hover:bg-muted"><Check size={13} />Pass</button>
                  <button type="button" onClick={() => actions.interview({ record: interview, action: "Fail" })} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-destructive hover:bg-muted"><X size={13} />Fail</button>
                </>
              )}
              {isAdmin && isFirstRound(interview) && (
                <button type="button" onClick={() => actions.assessment(candidate, interview)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-primary hover:bg-muted"><Link2 size={13} />{open ? "Test link" : "Test results"}</button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}

/**
 * Full candidate profile with workflow, round-by-round interview feedback and profile actions.
 * `actions` comes from CandidatesPage so the list and the profile share one implementation.
 */
export default function CandidatePanel({ id, listRecord, lookups, interviews, interviewsLoading, isAdmin, actions, onClose, initialTab = "overview" }) {
  const [tab, setTab] = useState(initialTab);
  const [savingKind, setSavingKind] = useState(null);
  // null = follow the journey's focus; "" = every round collapsed.
  const [openRound, setOpenRound] = useState(null);
  const query = useQuery({
    queryKey: ["candidates", "detail", id],
    queryFn: () => fetchCandidateRecord(id),
    placeholderData: listRecord,
    staleTime: 30000,
  });
  const related = useQueries({
    queries: RELATED.map((key) => ({
      queryKey: ["candidates", "detail", id, "related", key],
      queryFn: () => fetchCandidateRelated(id, key),
      staleTime: 60000,
    })),
  });
  const [skills, experiences, education] = related;

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const record = useMemo(() => query.data || listRecord || {}, [query.data, listRecord]);
  const items = useMemo(() => interviewsForCandidate(interviews || [], record), [interviews, record]);
  const journey = useMemo(() => roundJourney(items), [items]);
  const activeRound = openRound ?? journey.focus;
  const next = upcomingInterview(items);
  const score = acceptedScore(record);
  const designation = clean(record.current_designation || record.title);
  const department = clean(record.department);
  const about = readResumeSections(record.description || "").about?.trim();
  const skillNames = (skills.data || []).map((skill) => clean(skill.skill_name || skill.skill || skill.name)).filter(Boolean);
  const stage = workflowValue(record, "stage", lookups.stage.data);
  const status = workflowValue(record, "status", lookups.status.data);
  const rejected = status.toLowerCase() === "rejected";
  const tone = positionTone(department || designation);

  async function change(kind, name) {
    setSavingKind(kind);
    try {
      await actions.changeWorkflow(record, kind, name);
      await query.refetch();
    } catch {
      // The page already shows a toast for failed updates.
    } finally {
      setSavingKind(null);
    }
  }

  const showRound = (name) => {
    setOpenRound(name);
    setTab("interviews");
  };

  return (
    <aside aria-label={`${candidateName(record)} profile`} className="flex h-full max-h-full w-full flex-col overflow-hidden bg-card">
      <header className="border-b border-border px-5 pt-5 sm:px-6">
        <div className="flex items-start gap-4">
          <CandidateAvatar record={record} className="h-16 w-16 shrink-0 rounded-full bg-primary/10 text-xl font-semibold text-primary ring-4 ring-primary/10" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{candidateName(record) || "Candidate"}</h2>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm">
              <BriefcaseBusiness size={14} className="shrink-0" style={{ color: tone }} aria-hidden="true" />
              <span className="truncate font-medium text-foreground">{designation || "Role not added"}</span>
              {department && <span className="truncate text-xs font-medium" style={{ color: tone }}>· {department}</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill color={workflowTone(stage)}>{stage}</Pill>
              <Pill color={workflowTone(status)}>{status}</Pill>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close candidate profile" className="shrink-0 rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <ScoreRing score={score} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={rejected} onClick={() => actions.schedule(record)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50">
              <CalendarPlus size={15} />Schedule interview
            </button>
            <button type="button" onClick={() => actions.editProfile(record)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
              <PencilLine size={15} />Edit full profile
            </button>
          </div>
        </div>

        <div role="tablist" className="hide-scrollbar -mb-px mt-4 flex gap-5 overflow-x-auto">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`shrink-0 border-b-2 px-0.5 pb-2.5 text-xs font-semibold whitespace-nowrap transition ${tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {label}
              {value === "interviews" && journey.stats.total > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{journey.stats.total}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-5 sm:p-6">
        {tab === "overview" && (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="min-w-0 space-y-4">
              <section className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">Candidate overview</h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <ul className="min-w-0 space-y-2.5">
                    <InfoRow icon={MapPin}>{candidateLocation(record)}</InfoRow>
                    <InfoRow icon={Mail} href={record.email1 ? `mailto:${record.email1}` : undefined}>{clean(record.email1)}</InfoRow>
                    <InfoRow icon={Phone} href={record.phone_mobile ? `tel:${record.phone_mobile}` : undefined}>{clean(record.phone_mobile)}</InfoRow>
                    <InfoRow icon={Linkedin} href={record.linkedin_url}>{record.linkedin_url && "LinkedIn profile"}</InfoRow>
                    <InfoRow icon={Github} href={record.github_url}>{record.github_url && "GitHub profile"}</InfoRow>
                  </ul>
                  <dl className="space-y-3 border-border sm:border-l sm:pl-4">
                    <div><dt className="text-[11px] text-muted-foreground">Source</dt><dd className="text-sm font-semibold text-foreground">{readableSource(record.candidate_source)}</dd></div>
                    <div><dt className="text-[11px] text-muted-foreground">Applied</dt><dd className="text-sm font-semibold text-foreground">{appliedDate(record)}</dd></div>
                  </dl>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Skills</h3>
                {skills.isPending ? <Skeleton height={28} count={1} borderRadius={999} /> : skillNames.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skillNames.map((name) => <span key={name} className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">{name}</span>)}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No skills added yet.</p>}
              </section>

              <section className="rounded-2xl border border-primary/15 p-4" style={{ backgroundColor: tint("var(--primary)", 6) }}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles size={15} />Profile summary</h3>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-foreground/80">
                  {about || "The candidate hasn't added a summary yet. Use Edit full profile to add one."}
                </p>
              </section>
            </div>

            <div className="min-w-0 space-y-4">
              <section className="rounded-2xl border border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">Current stage</h3>
                <div className="mt-2 space-y-2">
                  {["stage", "status"].map((kind) => (
                    <label key={kind} className="block">
                      <span className="sr-only">Change {kind}</span>
                      <div className="relative">
                        <select
                          value={kind === "stage" ? stage : status}
                          disabled={!lookups[kind].isSuccess || savingKind !== null}
                          onChange={(event) => change(kind, event.target.value)}
                          className="w-full appearance-none rounded-full border-0 py-1.5 pl-3 pr-7 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                          style={{ color: workflowTone(kind === "stage" ? stage : status), backgroundColor: tint(workflowTone(kind === "stage" ? stage : status)) }}
                        >
                          {[...new Set([kind === "stage" ? stage : status, ...(lookups[kind].data || []).map((option) => clean(option.name))])].map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                        {savingKind === kind ? <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" /> : <ChevronRight size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground" />}
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-foreground">Interview progress</h3>
                  <button type="button" onClick={() => setTab("interviews")} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline">See feedback<ChevronRight size={12} /></button>
                </div>
                {interviewsLoading ? <Skeleton className="mt-3" height={70} borderRadius={12} /> : (
                  <div className="mt-2"><RoundStepper steps={journey.steps} active="" onSelect={showRound} compact /></div>
                )}
              </section>

              <button type="button" onClick={() => (next ? showRound(next.round) : setTab("interviews"))} className="group w-full rounded-2xl border border-border p-4 text-left transition hover:border-primary/30 hover:bg-muted/40">
                <h3 className="text-xs font-semibold text-foreground">Next interview</h3>
                <div className="mt-2 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarClock size={16} /></span>
                  <span className="min-w-0 flex-1">
                    {interviewsLoading ? <Skeleton width={90} /> : next ? (
                      <>
                        <span className="block truncate text-sm font-semibold text-foreground">{friendlyDateTime(next.date)}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{next.round}</span>
                      </>
                    ) : <span className="block text-xs text-muted-foreground">Nothing scheduled</span>}
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                </div>
              </button>
            </div>
          </div>
        )}

        {tab === "experience" && <Timeline query={experiences} kind="experience" />}
        {tab === "education" && <Timeline query={education} kind="education" />}

        {tab === "interviews" && (
          <section className="space-y-4">
            {interviewsLoading ? <Skeleton height={90} count={3} borderRadius={12} /> : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatBox label="Rounds taken" value={journey.stats.total} color="var(--primary)" />
                  <StatBox label="Passed" value={journey.stats.passed} color="var(--attendance-present)" />
                  <StatBox label="Not selected" value={journey.stats.failed} color="var(--attendance-absent)" />
                  <StatBox label="Upcoming" value={journey.stats.scheduled} color="var(--attendance-leave)" />
                </div>

                <div className="rounded-2xl border border-border p-3">
                  <RoundStepper steps={journey.steps} active={activeRound} onSelect={(name) => setOpenRound(name)} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Round-wise feedback</h3>
                  <button type="button" disabled={rejected} onClick={() => actions.schedule(record)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                    <CalendarPlus size={13} />New interview
                  </button>
                </div>

                {journey.stats.total ? (
                  <div className="space-y-2.5">
                    {journey.steps.filter((step) => step.item).map((step) => (
                      <RoundCard
                        key={step.name}
                        step={step}
                        expanded={activeRound === step.name}
                        onToggle={() => setOpenRound(activeRound === step.name ? "" : step.name)}
                        rejected={rejected}
                        isAdmin={isAdmin}
                        candidate={record}
                        actions={actions}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No interviews yet. Schedule one to start Round 1.</p>
                )}
                {rejected && <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">This candidate is rejected, so interviews can&apos;t be scheduled.</p>}
              </>
            )}
          </section>
        )}
      </div>
    </aside>
  );
}
