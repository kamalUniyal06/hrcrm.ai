import { useEffect, useId, useState } from "react";
import { CalendarClock, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import morningScene from "../../../../assets/attendance/workday-morning.png";
import afternoonScene from "../../../../assets/attendance/workday-afternoon.png";
import eveningScene from "../../../../assets/attendance/workday-evening.png";
import { dayPeriod } from "./homeDashboardUtils";

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

// Artwork for each part of the day; `position` keeps the sun (or sunset) in the cropped banner.
const SCENES = {
  morning: { src: morningScene, greeting: "Good morning", position: "78% 45%" },
  afternoon: { src: afternoonScene, greeting: "Good afternoon", position: "62% 30%" },
  evening: { src: eveningScene, greeting: "Good evening", position: "30% 50%" },
};

/** The current part of the day, rechecked every minute so the artwork changes on its own. */
function useDayPeriod() {
  const [period, setPeriod] = useState(() => dayPeriod());
  useEffect(() => {
    const timer = setInterval(() => setPeriod(dayPeriod()), 60000);
    return () => clearInterval(timer);
  }, []);
  return period;
}

/**
 * Highlighted frame shared by every state of the daily check-in widget. It is the
 * first thing on the home page, so it stands out from the plain cards around it:
 * a morning, afternoon or evening scene with a greeting heads the card.
 * `attention` strengthens the outline while the employee still has to clock in.
 * `badge` (e.g. location) and `status` (present, not checked in…) sit together with the shift hours.
 */
export default function CheckInShell({ status, shift, badge, attention = false, children }) {
  const titleId = useId();
  const scene = SCENES[useDayPeriod()];
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-card shadow-sm ring-4 transition-shadow focus-within:ring-primary/30",
        attention ? "border-primary ring-primary/20" : "border-primary/40 ring-primary/10",
      )}
    >
      <div className="relative h-32 overflow-hidden">
        <img src={scene.src} alt="" aria-hidden="true" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: scene.position }} />
        {/* Darkens the bottom so the white text stays readable on every scene. */}
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/65 via-black/20 to-black/5" />
        <div className="relative flex h-full flex-col justify-between p-3.5">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <CalendarClock size={14} className="shrink-0" aria-hidden="true" />
              <span className="truncate">Daily Check In</span>
            </h2>
          </div>
        </div>
      </div>

      <div className="p-4">
        {(shift || badge || status) && (
          <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
            {shift && (
              <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-muted-foreground">
                <Clock3 size={13} aria-hidden="true" />
                {shift}
              </span>
            )}
            {/* Present / absent sits right beside where they logged in from. */}
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {badge}
              {status}
            </span>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export const Spinner = () => <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />;
