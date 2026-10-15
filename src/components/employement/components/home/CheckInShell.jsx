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

/** Compact frame shared by every state of the daily check-in widget. */
export default function CheckInShell({ status, shift, badge, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Daily Check In</h2>
        <div className="flex items-center gap-1.5">
          {badge}
          {status}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border pb-3">
        <p className="text-base font-semibold tracking-tight text-foreground">{todayLabel()}</p>
        {shift && <p className="text-sm font-semibold tabular-nums text-primary">{shift}</p>}
      </div>
      <div className="pt-3">{children}</div>
    </section>
  );
}

export const Spinner = () => <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />;
