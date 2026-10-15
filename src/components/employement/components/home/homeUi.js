import { timeToMinutes } from "../../attendanceLimits";
import { formatClock } from "./homeDashboardUtils";

export const SHIFT_MINUTES = 9 * 60;

export const todayLabel = () =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

export const shiftWindow = (actualLoginTime) => {
  const start = timeToMinutes(actualLoginTime);
  return start === null ? null : `${formatClock(start)} – ${formatClock(start + SHIFT_MINUTES)}`;
};

export const actionButton = {
  primary: "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55",
  lunch: "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--employee-orange)]/30 bg-[var(--employee-break-soft)] px-4 text-sm font-semibold text-[var(--employee-break-foreground)] transition hover:border-[var(--employee-orange)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55",
  danger: "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-card px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55",
};

export const headerAction =
  "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/30 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
