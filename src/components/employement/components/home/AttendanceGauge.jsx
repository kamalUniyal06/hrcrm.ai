import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import { STATUS_KEYS } from "./homeDashboardUtils";

const STATUS_META = {
  present: { label: "Present", color: "var(--attendance-present)" },
  late: { label: "Late", color: "var(--attendance-late)" },
  leave: { label: "On leave", color: "var(--attendance-leave)" },
  absent: { label: "Absent", color: "var(--attendance-absent)" },
};

// Semicircle centred at (110, 110); pathLength=100 lets segments use percentages.
const ARC = "M 22 110 A 88 88 0 0 1 198 110";
const GAP = 0.9;

/**
 * Half-donut of attendance statuses with a counted legend.
 * When `onSelect` is given, segments and legend entries open the matching records.
 */
export default function AttendanceGauge({ title, subtitle, counts, labels = {}, loading, error, onSelect, action, footer }) {
  const [active, setActive] = useState(null);
  const total = STATUS_KEYS.reduce((sum, key) => sum + (counts?.[key] || 0), 0);
  const attended = (counts?.present || 0) + (counts?.late || 0);
  const pct = (value) => (total ? Math.round((value / total) * 100) : 0);
  const nonZero = STATUS_KEYS.filter((key) => counts?.[key] > 0).length;
  const label = (key) => labels[key] || STATUS_META[key].label;

  let offset = 0;
  const segments = STATUS_KEYS.map((key) => {
    const value = counts?.[key] || 0;
    const length = total ? (value / total) * 100 : 0;
    const start = offset;
    offset += length;
    return { key, value, length, start };
  }).filter((segment) => segment.value > 0);

  const focus = active && counts?.[active] !== undefined ? active : null;

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`${title} breakdown`}>
        {STATUS_KEYS.map((key) => {
          const content = (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_META[key].color }} />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-medium text-muted-foreground">{label(key)}</span>
                <span className="block text-sm font-semibold tabular-nums text-foreground">
                  {loading || error ? "—" : counts?.[key] || 0}
                </span>
              </span>
            </>
          );
          const shared = `flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition ${focus === key ? "bg-muted" : ""}`;
          return (
            <li key={key}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(key)}
                  onMouseEnter={() => setActive(key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(key)}
                  onBlur={() => setActive(null)}
                  aria-label={`${label(key)}: ${counts?.[key] || 0}. View records`}
                  className={`${shared} cursor-pointer hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {content}
                </button>
              ) : (
                <div className={shared} onMouseEnter={() => setActive(key)} onMouseLeave={() => setActive(null)}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="relative mx-auto mt-3 w-full max-w-[300px]">
        {loading ? (
          <Skeleton height={150} borderRadius={16} />
        ) : (
          <>
            <svg viewBox="0 0 220 120" className="w-full overflow-visible" role="img" aria-label={`${attended} of ${total} attended`}>
              <path d={ARC} pathLength={100} fill="none" stroke="var(--employee-track)" strokeWidth={22} />
              {segments.map((segment) => {
                const gap = nonZero > 1 ? GAP : 0;
                const dim = focus && focus !== segment.key;
                return (
                  <path
                    key={segment.key}
                    d={ARC}
                    pathLength={100}
                    fill="none"
                    stroke={STATUS_META[segment.key].color}
                    strokeWidth={focus === segment.key ? 26 : 22}
                    strokeDasharray={`${Math.max(segment.length - gap, 0.2)} 200`}
                    strokeDashoffset={-(segment.start + gap / 2)}
                    opacity={dim ? 0.35 : 1}
                    className={`transition-all duration-200 ${onSelect ? "cursor-pointer" : ""}`}
                    onMouseEnter={() => setActive(segment.key)}
                    onMouseLeave={() => setActive(null)}
                    onClick={onSelect ? () => onSelect(segment.key) : undefined}
                  >
                    <title>{`${label(segment.key)}: ${segment.value} (${pct(segment.value)}%)`}</title>
                  </path>
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
              {error ? (
                <p className="text-sm text-destructive">Couldn&apos;t load attendance</p>
              ) : !total ? (
                <p className="text-sm text-muted-foreground">No attendance yet</p>
              ) : focus ? (
                <>
                  <span className="text-[11px] font-medium text-muted-foreground">{label(focus)}</span>
                  <strong className="text-2xl font-semibold tabular-nums text-foreground">
                    {counts[focus]} <span className="text-base font-medium text-muted-foreground">({pct(counts[focus])}%)</span>
                  </strong>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-muted-foreground">Attended</span>
                  <strong className="text-2xl font-semibold tabular-nums text-foreground">
                    {attended} <span className="text-base font-medium text-muted-foreground">({pct(attended)}%)</span>
                  </strong>
                </>
              )}
            </div>
          </>
        )}
      </div>
      {footer && <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{footer}</div>}
    </section>
  );
}
