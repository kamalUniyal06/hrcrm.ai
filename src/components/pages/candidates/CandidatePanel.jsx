import { createElement, useEffect, useMemo, useState } from "react";
import he from "he";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronRight,
  Github,
  GraduationCap,
  Link2,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
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
  appliedDate,
  candidateLocation,
  completenessLabel,
  friendlyDateTime,
  interviewsForCandidate,
  positionTone,
  profileCompleteness,
  readableSource,
  upcomingInterview,
  workflowTone,
} from "./candidateView";
import { isFirstRound } from "../interviews/interviewUtils";

const clean = (value) => he.decode(String(value ?? "")).trim();
const tint = (color, amount = 12) => `color-mix(in oklab, ${color} ${amount}%, transparent)`;
const RELATED = ["skills", "experiences", "education"];
const TABS = [["overview", "Overview"], ["experience", "Experience"], ["education", "Education"], ["interviews", "Interviews"]];

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
  const color = score >= 80 ? "var(--attendance-present)" : score >= 50 ? "var(--primary)" : "var(--attendance-late)";
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--employee-track)" strokeWidth="5" />
        <circle cx="24" cy="24" r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(score / 100) * circumference} ${circumference}`} className="transition-[stroke-dasharray] duration-700" />
        <text x="24" y="24" textAnchor="middle" dominantBaseline="central" transform="rotate(90 24 24)" className="fill-foreground text-[11px] font-bold">{score}%</text>
      </svg>
      <div className="leading-tight">
        <p className="text-[11px] text-muted-foreground">Profile score</p>
        <p className="text-xs font-semibold" style={{ color }}>{completenessLabel(score)}</p>
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
        const title = clean(isExperience ? record.position || record.designation || record.name : record.qualification || record.name);
        const subtitle = clean(isExperience ? record.company_name || record.company : record.institution || record.university || record.school);
        const from = clean(isExperience ? record.joining_date : record.from_time);
        const to = clean(isExperience ? record.leaving_date : record.to_time);
        const extra = clean(isExperience ? record.description || record.responsibilities : record.specialization || (record.percentage && `Score: ${record.percentage}`));
        return (
          <li key={record.id || index} className="relative flex gap-3">
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
              {isExperience ? <BriefcaseBusiness size={14} /> : <GraduationCap size={14} />}
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-border p-3">
              <p className="text-sm font-semibold text-foreground">{title || "Untitled"}</p>
              {subtitle && <p className="text-xs text-primary">{subtitle}</p>}
              {(from || to) && <p className="mt-0.5 text-[11px] text-muted-foreground">{from || "—"} – {to || (isExperience ? "Present" : "—")}</p>}
              {extra && <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{extra}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Docked candidate profile with workflow, interview and profile actions.
 * `actions` comes from CandidatesPage so the list and the panel share one implementation.
 */
export default function CandidatePanel({ id, listRecord, lookups, interviews, interviewsLoading, isAdmin, actions, onClose }) {
  const [tab, setTab] = useState("overview");
  const [savingKind, setSavingKind] = useState(null);
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
  const next = upcomingInterview(items);
  const score = profileCompleteness(record);
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

  return (
    <aside
      aria-label={`${candidateName(record)} profile`}
      className="flex h-full max-h-full w-full flex-col overflow-hidden bg-card xl:rounded-2xl xl:border xl:border-border xl:shadow-sm"
    >
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <header className="relative px-5 pt-5">
          <button type="button" onClick={onClose} aria-label="Close candidate profile" className="absolute right-4 top-4 rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
          <CandidateAvatar record={record} className="h-16 w-16 rounded-full bg-primary/10 text-xl font-semibold text-primary ring-4 ring-primary/10" />
          <h2 className="mt-3 pr-10 text-2xl font-semibold tracking-tight text-foreground">{candidateName(record) || "Candidate"}</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: tone, backgroundColor: tint(tone) }}>
                <BriefcaseBusiness size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{designation || "Role not added"}</p>
                {department && <p className="truncate text-xs font-medium" style={{ color: tone }}>{department}</p>}
              </div>
            </div>
            <ScoreRing score={score} />
          </div>
        </header>

        <div role="tablist" className="mt-4 flex border-b border-border px-5">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`-mb-px flex-1 border-b-2 px-1 pb-2.5 text-xs font-semibold transition ${tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {label}
              {value === "interviews" && items.length > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{items.length}</span>}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-5">
          {tab === "overview" && (
            <>
              <section className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">Candidate Overview</h3>
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
                    {skillNames.slice(0, 8).map((name) => <span key={name} className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">{name}</span>)}
                    {skillNames.length > 8 && <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">+{skillNames.length - 8}</span>}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No skills added yet.</p>}
              </section>

              <section className="rounded-2xl border border-primary/15 p-4" style={{ backgroundColor: tint("var(--primary)", 6) }}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles size={15} />Profile Summary</h3>
                <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-foreground/80">
                  {about || "The candidate hasn't added a summary yet. Open the full profile to add one."}
                </p>
              </section>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <section className="rounded-2xl border border-border p-4">
                  <h3 className="text-xs font-semibold text-foreground">Current Stage</h3>
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
                <button type="button" onClick={() => setTab("interviews")} className="group rounded-2xl border border-border p-4 text-left transition hover:border-primary/30 hover:bg-muted/40">
                  <h3 className="text-xs font-semibold text-foreground">Next Interview</h3>
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
            </>
          )}

          {tab === "experience" && <Timeline query={experiences} kind="experience" />}
          {tab === "education" && <Timeline query={education} kind="education" />}

          {tab === "interviews" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{items.length ? `${items.length} interview${items.length === 1 ? "" : "s"} on record` : "No interviews yet"}</p>
                <button type="button" disabled={rejected} onClick={() => actions.schedule(record)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                  <CalendarPlus size={13} />New interview
                </button>
              </div>
              {interviewsLoading ? <Skeleton height={90} count={2} borderRadius={12} /> : items.map(({ record: interview, round, date, status: state, open }) => (
                <article key={interview.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{round}</p>
                      <p className="text-[11px] text-muted-foreground">{date ? friendlyDateTime(date) : "Date to be confirmed"}</p>
                    </div>
                    <Pill color={workflowTone(state.key === "failed" ? "rejected" : state.label)}>{state.label}</Pill>
                  </div>
                  {clean(interview.interview_feedback) && <p className="mt-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">{clean(interview.interview_feedback)}</p>}
                  {open && !rejected && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => actions.interview({ record: interview, action: "schedule" })} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted"><CalendarPlus size={12} />{date ? "Reschedule" : "Schedule"}</button>
                      <button type="button" onClick={() => actions.interview({ record: interview, action: "Pass" })} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-[var(--attendance-present)] hover:bg-muted"><Check size={12} />Pass</button>
                      <button type="button" onClick={() => actions.interview({ record: interview, action: "Fail" })} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-muted"><X size={12} />Fail</button>
                      {isAdmin && isFirstRound(interview) && <button type="button" onClick={() => actions.assessment(record, interview)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-muted"><Link2 size={12} />Test link</button>}
                    </div>
                  )}
                </article>
              ))}
              {rejected && <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">This candidate is rejected, so interviews can&apos;t be scheduled.</p>}
            </section>
          )}
        </div>
      </div>

      <footer className="grid grid-cols-2 gap-2 border-t border-border bg-card p-4">
        <button type="button" disabled={rejected} onClick={() => actions.schedule(record)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50">
          <CalendarPlus size={15} />Schedule Interview
        </button>
        <button type="button" onClick={() => actions.editProfile(record)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
          View Full Profile <ArrowRight size={15} />
        </button>
      </footer>
    </aside>
  );
}
