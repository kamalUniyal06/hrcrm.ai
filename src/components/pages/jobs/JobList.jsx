import { BriefcaseBusiness, CheckCircle2, ChevronRight, CircleDot, Clock3, MapPin, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { experienceRange, fieldLabel, locationOf, titleOf } from "./jobFormatting";

const columns = "md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,auto)] md:items-center md:gap-4";
const tones = {
  positive: { icon: CheckCircle2, className: "border-primary/20 bg-primary/10 text-primary" },
  negative: { icon: XCircle, className: "border-destructive/20 bg-destructive/10 text-destructive" },
  pending: { icon: Clock3, className: "border-border bg-muted text-foreground/80" },
  neutral: { icon: CircleDot, className: "border-border bg-muted text-foreground/80" },
};

export function StatusChip({ status, className }) {
  if (!status) return null;
  const tone = tones[status.tone] || tones.neutral;
  const Icon = tone.icon;
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none whitespace-nowrap", tone.className, className)}>
      <Icon size={13} aria-hidden="true" />
      {status.label}
    </span>
  );
}

function Cell({ label, icon, children }) {
  const Icon = icon;
  return children ? (
    <span className="inline-flex min-w-0 items-center gap-1.5 md:text-sm md:text-foreground">
      {Icon && <Icon size={13} className="shrink-0 md:hidden" aria-hidden="true" />}
      <span className="sr-only">{label}: </span>
      <span className="truncate">{children}</span>
    </span>
  ) : (
    <span className="hidden text-muted-foreground/60 md:inline">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label} not specified</span>
    </span>
  );
}

export default function JobList({ rows, selectedKey, applicationsOnly, jobDropdowns, onOpen }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div aria-hidden="true" className={cn("hidden border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground md:grid", columns)}>
        <span>{applicationsOnly ? "Application" : "Role"}</span>
        <span>Type</span>
        <span>Experience</span>
        <span>Location</span>
        <span className="text-right">Status</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map(({ key, job, application, status }) => {
          const selected = key === selectedKey;
          const subline = applicationsOnly
            ? application.date_entered
              ? `Applied ${application.date_entered_uni_format || application.date_entered}`
              : "Application submitted"
            : [job?.job_code, fieldLabel(job, ["department"], jobDropdowns, true)].filter(Boolean).join(" · ");
          return (
            <li key={key}>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => onOpen(key)}
                className={cn(
                  "group relative grid w-full gap-2.5 px-4 py-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5 motion-reduce:transition-none",
                  columns,
                  selected && "bg-accent/70",
                )}
              >
                {selected && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-accent text-primary">
                    <BriefcaseBusiness size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold sm:text-[15px]">
                      {job ? titleOf(job) : "Job posting unavailable"}
                    </span>
                    {subline && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subline}</span>}
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground md:hidden" aria-hidden="true" />
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-[3.25rem] text-xs text-muted-foreground md:contents">
                  <Cell label="Type">{fieldLabel(job, ["employment_type", "job_type"], jobDropdowns, true)}</Cell>
                  <Cell label="Experience" icon={Clock3}>{experienceRange(job)}</Cell>
                  <Cell label="Location" icon={MapPin}>{locationOf(job) || fieldLabel(job, ["work_mode"], jobDropdowns, true)}</Cell>
                  <span className="inline-flex items-center gap-2 md:justify-self-end">
                    <StatusChip status={status} />
                    <ChevronRight
                      size={18}
                      className="hidden shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary md:block motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function JobListSkeleton() {
  return (
    <div role="status" className="overflow-hidden rounded-2xl border border-border bg-card">
      <span className="sr-only">Loading jobs</span>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0">
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
