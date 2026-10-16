import { createElement } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { candidateStyles } from "./candidateStyles";

// Shared building blocks for the candidate-side screens. Class sets live in
// candidateStyles.js so this file only exports components (Fast Refresh).
const chipTones = {
  neutral: "border-border bg-muted text-foreground/80",
  progress: "border-primary/20 bg-primary/10 text-primary",
  attention: "border-[var(--candidate-attention)]/25 bg-[var(--candidate-attention-soft)] text-[var(--candidate-attention)]",
  success: "border-highlight/60 bg-highlight/30 text-foreground",
  closed: "border-destructive/20 bg-destructive/10 text-destructive",
};

/** Status chip: always a word, with a dot or icon, so state never relies on colour alone. */
export function CandidateChip({ tone = "neutral", icon, className, children }) {
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-none font-medium whitespace-nowrap", chipTones[tone] || chipTones.neutral, className)}>
      {icon ? createElement(icon, { size: 12, "aria-hidden": true }) : <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function CandidatePageHeader({ icon, eyebrow = "Career space", title, titleId, description, children }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <p className={candidateStyles.eyebrow}>
          {icon && createElement(icon, { size: 15, "aria-hidden": true })}
          {eyebrow}
        </p>
        <h1 id={titleId} className={candidateStyles.title}>{title}</h1>
        {description && <p className={candidateStyles.lede}>{description}</p>}
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{children}</div>}
    </header>
  );
}

// Icon tile colours for the summary strip. Each one is a theme token, so it follows the selected theme.
const statTones = {
  primary: "bg-primary/10 text-primary",
  success: "bg-highlight/35 text-foreground",
  attention: "bg-[var(--candidate-attention-soft)] text-[var(--candidate-attention)]",
  info: "bg-[var(--chart-5)]/15 text-[var(--chart-5)]",
  closed: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * Summary strip: 2 to 4 numbers that answer "where do I stand?" before the content.
 * An item with `to` links to that list; one with `onClick` filters or jumps to its
 * records and reports `active` as a pressed state.
 */
export function CandidateStats({ items, label = "Summary" }) {
  return (
    <dl aria-label={label} className={cn(candidateStyles.card, "grid grid-cols-2 overflow-hidden", items.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {items.map((item) => {
        const interactive = Boolean(item.to || item.onClick);
        const Tag = item.to ? Link : item.onClick ? "button" : "div";
        const tone = statTones[item.tone] || statTones.primary;
        return (
          <div
            key={item.label}
            className="border-b border-border lg:border-b-0 lg:border-l lg:first:border-l-0 nth-[2n]:border-l nth-[n+3]:border-b-0"
          >
            <Tag
              {...(item.to ? { to: item.to } : item.onClick ? { type: "button", onClick: item.onClick, "aria-pressed": item.active } : {})}
              className={cn(
                "group/stat flex h-full w-full items-center gap-3.5 px-4 py-3.5 text-left sm:py-4 lg:px-5",
                interactive && "cursor-pointer transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
                item.active && "bg-accent/60 hover:bg-accent/60",
              )}
            >
              {item.icon && (
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone)}>
                  {createElement(item.icon, { size: 20, "aria-hidden": true })}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-xl font-semibold tracking-tight tabular-nums sm:text-[22px]">
                  {item.value}
                  {item.hint && (
                    <span className={cn("text-[13px] font-medium", item.tone === "attention" ? candidateStyles.attentionText : "text-muted-foreground")}>
                      {item.hint}
                    </span>
                  )}
                </dd>
              </span>
              {interactive && (
                <ChevronRight
                  size={18}
                  className={cn("shrink-0 text-muted-foreground/60 transition-[color,transform] group-hover/stat:translate-x-0.5 group-hover/stat:text-primary motion-reduce:transition-none", item.active && "text-primary")}
                  aria-hidden="true"
                />
              )}
            </Tag>
          </div>
        );
      })}
    </dl>
  );
}

/** Four fixed application stages as thin bars, for list rows. */
export function StageBars({ steps, className }) {
  return (
    <span aria-hidden="true" className={cn("flex gap-1", className)}>
      {steps.map((step, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            step.state === "upcoming" ? "bg-border"
              : step.state === "current" ? (step.tone === "closed" ? "bg-destructive/60" : step.tone === "success" ? "bg-highlight" : "bg-ring")
              : step.tone === "closed" ? "bg-destructive/60" : "bg-primary",
          )}
        />
      ))}
    </span>
  );
}

/** Numbered vertical steps: done (filled), current (lime ring), upcoming (dashed). */
export function StepDot({ state, tone, index, className }) {
  const done = state === "done";
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
        done && tone === "closed" ? "bg-destructive/15 text-destructive"
          : done ? "bg-primary text-primary-foreground"
          : state === "current" ? "bg-highlight text-highlight-foreground ring-4 ring-highlight/30"
          : "border-[1.5px] border-dashed border-border bg-card text-muted-foreground",
        className,
      )}
    >
      {done && tone !== "closed" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
      ) : done ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
      ) : (
        index
      )}
    </span>
  );
}

export function EmptyState({ icon, title, description, children, dashed = true, className }) {
  return (
    <div className={cn(candidateStyles.card, dashed && "border-dashed", "px-6 py-10 text-center", className)}>
      {icon && <span className={cn(candidateStyles.tile, "mx-auto mb-4 size-12 rounded-[14px] border border-border")}>{createElement(icon, { size: 22, "aria-hidden": true })}</span>}
      <p className="font-semibold">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
