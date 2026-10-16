import { createElement } from "react";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import { initialsOf, tint } from "./adminInsights";


/** Card shell shared by the admin insight cards: tinted glow, icon chip, title and a "View all" link. */
export default function InsightCard({ icon, color = "var(--primary)", title, subtitle, badge, onViewAll, viewAllLabel = "View all", className = "", children }) {
  return (
    <section className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full blur-3xl" style={{ backgroundColor: tint(color, 18) }} />
      <header className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset" style={{ color, backgroundColor: tint(color, 12), "--tw-ring-color": tint(color, 22) }}>
            {createElement(icon, { size: 19, strokeWidth: 2, "aria-hidden": true })}
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="truncate">{title}</span>
              {badge !== undefined && badge !== null && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums" style={{ color, backgroundColor: tint(color, 12) }}>{badge}</span>
              )}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {onViewAll && (
          <button type="button" onClick={onViewAll} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {viewAllLabel} <ArrowUpRight size={13} aria-hidden="true" />
          </button>
        )}
      </header>
      <div className="relative mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export function InsightAvatar({ name, color = "var(--primary)", size = "md" }) {
  const sizing = size === "sm" ? "size-8 text-[11px]" : "size-10 text-xs";
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-card ${sizing}`} style={{ color, backgroundColor: tint(color, 14) }}>
      {initialsOf(name)}
    </span>
  );
}

export function InsightEmpty({ icon, title, children }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">{createElement(icon, { size: 20, "aria-hidden": true })}</span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {children && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{children}</p>}
    </div>
  );
}

export function InsightError({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
      <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {message}
        {onRetry && <button type="button" onClick={onRetry} className="ml-2 font-semibold underline underline-offset-2">Retry</button>}
      </span>
    </div>
  );
}

/** Small metric used inside insight cards. */
export function MiniMetric({ label, value, color = "var(--foreground)", onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`min-w-0 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-left ${onClick ? "transition hover:border-primary/30 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
    >
      <span className="flex items-center gap-1.5 truncate text-[11px] font-medium text-muted-foreground">
        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        {label}
      </span>
      <span className="mt-0.5 block text-lg font-semibold tabular-nums tracking-tight text-foreground">{value}</span>
    </Tag>
  );
}
