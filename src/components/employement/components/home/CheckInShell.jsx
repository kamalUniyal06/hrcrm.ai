import { useId } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayLabel } from "./homeUi";

const toneClasses = {
  neutral: "border-border bg-muted text-muted-foreground",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  success: "border-[var(--employee-green)]/25 bg-[var(--employee-green-soft)] text-[var(--employee-green)]",
  warning: "border-[var(--employee-orange)]/25 bg-[var(--employee-break-soft)] text-[var(--employee-break-foreground)]",
};

export function StatusPill({ tone = "neutral", pulse = false, children }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${toneClasses[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}

/**
 * Highlighted frame shared by every state of the daily check-in widget. It is the
 * first thing on the home page, so it stands out from the plain cards around it.
 * `attention` strengthens the outline while the employee still has to clock in.
 */
export default function CheckInShell({ status, shift, badge, attention = false, children }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-linear-to-br from-card to-accent p-4 pt-5 shadow-sm ring-4 transition-shadow focus-within:ring-primary/30",
        attention ? "border-primary ring-primary/20" : "border-primary/40 ring-primary/10",
      )}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-primary" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <CalendarClock size={18} aria-hidden="true" />
          </span>
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">Daily Check In</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {badge}
          {status}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border pb-3">
        <p className="text-lg font-semibold tracking-tight text-foreground">{todayLabel()}</p>
        {shift && <p className="text-sm font-semibold tabular-nums text-primary">{shift}</p>}
      </div>
      <div className="pt-3">{children}</div>
    </section>
  );
}

export const Spinner = () => <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />;
