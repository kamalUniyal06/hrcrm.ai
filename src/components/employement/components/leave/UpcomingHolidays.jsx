import { AlertCircle, CalendarDays, LoaderCircle } from "lucide-react";
import he from "he";
import { useEffect, useMemo, useRef } from "react";
import { usePublicHolidays } from "../../queries/leaves.queries";

const parseHolidayDate = (value) => {
    const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    // The holidays API returns MM/DD/YYYY, for example 11/24/2026.
    const [, monthValue, dayValue, yearValue] = match;
    const month = Number(monthValue);
    const day = Number(dayValue);
    const year = Number(yearValue);

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const date = new Date(year, month - 1, day);

    // Date normalizes invalid values (such as month 24) into another year.
    // Compare every part so invalid API dates are rejected instead.
    if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
};

const monthKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const currentMonthKey = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    return `${year}-${month}`;
};

export default function UpcomingHolidays() {
    const { data, error, isLoading } = usePublicHolidays({});
    const scrollRef = useRef(null);
    const monthRefs = useRef(new Map());
    const activeMonthKey = currentMonthKey();

    const groupedHolidays = useMemo(() => {
        const records = Array.isArray(data?.records)
            ? data.records
            : [];

        const holidays = records
            .map((record) => ({
                ...record,
                date: parseHolidayDate(record?.holiday_date),
                displayName: he.decode(record?.name),
            }))
            .filter((holiday) => holiday.date)
            .sort((first, second) => first.date - second.date);

        return holidays.reduce((groups, holiday) => {
            const key = monthKey(holiday.date);
            const existing = groups.find((group) => group.key === key);

            if (existing) {
                existing.holidays.push(holiday);
            } else {
                groups.push({
                    key,
                    label: holiday.date.toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                    }),
                    holidays: [holiday],
                });
            }

            return groups;
        }, []);
    }, [data]);

    useEffect(() => {
        if (!groupedHolidays.length || !scrollRef.current) return;

        const initialGroup = groupedHolidays.find((group) => group.key === activeMonthKey)
            ?? groupedHolidays.find((group) => group.key > activeMonthKey)
            ?? groupedHolidays.at(-1);
        const target = monthRefs.current.get(initialGroup?.key);

        if (target) {
            scrollRef.current.scrollTop = Math.max(target.offsetTop - scrollRef.current.offsetTop, 0);
        }
    }, [activeMonthKey, groupedHolidays]);

    return (
        <aside className="holiday-card">
            <div className="holiday-title">
                <CalendarDays size={19} />
                <div>
                    <span className="eyebrow">CALENDAR</span>
                    <h2>Public Holidays</h2>
                </div>
            </div>

            <div
                ref={scrollRef}
                style={{ display: "block" }}
                className="max-h-[430px] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
            >
                {isLoading ? (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle size={18} className="animate-spin" />
                        Loading holidays...
                    </div>
                ) : error ? (
                    <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-destructive">
                        <AlertCircle size={22} />
                        Could not load public holidays.
                    </div>
                ) : groupedHolidays.length === 0 ? (
                    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                        No holidays are available.
                    </div>
                ) : (
                    groupedHolidays.map((group) => (
                        <section
                            key={group.key}
                            ref={(element) => {
                                if (element) monthRefs.current.set(group.key, element);
                                else monthRefs.current.delete(group.key);
                            }}
                            className="scroll-mt-0"
                        >
                            <div className={`sticky top-0 z-10 border-y px-2 py-2 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-sm ${group.key === activeMonthKey
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-[var(--leave-surface)]/95 text-primary"
                                }`}>
                                {group.label}
                            </div>

                            {group.holidays.map((holiday) => (
                                <div className="holiday-row" key={holiday.id || `${holiday.holiday_date}-${holiday.displayName}`}>
                                    <div>
                                        <strong>
                                            {holiday.date.toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </strong>
                                        <span>
                                            {holiday.date.toLocaleDateString("en-IN", { weekday: "long" })}
                                        </span>
                                    </div>
                                    <b>{holiday.displayName}</b>
                                </div>
                            ))}
                        </section>
                    ))
                )}
            </div>
        </aside>
    );
}
