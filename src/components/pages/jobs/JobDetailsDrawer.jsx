import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, ExternalLink, GraduationCap, Laptop, Loader2, MapPin, Trash2, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "../profile/onboardingStyles";
import { StepDot } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { applicationSteps, skillMatches } from "../candidate/candidateStatus";
import { StatusChip } from "./JobList";
import {
  experienceRange, fieldLabel, isChipList, locationOf, plainText, requirementItems, salaryRange, titleOf, valueOf,
} from "./jobFormatting";

const LIST_LIMIT = 6;

function Section({ title, aside, children }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {aside && <p className="text-xs font-medium text-primary">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Chips({ items }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className={cn(candidateStyles.tag, "px-3 py-1.5 text-[13px] text-foreground")}>{item}</li>
      ))}
    </ul>
  );
}

function ItemList({ items, checked }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, LIST_LIMIT);
  return (
    <>
      <ul className="space-y-2.5">
        {shown.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5 text-sm leading-6 text-foreground/85">
            {checked ? (
              <Check size={15} className="mt-1.5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
            )}
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
      {items.length > LIST_LIMIT && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={cn(candidateStyles.ghost, "mt-2 -ml-2.5")}
        >
          {expanded ? "Show less" : `Show all ${items.length}`}
          <ChevronDown size={16} className={cn("transition-transform motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

function Items({ value, checked }) {
  const items = requirementItems(value);
  if (!items.length) return null;
  return isChipList(items) ? <Chips items={items} /> : <ItemList items={items} checked={checked} />;
}

/** Required skills, ticked when they already appear on the candidate's profile. */
function SkillMatchList({ value, profileSkills }) {
  const items = requirementItems(value);
  if (!items.length) return null;
  if (!profileSkills) return <Items value={value} checked />;
  const match = skillMatches(items, profileSkills);
  return (
    <Section title="What you'll bring" aside={profileSkills.length ? `${match.count} of ${items.length} match your profile` : "Add skills to your profile to compare"}>
      <ul className="divide-y divide-border">
        {match.items.map(({ item, matched }) => (
          <li key={item} className="flex items-center gap-3 py-2.5 text-sm">
            {matched ? (
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              </span>
            ) : (
              <span className="size-6 shrink-0 rounded-full border-[1.5px] border-dashed border-border" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 break-words">{item}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{matched ? "On your profile" : ""}</span>
            <span className="sr-only">{matched ? "" : "Not on your profile"}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Fact({ label, icon, children }) {
  const Icon = icon;
  return (
    <div className="min-w-0 bg-card px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon size={13} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold">{children}</dd>
    </div>
  );
}

/** Four fixed stages, read from the application's CRM status. */
function ApplicationProgress({ application, appliedOn }) {
  const steps = applicationSteps(application?.status);
  const current = steps.findIndex((step) => step.state === "current");
  const details = {
    Applied: appliedOn ? `Submitted ${appliedOn}` : "Submitted with your candidate profile",
    Review: current === 1 ? "A recruiter is reviewing your profile." : current > 1 || current === -1 ? "Your profile was reviewed." : "After you apply.",
    Interview: current === 2 ? "You're at the interview stage." : current > 2 || current === -1 ? "Interview stage complete." : "Scheduled after review.",
    Decision: steps[3].state === "done" ? (steps[3].tone === "closed" ? "This application is closed." : "Congratulations, HR will be in touch.") : "We'll share the outcome here.",
  };
  return (
    <Section title="Progress">
      <ol className="space-y-0">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          return (
            <li key={step.label} className="flex gap-3.5" aria-current={step.state === "current" ? "step" : undefined}>
              <div className="flex flex-col items-center">
                <StepDot state={step.state} tone={step.tone} index={index + 1} />
                {!last && <span aria-hidden="true" className={cn("my-1 w-0.5 flex-1", step.state === "done" ? "bg-primary" : "bg-border")} />}
              </div>
              <div className={cn("min-w-0 pt-0.5", !last && "pb-5")}>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold">{step.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {step.state === "done" ? "Done" : step.state === "current" ? "In progress" : "Up next"}
                  </span>
                </p>
                <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{details[step.label]}</p>
                {step.label === "Interview" && step.state !== "upcoming" && (
                  <Link to="/interviews" className={cn(candidateStyles.ghost, "mt-1 -ml-2.5 min-h-9")}>
                    View interview details
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function JobDetails({ job, application, applicationsOnly, applied, appliedOn, jobDropdowns, isAdmin, profileSkills }) {
  const facts = [
    ["Salary", Wallet, salaryRange(job, jobDropdowns)],
    ["Apply by", CalendarDays, plainText(valueOf(job, ["closing_date", "application_deadline", "last_date"]))],
    ["Experience", Clock3, experienceRange(job)],
    ["Work mode", Laptop, fieldLabel(job, ["work_mode", "workplace_type"], jobDropdowns, true)],
    ["Employment", BriefcaseBusiness, fieldLabel(job, ["employment_type", "job_type"], jobDropdowns, true)],
    ["Openings", Users, plainText(job.number_of_positions)],
    ["Education", GraduationCap, fieldLabel(job, ["education_required"], jobDropdowns, true)],
    ...(isAdmin ? [["Posting status", BadgeCheck, fieldLabel(job, ["job_status"], jobDropdowns, true)]] : []),
  ].filter(([, , value]) => value);
  const about = plainText(valueOf(job, ["job_description", "description"]));
  const qualifications = plainText(job.qualifications);
  const instructions = plainText(job.application_instructions);
  const postingUrl = plainText(job.job_posting_url);
  const requiredSkills = valueOf(job, ["required_skills", "skills"]);

  return (
    <div className="space-y-7 px-5 py-6 sm:px-6">
      {applicationsOnly ? (
        <ApplicationProgress application={application} appliedOn={appliedOn} />
      ) : applied && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-primary">
          <CheckCircle2 size={20} className="mt-px shrink-0" aria-hidden="true" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">You've applied for this role</p>
            <p className="mt-0.5 text-[13px] leading-5 text-primary/80">Follow each step under My applications.</p>
          </div>
        </div>
      )}
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {facts.map(([label, icon, value]) => (
            <Fact key={label} label={label} icon={icon}>{value}</Fact>
          ))}
        </dl>
      )}
      {about && (
        <Section title="About the role">
          <p className="break-words whitespace-pre-line text-sm leading-7 text-foreground/85">{about}</p>
        </Section>
      )}
      {plainText(job.job_responsibilities) && (
        <Section title="Key responsibilities"><Items value={job.job_responsibilities} /></Section>
      )}
      {plainText(requiredSkills) && (
        isAdmin || !profileSkills ? (
          <Section title="What you'll bring"><Items value={requiredSkills} checked /></Section>
        ) : (
          <SkillMatchList value={requiredSkills} profileSkills={profileSkills} />
        )
      )}
      {plainText(job.preferred_skills) && (
        <Section title="Nice to have"><Items value={job.preferred_skills} /></Section>
      )}
      {qualifications && (
        <Section title="Qualifications"><Items value={job.qualifications} checked /></Section>
      )}
      {plainText(job.benefits) && (
        <Section title="Benefits"><Items value={job.benefits} /></Section>
      )}
      {(instructions || /^https?:\/\//i.test(postingUrl)) && (
        <Section title="How to apply">
          {instructions && <p className="break-words whitespace-pre-line text-sm leading-7 text-foreground/85">{instructions}</p>}
          {/^https?:\/\//i.test(postingUrl) && (
            <a href={postingUrl} target="_blank" rel="noopener noreferrer" className={cn(candidateStyles.ghost, "mt-2 -ml-2.5")}>
              View original posting
              <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </Section>
      )}
    </div>
  );
}

export default function JobDetailsDrawer({
  row, index, total, onNavigate, onClose, applicationsOnly, isAdmin, jobDropdowns,
  applied, canApply, hasProfile, candidateName, profileSkills, pending, applyError, onApply, onDelete,
}) {
  const { job, application, status } = row;
  const scrollRef = useRef(null);
  const jobId = String(job?.id ?? "").trim();
  const submitting = !!pending && pending === jobId;
  const appliedOn = application?.date_entered_uni_format || application?.date_entered || "";
  const location = job ? locationOf(job) : "";
  const tags = job ? [
    fieldLabel(job, ["employment_type", "job_type"], jobDropdowns, true),
    experienceRange(job),
    location || fieldLabel(job, ["work_mode"], jobDropdowns, true),
    fieldLabel(job, ["department", "company_name", "company"], jobDropdowns, true),
  ].filter(Boolean) : [];
  const initials = String(candidateName || "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [row.key]);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-foreground/35 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content
          onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }}
          className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-[560px] flex-col border-l border-border bg-card text-card-foreground shadow-xl shadow-foreground/10 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 [--tw-ease:cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
        >
          <div className="shrink-0 border-b border-border px-5 pt-3 pb-5 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <p className={candidateStyles.eyebrow}>
                {applicationsOnly ? "Application" : "Job posting"}
                {job?.job_code && <span className="font-medium text-muted-foreground">· {job.job_code}</span>}
              </p>
              <div className="-mr-2 flex items-center">
                <button type="button" disabled={index === 0 || submitting} onClick={() => onNavigate(-1)} className={candidateStyles.iconButton} aria-label={applicationsOnly ? "Previous application" : "Previous job"}>
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <span className="px-1 text-xs tabular-nums text-muted-foreground">{index + 1} of {total}</span>
                <button type="button" disabled={index >= total - 1 || submitting} onClick={() => onNavigate(1)} className={candidateStyles.iconButton} aria-label={applicationsOnly ? "Next application" : "Next job"}>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
                <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
                <Dialog.Close disabled={submitting} className={candidateStyles.iconButton} aria-label="Close details">
                  <X size={20} aria-hidden="true" />
                </Dialog.Close>
              </div>
            </div>
            {job ? (
              <>
                <Dialog.Title className="mt-2 break-words text-[22px] leading-tight font-semibold tracking-tight sm:text-2xl">{titleOf(job)}</Dialog.Title>
                <Dialog.Description asChild>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusChip status={status} />
                    {tags.map((tag) => <span key={tag} className={candidateStyles.tag}>{tag}</span>)}
                    {applicationsOnly && appliedOn && <span className="text-xs text-muted-foreground">Applied {appliedOn}</span>}
                  </div>
                </Dialog.Description>
              </>
            ) : (
              <>
                <Dialog.Title className="mt-2 text-[22px] font-semibold tracking-tight">Job posting unavailable</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                  This posting is no longer listed. You can still follow your application status here.
                </Dialog.Description>
                <div className="mt-3"><StatusChip status={status} /></div>
              </>
            )}
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {job ? (
              <JobDetails
                key={row.key}
                job={job}
                application={application}
                applicationsOnly={applicationsOnly}
                applied={applied}
                appliedOn={appliedOn}
                jobDropdowns={jobDropdowns}
                isAdmin={isAdmin}
                profileSkills={profileSkills}
              />
            ) : applicationsOnly && (
              <div className="px-5 py-6 sm:px-6"><ApplicationProgress application={application} appliedOn={appliedOn} /></div>
            )}
          </div>
          <footer className="shrink-0 border-t border-border bg-card px-5 py-4 sm:px-6">
            {applyError && (
              <p role="alert" className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive">{applyError}</p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {isAdmin ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Posting status: <span className="font-medium text-foreground">{fieldLabel(job, ["job_status"], jobDropdowns, true) || "Not set"}</span>
                  </p>
                  <button
                    type="button"
                    disabled={!job?.id}
                    onClick={() => onDelete(job)}
                    className={cn(styles.secondary, "border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5")}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete posting
                  </button>
                </>
              ) : applicationsOnly ? (
                <>
                  <p className="text-[13px] leading-5 text-muted-foreground">Questions about this application? Your recruiter can help.</p>
                  <Link to="/interviews" onClick={onClose} className={styles.secondary}>
                    Go to interviews
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </>
              ) : applied ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <BadgeCheck size={16} aria-hidden="true" />
                    Applied
                  </p>
                  <Link to="/job-application" onClick={onClose} className={styles.secondary}>
                    Track application
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  {hasProfile ? (
                    <p className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary" aria-hidden="true">{initials || <BriefcaseBusiness size={15} />}</span>
                      <span className="min-w-0 text-[13px] leading-[1.35]">
                        <span className="block truncate font-semibold">Applying as {candidateName || "you"}</span>
                        <Link to="/profile" onClick={onClose} className="text-xs text-primary underline-offset-4 hover:underline">Review profile</Link>
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <Link to="/profile" onClick={onClose} className="font-semibold text-primary underline underline-offset-4">Complete your profile</Link>
                      {" "}to apply.
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!canApply || !!pending || !jobId}
                    onClick={() => onApply(jobId)}
                    className={cn(styles.primary, "group/cta relative overflow-hidden sm:min-w-40")}
                  >
                    <span className={styles.shine} aria-hidden="true" />
                    {submitting ? (
                      <><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Applying…</>
                    ) : (
                      <>Apply now<ArrowRight size={16} aria-hidden="true" /></>
                    )}
                  </button>
                </>
              )}
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
