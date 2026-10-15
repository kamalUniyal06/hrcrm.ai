import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, Clock3, ExternalLink, GraduationCap, Laptop, Loader2, MapPin, Trash2, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "../profile/onboardingStyles";
import { StatusChip } from "./JobList";
import {
  experienceRange, fieldLabel, isChipList, locationOf, plainText, requirementItems, salaryRange, titleOf, valueOf,
} from "./jobFormatting";

const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none";
const LIST_LIMIT = 6;

function Section({ title, children }) {
  return (
    <section className="border-t border-border pt-6">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chips({ items }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium">{item}</li>
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
          <li key={index} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
            {checked ? (
              <Check size={15} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
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
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

function JobDetails({ job, status, jobDropdowns, isAdmin }) {
  const location = locationOf(job);
  const facts = [
    ["Employment", BriefcaseBusiness, fieldLabel(job, ["employment_type"], jobDropdowns, true)],
    ["Job type", BadgeCheck, fieldLabel(job, ["job_type"], jobDropdowns, true)],
    ["Work mode", Laptop, fieldLabel(job, ["work_mode", "workplace_type"], jobDropdowns, true)],
    ["Experience", Clock3, experienceRange(job)],
    ["Salary", Wallet, salaryRange(job, jobDropdowns)],
    ["Openings", Users, plainText(job.number_of_positions)],
    ["Education", GraduationCap, fieldLabel(job, ["education_required"], jobDropdowns, true)],
    ["Apply by", CalendarDays, plainText(valueOf(job, ["closing_date", "application_deadline", "last_date"]))],
    ...(isAdmin ? [["Posting status", BadgeCheck, fieldLabel(job, ["job_status"], jobDropdowns, true)]] : []),
  ].filter(([, , value]) => value);
  const about = plainText(valueOf(job, ["job_description", "description"]));
  const qualifications = plainText(job.qualifications);
  const instructions = plainText(job.application_instructions);
  const postingUrl = plainText(job.job_posting_url);
  const department = fieldLabel(job, ["department", "company_name", "company"], jobDropdowns, true);

  return (
    <div className="space-y-6 px-5 py-6 sm:px-7">
      <div className="flex items-start gap-4">
        <span className={cn(styles.icon, "hidden sm:inline-flex")}>
          <BriefcaseBusiness size={23} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Dialog.Title className="break-words text-xl font-semibold tracking-tight sm:text-2xl">{titleOf(job)}</Dialog.Title>
            <StatusChip status={status} />
          </div>
          <Dialog.Description asChild>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {job.job_code && <span>{job.job_code}</span>}
              {department && <span className="inline-flex items-center gap-1.5"><Building2 size={14} aria-hidden="true" />{department}</span>}
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />{location || "Location not specified"}</span>
            </p>
          </Dialog.Description>
        </div>
      </div>
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-3 sm:p-5">
          {facts.map(([label, icon, value]) => {
            const Icon = icon;
            return (
              <div key={label} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon size={13} aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
              </div>
            );
          })}
        </dl>
      )}
      {about && (
        <Section title="About the role">
          <p className="whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">{about}</p>
        </Section>
      )}
      {plainText(job.job_responsibilities) && (
        <Section title="Key responsibilities"><Items value={job.job_responsibilities} /></Section>
      )}
      {plainText(valueOf(job, ["required_skills", "skills"])) && (
        <Section title="What you'll bring"><Items value={valueOf(job, ["required_skills", "skills"])} checked /></Section>
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
          {instructions && <p className="whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">{instructions}</p>}
          {/^https?:\/\//i.test(postingUrl) && (
            <a href={postingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
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
  applied, canApply, hasProfile, pending, applyError, onApply, onDelete,
}) {
  const { job, application, status } = row;
  const scrollRef = useRef(null);
  const jobId = String(job?.id ?? "").trim();
  const submitting = !!pending && pending === jobId;

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [row.key]);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-foreground/35 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content
          onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }}
          className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-[640px] flex-col border-l border-border bg-card text-card-foreground shadow-xl shadow-foreground/10 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 [--tw-ease:cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border py-1.5 pr-2 pl-5 sm:pr-4 sm:pl-7">
            <p className="text-sm font-semibold">{applicationsOnly ? "Application details" : "Job details"}</p>
            <div className="flex items-center">
              <button type="button" disabled={index === 0 || submitting} onClick={() => onNavigate(-1)} className={iconButton} aria-label="Previous job">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <span className="px-1 text-xs tabular-nums text-muted-foreground">{index + 1} of {total}</span>
              <button type="button" disabled={index >= total - 1 || submitting} onClick={() => onNavigate(1)} className={iconButton} aria-label="Next job">
                <ChevronRight size={18} aria-hidden="true" />
              </button>
              <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
              <Dialog.Close disabled={submitting} className={iconButton} aria-label="Close job details">
                <X size={20} aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {job ? (
              <JobDetails key={row.key} job={job} status={status} jobDropdowns={jobDropdowns} isAdmin={isAdmin} />
            ) : (
              <div className="px-5 py-12 text-center sm:px-7">
                <span className={cn(styles.icon, "mx-auto")}><BriefcaseBusiness size={23} aria-hidden="true" /></span>
                <Dialog.Title className="mt-4 text-lg font-semibold">Job posting unavailable</Dialog.Title>
                <Dialog.Description className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  This posting is no longer listed. You can still follow your application status here.
                </Dialog.Description>
                <div className="mt-4 flex justify-center"><StatusChip status={status} /></div>
              </div>
            )}
          </div>
          <footer className="shrink-0 border-t border-border bg-card px-5 py-4 sm:px-7">
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
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays size={15} aria-hidden="true" />
                    {application?.date_entered ? `Applied ${application.date_entered_uni_format || application.date_entered}` : "Application submitted"}
                  </p>
                  <Dialog.Close className={styles.secondary}>Close</Dialog.Close>
                </>
              ) : applied ? (
                <>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BadgeCheck size={16} className="text-primary" aria-hidden="true" />
                    You've applied for this role.
                  </p>
                  <Link to="/job-application" onClick={onClose} className={styles.secondary}>
                    Track application
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {hasProfile ? (
                      "You'll apply with your saved candidate profile."
                    ) : (
                      <>
                        <Link to="/profile" onClick={onClose} className="font-semibold text-primary underline underline-offset-4">Complete your profile</Link>
                        {" "}to apply.
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={!canApply || !!pending || !jobId}
                    onClick={() => onApply(jobId)}
                    className={cn(styles.primary, "group/cta relative overflow-hidden")}
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
