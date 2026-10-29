import { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppointmentSlots } from "../../../queries/hr.queries";
import { formatDate, formatTime, groupSlots, weekRange } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";

/**
 * A week of open HR slots, grouped by day in the HR time zone. `value` is the picked slot's start.
 * `employeeId` is the person the booking is for, when HR books or moves it for them.
 */
export default function SlotPicker({ timeZone, hrEmployeeId, employeeId, mode, value, onChange }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const week = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + weekOffset * 7);
    return weekRange(date);
  }, [weekOffset]);
  const query = useAppointmentSlots({ from: week.from, to: week.to, hrEmployeeId, employeeId, mode });
  const days = useMemo(() => groupSlots(query.data, timeZone), [query.data, timeZone]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setWeekOffset(weekOffset - 1)} disabled={weekOffset <= 0} aria-label="Previous week" className={candidateStyles.iconButton}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold text-foreground" aria-live="polite">
          {formatDate(week.from, undefined, { day: "numeric", month: "short" })} – {formatDate(week.to, undefined, { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <button type="button" onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 8} aria-label="Next week" className={candidateStyles.iconButton}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {query.isPending ? (
        <Skeleton count={3} height={44} borderRadius={12} />
      ) : query.isError ? (
        <p role="alert" className="rounded-xl bg-muted px-3 py-4 text-center text-sm text-muted-foreground">{query.error?.message}</p>
      ) : days.length ? (
        <div className="space-y-4">
          {days.map(({ day, slots }) => (
            <fieldset key={day}>
              <legend className="text-xs font-semibold text-muted-foreground">{formatDate(day, undefined, { weekday: "long", day: "numeric", month: "short" })}</legend>
              <div className="mt-2 grid grid-cols-3 gap-2 min-[400px]:grid-cols-4 sm:grid-cols-6">
                {slots.map((slot) => (
                  <button
                    key={`${slot.start}:${slot.hrId}`}
                    type="button"
                    aria-pressed={value === slot.start}
                    onClick={() => onChange(slot)}
                    className={cn(
                      "min-h-11 rounded-lg border text-sm font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
                      value === slot.start ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary",
                    )}
                  >
                    {formatTime(slot.start, timeZone)}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-muted px-4 py-8 text-center">
          <CalendarX2 size={20} className="text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No open times this week. Try the next week.</p>
        </div>
      )}
      {timeZone && <p className="text-xs text-muted-foreground">Times are shown in {timeZone}.</p>}
    </div>
  );
}
