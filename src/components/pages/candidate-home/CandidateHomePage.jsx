import { createElement, useState } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  Github,
  GraduationCap,
  Linkedin,
  Lock,
  Mail,
  MapPin,
  Mars,
  NonBinary,
  Pencil,
  Phone,
  Sparkles,
  UserRound,
  Venus,
  VenusAndMars,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCandidateProfile } from "../../../queries/candidate.queries";
import { useSidebarLayout } from "../../../queries/sidebar.queries";
import { sidebarDestination } from "../../../utils/sidebarNavigation";
import {
  fetchCandidateRelated,
  normalizeCandidate,
} from "../profile/candidateApi";
import { candidateRelatedQueryKey } from "../profile/candidateRelated.js";
import { useCandidateApplications, useJobPostings } from "../../../queries/jobs.queries";
import {
  fieldLabel,
  plainText,
  readable,
  titleOf,
  valueOf,
} from "../jobs/jobFormatting";
import { fetchMyInterviews } from "../interviews/candidateInterviews.api";
import {
  experienceDateRange,
  hiringProgress,
  nextInterview,
  profileStrength,
} from "./candidateDashboard";

const card =
  "rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm";
const cardTitle = "text-base font-semibold tracking-tight";
const linkButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const stepStyles = {
  done: "bg-primary/20 text-primary",
  current:
    "bg-linear-to-r from-sidebar-primary to-sidebar-secondary text-white shadow-sm",
  upcoming: "bg-muted text-muted-foreground/70",
  declined: "bg-destructive/15 text-destructive",
};
const stepLegend = [
  { label: "Completed", swatch: "bg-primary/20" },
  {
    label: "Current stage",
    swatch: "bg-linear-to-r from-sidebar-primary to-sidebar-secondary",
  },
  { label: "Locked", swatch: "bg-muted ring-1 ring-border" },
];

function genderIcon(gender) {
  const value = String(gender ?? "")
    .trim()
    .toLowerCase();
  if (/^(male|man|m)$/.test(value)) return Mars;
  if (/^(female|woman|f)$/.test(value)) return Venus;
  if (/non[\s-]?binary/.test(value)) return NonBinary;
  if (value === "other") return VenusAndMars;
  return UserRound;
}

function monthYear(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})/);
  if (!match) return text;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, 1),
  ).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function useRelated(candidateId, section) {
  return useQuery({
    queryKey: candidateRelatedQueryKey(candidateId, section),
    queryFn: () => fetchCandidateRelated(candidateId, section),
    enabled: Boolean(candidateId),
    staleTime: 60000,
  });
}

export default function CandidateHomePage() {
  const email = useSelector((state) => state.user.user?.email)?.trim() || "";
  const profile = useCandidateProfile();
  const candidate = profile.data;
  const draft = normalizeCandidate(candidate || {}, email);
  const experiences = useRelated(candidate?.id, "experiences");
  const education = useRelated(candidate?.id, "education");
  const skills = useRelated(candidate?.id, "skills");
  const applications = useCandidateApplications(candidate?.id);
  const postings = useJobPostings();
  const sidebar = useSidebarLayout();
  const groups = Array.isArray(sidebar.data)
    ? sidebar.data
    : sidebar.data?.data || [];
  const uiModuleId = groups
    .flatMap((group) => group.data || [])
    .find(
      (item) => sidebarDestination(item)?.split(/[?#]/)[0] === "/interviews",
    )?.ui_module_id;
  // Same key as the interviews page so both views share one cached result.
  const interviews = useQuery({
    queryKey: [
      "interviews",
      "candidate",
      email,
      candidate?.id || "",
      uiModuleId || "",
    ],
    queryFn: () => fetchMyInterviews({ candidate, email, uiModuleId }),
    enabled: Boolean(candidate?.id && email && !sidebar.isPending),
    retry: false,
  });

  const applicationRecords = applications.data?.records || [];
  const interviewRecords = interviews.data || [];
  const progress = hiringProgress({
    candidate,
    applications: applicationRecords,
    interviews: interviewRecords,
  });
  const strength = profileStrength(draft, {
    experiences: experiences.data?.length,
    education: education.data?.length,
    skills: skills.data?.length,
  });
  const name =
    [draft.first_name, draft.last_name].filter(Boolean).join(" ") ||
    "Candidate";

  return (
    <main className="min-h-full w-full bg-background px-3 py-4 text-foreground sm:px-5 lg:px-6">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        <h1 className="sr-only">Candidate dashboard</h1>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_330px]">
          <div className="space-y-4">
            <ProfileCard
              candidate={candidate}
              draft={draft}
              name={name}
              applied={
                applications.isSuccess ? applicationRecords.length : null
              }
              interviews={interviews.isSuccess ? interviewRecords.length : null}
            />
            <PersonalInfo draft={draft} />
          </div>

          <div className="min-w-0 space-y-4">
            <section className={card} aria-labelledby="hiring-progress-heading">
              <h2 id="hiring-progress-heading" className={cardTitle}>
                Hiring progress
              </h2>
              <ol className="mt-4 flex overflow-x-auto pb-1">
                {progress.steps.map((step, index) => (
                  <li
                    key={step.label}
                    aria-current={step.state === "current" ? "step" : undefined}
                    className={cn(
                      "-ml-2 flex min-h-10 min-w-37.5 flex-1 items-center justify-center gap-1.5 px-6 text-center text-xs font-semibold first:ml-0 first:rounded-l-lg first:pl-4 last:rounded-r-lg",
                      index === 0
                        ? "[clip-path:polygon(0_0,calc(100%-12px)_0,100%_50%,calc(100%-12px)_100%,0_100%)]"
                        : index === progress.steps.length - 1
                          ? "[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,12px_50%)]"
                          : "[clip-path:polygon(0_0,calc(100%-12px)_0,100%_50%,calc(100%-12px)_100%,0_100%,12px_50%)]",
                      stepStyles[step.state],
                    )}
                  >
                    {step.state === "done" && (
                      <Check size={13} aria-hidden="true" />
                    )}
                    {step.state === "current" && (
                      <span
                        className="size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    )}
                    {step.state === "declined" && (
                      <X size={13} aria-hidden="true" />
                    )}
                    {step.state === "upcoming" && index > 0 && (
                      <Lock size={12} aria-hidden="true" />
                    )}
                    {step.label}
                    {step.state === "upcoming" && index > 0 && (
                      <span className="sr-only">(locked)</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <section className={card} aria-labelledby="overview-heading">
              <div className="flex items-center justify-between gap-3">
                <h2 id="overview-heading" className={cardTitle}>
                  Overview
                </h2>
                <Link
                  to="/profile"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Edit
                </Link>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {draft.description ||
                  "Add a short introduction to your profile so recruiters can get to know you."}
              </p>
              <div className="my-5 border-t border-border" />
              <h3 className={cardTitle}>Experience</h3>
              <RelatedState
                query={experiences}
                empty="No work experience added yet."
              >
                <ol className="mt-4 space-y-5">
                  {(experiences.data || []).slice(0, 4).map((item, index) => (
                    <ExperienceItem key={item.id || index} item={item} />
                  ))}
                </ol>
              </RelatedState>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section className={card} aria-labelledby="education-heading">
                <h2
                  id="education-heading"
                  className={cn(cardTitle, "flex items-center gap-2")}
                >
                  <GraduationCap
                    size={18}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  Education
                </h2>
                <RelatedState query={education} empty="No education added yet.">
                  <ul className="mt-4 space-y-4">
                    {(education.data || []).slice(0, 3).map((item, index) => {
                      const dates = [
                        monthYear(item.from_time),
                        monthYear(item.to_time),
                      ]
                        .filter(Boolean)
                        .join(" – ");
                      return (
                        <li
                          key={item.id || index}
                          className="rounded-xl bg-muted/60 p-3"
                        >
                          <p className="text-sm font-semibold">
                            {plainText(
                              item.qualification ||
                                item.name ||
                                item.specialization,
                            ) || "Qualification"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {plainText(
                              item.institution ||
                                item.university ||
                                item.school ||
                                item.board,
                            )}
                          </p>
                          {(dates || item.percentage) && (
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              {[
                                dates,
                                item.percentage && `Score ${item.percentage}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </RelatedState>
              </section>
              <section className={card} aria-labelledby="skills-heading">
                <h2
                  id="skills-heading"
                  className={cn(cardTitle, "flex items-center gap-2")}
                >
                  <Sparkles
                    size={18}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  Skills
                </h2>
                <RelatedState query={skills} empty="No skills added yet.">
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {(skills.data || []).map((item, index) => {
                      const label = plainText(
                        item.name ||
                          item.skill_name ||
                          item.skill ||
                          item.details,
                      );
                      return (
                        label && (
                          <li
                            key={item.id || index}
                            className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                          >
                            {label}
                          </li>
                        )
                      );
                    })}
                  </ul>
                </RelatedState>
              </section>
            </div>
          </div>

          <div className="space-y-4 lg:col-start-2 xl:col-start-auto">
            <section className={card} aria-labelledby="strength-heading">
              <h2 id="strength-heading" className={cardTitle}>
                Profile strength
              </h2>
              <div className="mt-4 rounded-xl bg-muted/70 p-4">
                <p className="text-xs text-muted-foreground">Overall score</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {strength.score}%{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    complete
                  </span>
                </p>
              </div>
              <ul className="mt-4 space-y-3.5">
                {strength.items.map((item) => (
                  <li key={item.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{item.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {item.value}/{item.max}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={item.label}
                      aria-valuemin={0}
                      aria-valuemax={item.max}
                      aria-valuenow={item.value}
                    >
                      <div
                        className="h-full rounded-full bg-primary/70 transition-[width] duration-500"
                        style={{ width: `${(item.value / item.max) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {strength.score < 100 && (
                <Link
                  to="/profile"
                  className="mt-4 inline-flex text-xs font-semibold text-primary hover:underline"
                >
                  Complete your profile
                </Link>
              )}
            </section>

            <UpcomingSchedule
              query={interviews}
              pending={sidebar.isPending}
              canOpen={Boolean(uiModuleId)}
            />

            <JobsApplied applications={applications} postings={postings} />
          </div>
        </div>
      </div>
    </main>
  );
}

function ProfileCard({ candidate, draft, name, applied, interviews }) {
  const [failedPhoto, setFailedPhoto] = useState("");
  const photo =
    draft.profile_image && draft.profile_image !== failedPhoto
      ? draft.profile_image
      : "";
  const initials = [draft.first_name, draft.last_name]
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  // Stage names arrive HTML-encoded (e.g. "New Candidate -&gt; Walkin").
  const status = plainText(
    candidate?.hrc_stages_id_c_name || candidate?.status,
  );
  const created = String(candidate?.date_entered || "").trim();
  const createdDate = created ? new Date(created.replace(" ", "T")) : null;

  return (
    <section className={cn(card, "text-center")} aria-label="Your profile">
      <div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-full bg-secondary text-3xl font-semibold text-primary ring-4 ring-primary/15">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailedPhoto(photo)}
          />
        ) : (
          initials || <UserRound size={34} aria-hidden="true" />
        )}
      </div>
      <h2 className="mt-4 wrap-break-word text-xl font-semibold tracking-tight">
        {name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {draft.current_designation || "Professional title not added"}
      </p>
      {status && (
        <span className="mt-3 inline-flex rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
          {readable(status)}
        </span>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-muted/70 p-3 text-left">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness
            size={16}
            className="shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="flex flex-col-reverse">
            <dt className="text-[11px] text-muted-foreground">Applied</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {applied ?? "—"}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-2 border-l border-border pl-3">
          <CalendarClock
            size={16}
            className="shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="flex flex-col-reverse">
            <dt className="text-[11px] text-muted-foreground">Interviews</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {interviews ?? "—"}
            </dd>
          </div>
        </div>
      </dl>

      {createdDate && !Number.isNaN(createdDate.getTime()) && (
        <p className="mt-4 text-xs text-muted-foreground">
          Joined on{" "}
          <span className="font-semibold text-foreground">
            {createdDate.toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          {candidate?.candidate_source && (
            <>
              {" "}
              via{" "}
              <span className="font-semibold text-foreground">
                {readable(candidate.candidate_source)}
              </span>
            </>
          )}
        </p>
      )}

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <Link
          to="/profile"
          aria-label="Edit profile"
          className={cn(
            linkButton,
            "border border-border bg-card px-3 text-foreground hover:bg-accent",
          )}
        >
          <Pencil size={15} aria-hidden="true" />
        </Link>
        <Link
          to="/job-application"
          className={cn(
            linkButton,
            "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          My applications
        </Link>
      </div>
    </section>
  );
}

function PersonalInfo({ draft }) {
  const location = [
    draft.primary_address_city,
    draft.primary_address_state,
    draft.primary_address_country,
  ]
    .filter(Boolean)
    .join(", ");
  const dob = /^\d{4}-\d{2}-\d{2}$/.test(draft.dob)
    ? new Date(`${draft.dob}T00:00:00Z`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : draft.dob;
  const rows = [
    { icon: Mail, label: "Email", value: draft.email1 },
    { icon: Phone, label: "Phone", value: draft.phone_mobile },
    {
      icon: genderIcon(draft.gender),
      label: "Gender",
      value: draft.gender && readable(draft.gender),
    },
    { icon: CalendarDays, label: "Date of birth", value: dob },
    { icon: MapPin, label: "Location", value: location },
    {
      icon: Linkedin,
      label: "LinkedIn",
      value: draft.linkedin_url,
      href: draft.linkedin_url,
    },
    {
      icon: Github,
      label: "GitHub",
      value: draft.github_url,
      href: draft.github_url,
    },
  ].filter((row) => row.value);

  return (
    <section className={card} aria-labelledby="personal-info-heading">
      <h2 id="personal-info-heading" className={cardTitle}>
        Personal info
      </h2>
      <dl className="mt-4 space-y-3.5">
        {rows.map(({ icon, label, value, href }) => (
          <div key={label} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {createElement(icon, { size: 16, "aria-hidden": true })}
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 break-all text-sm font-medium">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {value.replace(/^https?:\/\/(www\.)?/i, "")}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RelatedState({ query, empty, children }) {
  if (query.isPending)
    return (
      <div className="mt-4 space-y-3" aria-hidden="true">
        {[0, 1].map((key) => (
          <div
            key={key}
            className="h-12 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  if (query.isError)
    return (
      <p role="alert" className="mt-3 text-sm text-destructive">
        {query.error.message}{" "}
        <button
          type="button"
          onClick={() => query.refetch()}
          className="cursor-pointer font-semibold underline underline-offset-4"
        >
          Retry
        </button>
      </p>
    );
  if (!query.data?.length)
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        {empty}{" "}
        <Link
          to="/profile"
          className="font-semibold text-primary hover:underline"
        >
          Add it in your profile
        </Link>
      </p>
    );
  return children;
}

function ExperienceItem({ item }) {
  const company =
    plainText(item.company_name || item.company || item.name) || "Company";
  const role = plainText(item.position || item.designation);
  const dates = experienceDateRange(item);
  const points = plainText(
    item.responsibilities || item.description || item.details,
  )
    .split(/\n+/)
    .map((line) => line.replace(/^[-•●▪*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <li className="flex gap-3">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
        aria-hidden="true"
      >
        {company[0].toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{company}</p>
        {(role || dates) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[role, dates].filter(Boolean).join("  ·  ")}
          </p>
        )}
        {points.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground marker:text-primary/50">
            {points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function UpcomingSchedule({ query, pending, canOpen }) {
  const next = nextInterview(query.data || []);
  return (
    <section className={card} aria-labelledby="schedule-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="schedule-heading" className={cardTitle}>
          Upcoming schedule
        </h2>
        {canOpen && (
          <Link
            to="/interviews"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      {pending || query.isPending ? (
        <div
          className="mt-4 h-32 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : query.isError ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Your interview schedule is unavailable right now.
        </p>
      ) : !next ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center">
          <CalendarClock
            size={26}
            className="mx-auto text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            No upcoming interviews. New rounds will appear here once HR
            schedules them.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl bg-muted/70 p-4">
          <div>
            <p className="text-sm font-semibold">{next.record.round}</p>
            {next.record.jobTitle && (
              <p className="text-xs text-muted-foreground">
                {next.record.jobTitle}
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Date &amp; time</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
              <Clock3 size={14} className="text-primary" aria-hidden="true" />
              <time dateTime={next.date.toISOString()}>
                {next.date.toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                ·{" "}
                {next.date.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </p>
          </div>
          {next.record.location && (
            <div>
              <p className="text-[11px] text-muted-foreground">Location</p>
              <p className="mt-0.5 wrap-break-word text-sm font-medium">
                {next.record.location}
              </p>
            </div>
          )}
          {next.record.meetingUrl && (
            <a
              href={next.record.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                linkButton,
                "w-full bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Video size={15} aria-hidden="true" />
              Join meeting
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function JobsApplied({ applications, postings }) {
  const records = applications.data?.records || [];
  const dropdowns = applications.data?.dropdowns || {};
  const jobDropdowns = postings.data?.dropdowns || {};
  const jobsById = new Map(
    (postings.data?.records || []).map((job) => [String(job.id).trim(), job]),
  );
  const recent = [...records]
    .sort((left, right) =>
      String(right.date_entered || "").localeCompare(
        String(left.date_entered || ""),
      ),
    )
    .slice(0, 3);

  return (
    <section className={card} aria-labelledby="jobs-applied-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="jobs-applied-heading" className={cardTitle}>
          Jobs applied
        </h2>
        {records.length > 0 && (
          <Link
            to="/job-application"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      {applications.isPending ? (
        <div
          className="mt-4 h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : applications.isError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {applications.error.message}{" "}
          <button
            type="button"
            onClick={() => applications.refetch()}
            className="cursor-pointer font-semibold underline underline-offset-4"
          >
            Retry
          </button>
        </p>
      ) : !records.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center">
          <BriefcaseBusiness
            size={26}
            className="mx-auto text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            You have not applied to any roles yet.
          </p>
          <Link
            to="/job-posting"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Find a role
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {recent.map((application) => {
            const job = jobsById.get(String(application.jobid).trim());
            const status = String(application.status || "").trim();
            const company = fieldLabel(
              job,
              [
                "company_name",
                "company",
                "hrc_clients_hrc_job_postings_1_name",
              ],
              jobDropdowns,
            );
            const chips = [
              fieldLabel(
                job,
                ["employment_type", "job_type"],
                jobDropdowns,
                true,
              ),
              fieldLabel(
                job,
                ["work_mode", "workplace_type"],
                jobDropdowns,
                true,
              ),
              fieldLabel(
                job,
                ["job_location", "location", "city"],
                jobDropdowns,
              ),
            ].filter(Boolean);
            return (
              <li
                key={application.id}
                className="rounded-xl border border-border p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BriefcaseBusiness size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="wrap-break-word text-sm font-semibold">
                      {job ? titleOf(job) : "Job posting unavailable"}
                    </p>
                    {company && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 size={12} aria-hidden="true" />
                        {company}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {status && (
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        status === "accepted"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : status.startsWith("rejected")
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      {dropdowns.status?.[status] || readable(status)}
                    </span>
                  )}
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                {valueOf(application, [
                  "date_entered_uni_format",
                  "date_entered",
                ]) && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Applied{" "}
                    {valueOf(application, [
                      "date_entered_uni_format",
                      "date_entered",
                    ])}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
