import { useMemo } from "react";
import he from "he";
import { ArrowRight, Flag, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePublicHolidays } from "../../queries/leaves.queries";
import { fortnightDays, nextHoliday, parseHolidayDate, todayInIndia } from "./leaveCalendarUtils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const longDate = (date) => date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

const whenLabel = (daysAway) => (daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`);

const dayDescription = (day) =>
    [longDate(day.date), day.isToday && "today", day.holiday ? `public holiday: ${day.holiday}` : day.isWeekend && "weekend"]
        .filter(Boolean)
        .join(", ");

const dayClasses = (day) =>
    cn(
        "flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-sm font-semibold tabular-nums",
        day.isToday
            ? "bg-white text-sidebar-primary shadow-sm"
            : day.holiday
                ? "bg-highlight text-highlight-foreground"
                : day.isWeekend
                    ? "bg-white/5 text-white/75"
                    : "bg-white/12 text-white",
        day.isPast && "opacity-45",
    );

/** Dark band at the top of the employee leave page: the main action plus this week and next. */
export default function LeaveHeader({ onApply, onOpenApprovals }) {
    const { data } = usePublicHolidays();
    const today = todayInIndia();

    const holidays = useMemo(
        () =>
            (Array.isArray(data?.records) ? data.records : [])
                .map((record) => ({
                    date: parseHolidayDate(record?.holiday_date),
                    name: he.decode(String(record?.name || "Public holiday")),
                }))
                .filter((holiday) => holiday.date),
        [data],
    );

    const days = fortnightDays(today, holidays);
    const upcoming = nextHoliday(today, holidays);

    return (
        <header className="@container overflow-hidden rounded-2xl bg-linear-to-r from-sidebar-primary to-sidebar-secondary p-5 text-white shadow-sm sm:p-7">
            <div className="flex flex-col gap-7 @3xl:flex-row @3xl:items-center @3xl:justify-between">
                {/* Gaps live on wrappers: LeaveManagement.css resets margins on headings and paragraphs. */}
                <div className="flex max-w-md flex-col gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">My leave</h1>
                    <p className="text-sm leading-6 text-white/75">
                        Check your balance, apply for time off, and track your requests.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap">
                        <button
                            type="button"
                            onClick={onApply}
                            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-highlight px-5 text-sm font-semibold text-highlight-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            Apply for leave
                            <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                        </button>
                        {onOpenApprovals && (
                            <button
                                type="button"
                                onClick={onOpenApprovals}
                                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                Open leave approvals
                            </button>
                        )}
                    </div>
                </div>

                <section aria-labelledby="leave-fortnight-title" className="w-full @3xl:max-w-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h2 id="leave-fortnight-title" className="text-sm font-semibold">This week and next</h2>
                        <p className="flex items-center gap-3 text-[11px] text-white/75">
                            <span className="inline-flex items-center gap-1"><Sun size={12} aria-hidden="true" />Weekend</span>
                            <span className="inline-flex items-center gap-1"><Flag size={12} aria-hidden="true" />Public holiday</span>
                        </p>
                    </div>

                    <div aria-hidden="true" className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-white/60">
                        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
                    </div>
                    <ol className="mt-1.5 grid grid-cols-7 gap-1.5">
                        {days.map((day) => (
                            <li key={day.key} title={day.holiday ?? undefined} aria-current={day.isToday ? "date" : undefined} className={dayClasses(day)}>
                                <span className="sr-only">{dayDescription(day)}</span>
                                <span aria-hidden="true">{day.date.getDate()}</span>
                                {day.holiday ? <Flag size={11} aria-hidden="true" /> : day.isWeekend ? <Sun size={11} aria-hidden="true" /> : null}
                            </li>
                        ))}
                    </ol>

                    {upcoming && (
                        <p className="pt-3 text-xs leading-5 text-white/75">
                            Next public holiday {whenLabel(upcoming.daysAway)}:{" "}
                            <span className="font-semibold text-white">{upcoming.name}</span>, {longDate(upcoming.date)}
                        </p>
                    )}
                </section>
            </div>
        </header>
    );
}
