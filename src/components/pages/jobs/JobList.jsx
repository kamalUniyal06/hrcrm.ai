import { BriefcaseBusiness, ChevronRight, Clock3, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandidateChip, StageBars } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { experienceRange, fieldLabel, locationOf, titleOf } from "./jobFormatting";

const jobColumns = "md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(8rem,auto)_2.75rem] md:items-center md:gap-4";
const applicationColumns = "md:grid-cols-[minmax(0,2.1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(8rem,auto)_2.75rem] md:items-center md:gap-4";
// Older callers still pass applicationTone() values; map them onto the shared vocabulary.
const legacyTones = { positive: "success", negative: "closed", pending: "progress" };

export function StatusChip({ status, className }) {
  if (!status) return null;
  return (
    <CandidateChip tone={legacyTones[status.tone] || status.tone} className={className}>
      {status.label}
    </CandidateChip>
  );
}

function Cell({ label, icon, children, className }) {
  const Icon = icon;
  return children ? (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 md:text-sm md:text-foreground", className)}>
      {Icon && <Icon size={13} className="shrink-0 md:hidden" aria-hidden="true" />}
      <span className="sr-only">{label}: </span>
      <span className="truncate">{children}</span>
    </span>
  ) : (
    <span className="hidden text-muted-foreground md:inline">
      <span aria-hidden="true">Not listed</span>
      <span className="sr-only">{label} not listed</span>
    </span>
  );
}

export default function JobList({ rows, selectedKey, applicationsOnly, jobDropdowns, onOpen, footer }) {
  const columns = applicationsOnly ? applicationColumns : jobColumns;
  return (
    <div className={cn(candidateStyles.card, "overflow-hidden")}>
      <div aria-hidden="true" className={cn("hidden border-b border-border bg-muted/50 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid", columns)}>
        <span>Role</span>
        {applicationsOnly ? (
          <>
            <span>Applied</span>
            <span>Progress</span>
            <span>Next step</span>
          </>
        ) : (
          <>
            <span>Type</span>
            <span>Experience</span>
            <span>Location</span>
          </>
        )}
        <span>Status</span>
        <span />
      </div>
      <ul className="divide-y divide-border">
        {rows.map(({ key, job, application, status, steps, stage }) => {
          const selected = key === selectedKey;
          const title = job ? titleOf(job) : "Job posting unavailable";
          const subline = applicationsOnly
            ? [job?.job_code, fieldLabel(job, ["employment_type", "job_type"], jobDropdowns, true)].filter(Boolean).join(" · ")
            : [job?.job_code, fieldLabel(job, ["department"], jobDropdowns, true)].filter(Boolean).join(" · ");
          const appliedOn = application?.date_entered_uni_format || application?.date_entered || "";
          return (
            <li key={key}>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={selected}
                onClick={() => onOpen(key)}
                className={cn(
                  "group grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5 md:min-h-[72px] md:py-3 motion-reduce:transition-none",
                  columns,
                  selected && "bg-accent/60 hover:bg-accent/60",
                )}
              >
                <span className="flex min-w-0 items-center gap-3.5">
                  <span className={cn(candidateStyles.tile, "transition-colors group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transition-none", selected && "bg-primary text-primary-foreground")}>
                    <BriefcaseBusiness size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{title}</span>
                    {subline && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subline}</span>}
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground md:hidden" aria-hidden="true" />
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-2.5 pl-[3.4rem] text-xs text-muted-foreground md:contents">
                  {applicationsOnly ? (
                    <>
                      <Cell label="Applied" icon={Clock3}>{appliedOn}</Cell>
                      <span className="flex min-w-0 basis-full flex-col gap-1.5 md:basis-auto">
                        <StageBars steps={steps} className="w-full max-w-[9rem] md:max-w-none" />
                        <span className="text-xs text-muted-foreground">
                          <span className="sr-only">Progress: </span>
                          {stage.closed ? "Closed" : steps[stage.index].label} · step {stage.index + 1} of {steps.length}
                        </span>
                      </span>
                      <span className={cn("hidden text-[13px] leading-5 md:block", stage.tone === "attention" ? cn(candidateStyles.attentionText, "font-semibold") : "text-foreground/80")}>
                        <span className="sr-only">Next step: </span>
                        {stage.next}
                      </span>
                    </>
                  ) : (
                    <>
                      <Cell label="Type">{fieldLabel(job, ["employment_type", "job_type"], jobDropdowns, true)}</Cell>
                      <Cell label="Experience" icon={Clock3}>{experienceRange(job)}</Cell>
                      <Cell label="Location" icon={MapPin}>{locationOf(job) || fieldLabel(job, ["work_mode"], jobDropdowns, true)}</Cell>
                    </>
                  )}
                  <span className="inline-flex items-center">
                    <StatusChip status={status} />
                  </span>
                  <span className="hidden size-10 place-items-center rounded-lg text-muted-foreground transition-colors group-hover:bg-card group-hover:text-primary md:grid motion-reduce:transition-none" aria-hidden="true">
                    <ChevronRight size={18} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {footer && <p className="border-t border-border px-5 py-3 text-[13px] text-muted-foreground" aria-live="polite">{footer}</p>}
    </div>
  );
}

export function JobListSkeleton() {
  return (
    <div role="status" className={cn(candidateStyles.card, "overflow-hidden")}>
      <span className="sr-only">Loading jobs</span>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3.5 border-b border-border px-5 py-4 last:border-b-0">
          <div className="size-10 shrink-0 rounded-xl bg-muted motion-safe:animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-muted motion-safe:animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-muted motion-safe:animate-pulse" />
          </div>
          <div className="hidden h-6 w-20 rounded-full bg-muted motion-safe:animate-pulse md:block" />
        </div>
      ))}
    </div>
  );
}
