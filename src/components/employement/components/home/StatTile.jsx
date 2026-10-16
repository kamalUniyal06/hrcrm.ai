import { createElement } from "react";
import { ChevronRight } from "lucide-react";
import Skeleton from "react-loading-skeleton";

/** Compact KPI tile. Renders as a button when `onClick` is given. */
export default function StatTile({ icon, label, value, hint, color = "var(--primary)", loading = false, onClick }) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ color, backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)` }}
      >
        {createElement(icon, { size: 19, strokeWidth: 2 })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-xl font-semibold tracking-tight tabular-nums text-foreground">
          {loading ? <Skeleton width={72} /> : value}
        </span>
        {hint && <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      {onClick && <ChevronRight size={16} className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />}
    </Tag>
  );
}
