import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import Icon from "../../../ui/Icon/Icon";
import AttendanceHeader from "./AttendanceHeader";
import AttendanceDayCell from "./AttendanceDayCell";

import { useAttendanceContext } from "../../context/AttendanceContext";
import { useAttendanceCalendar } from "../../hooks/useAttendance";

const MotionButton = motion.button;
const MotionAside = motion.aside;

const WEEK_DAYS = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
];

const getCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);

    const startDay =
        firstDay.getDay() === 0
            ? 6
            : firstDay.getDay() - 1;

    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();

    const previousMonthDays = new Date(
        year,
        month,
        0
    ).getDate();

    const days = [];

    // Previous month
    for (let i = startDay - 1; i >= 0; i--) {
        const day = previousMonthDays - i;

        days.push({
            day,
            date: new Date(
                year,
                month - 1,
                day
            ),
            isCurrentMonth: false,
        });
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
        days.push({
            day,
            date: new Date(
                year,
                month,
                day
            ),
            isCurrentMonth: true,
        });
    }

    // Next month
    let nextDay = 1;

    while (days.length < 42) {
        days.push({
            day: nextDay,
            date: new Date(
                year,
                month + 1,
                nextDay
            ),
            isCurrentMonth: false,
        });

        nextDay++;
    }

    return days;
};

const formatDate = (date) => {
    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

/**
 * Convert:
 *
 * "09/18/2026 12:29"
 *
 * to:
 *
 * "2026-09-18"
 */
const getDateKey = (value) => {
    if (!value) {
        return null;
    }

    const [datePart] = value.split(" ");

    if (!datePart) {
        return null;
    }

    const [month, day, year] =
        datePart.split("/");

    if (!month || !day || !year) {
        return null;
    }

    return `${year}-${month.padStart(
        2,
        "0"
    )}-${day.padStart(2, "0")}`;
};

/**
 * Convert:
 *
 * "09/18/2026 12:29"
 *
 * to:
 *
 * "12:29 PM"
 */
const formatTime = (value) => {
    if (!value) {
        return "";
    }

    const parts = value.split(" ");

    if (parts.length < 2) {
        return "";
    }

    const time = parts[1];

    const [hours, minutes] =
        time.split(":");

    if (!hours || !minutes) {
        return "";
    }

    const hour = Number(hours);

    if (Number.isNaN(hour)) {
        return "";
    }

    const suffix =
        hour >= 12 ? "PM" : "AM";

    const displayHour =
        hour % 12 || 12;

    return `${String(displayHour).padStart(
        2,
        "0"
    )}:${minutes} ${suffix}`;
};

const isLoginLate = (loginTime) => {
    if (!loginTime) return false;

    const match = loginTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) return false;

    const [, hours, minutes, period] = match;
    let hour = Number(hours) % 12;

    if (period.toUpperCase() === "PM") hour += 12;

    return hour > 10 || (hour === 10 && Number(minutes) > 0);
};

const timeToMinutes = (time) => {
    if (!time) return null;

    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;

    const [, hours, minutes, period] = match;
    let hour = Number(hours) % 12;
    if (period.toUpperCase() === "PM") hour += 12;

    return hour * 60 + Number(minutes);
};

const getCurrentIndiaMinutes = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());

    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);

    return Number.isFinite(hour) && Number.isFinite(minute)
        ? hour * 60 + minute
        : 0;
};

const dateKeyInIndia = (value) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(value);

const getDurationToMinute = (start, endMinutes) => {
    const startMinutes = timeToMinutes(start);
    if (startMinutes === null || endMinutes === null) return null;

    const adjustedEnd = endMinutes < startMinutes
        ? endMinutes + 24 * 60
        : endMinutes;

    return adjustedEnd - startMinutes;
};

const getDuration = (start, end) => {
    const startMinutes = timeToMinutes(start);
    let endMinutes = timeToMinutes(end);

    if (startMinutes === null || endMinutes === null) return null;
    if (endMinutes < startMinutes) endMinutes += 24 * 60;

    return endMinutes - startMinutes;
};

const formatMinutes = (minutes) => {
    if (minutes === null || minutes < 0) return "Not available";

    const totalMinutes = Math.floor(minutes);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const remainder = totalMinutes % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${String(remainder).padStart(2, "0")}m`;
    }

    if (hours > 0) {
        return `${hours}h ${String(remainder).padStart(2, "0")}m`;
    }

    return `${remainder}m`;
};

const transformAttendanceRecords = (
    response
) => {
    const records =
        response?.data?.records ||
        response?.records ||
        [];

    if (!Array.isArray(records)) {
        return {};
    }

    return records.reduce(
        (accumulator, record) => {
            /*
             * Prefer login date because that is
             * the actual attendance date.
             *
             * If login is empty, fall back to
             * date_entered.
             */
            const dateKey =
                getDateKey(
                    record.login ||
                    record.date_entered
                );

            if (!dateKey) {
                return accumulator;
            }

            accumulator[dateKey] = {
                id: record.id,

                login: formatTime(
                    record.login
                ),

                logout: formatTime(
                    record.logout
                ),

                lunch_in: formatTime(
                    record.lunch_in
                ),

                lunch_out: formatTime(
                    record.lunch_out
                ),

                // Keep original values too
                raw: record,
            };

            return accumulator;
        },
        {}
    );
};

const EmployeeAttendanceCalendar = ({
    email,
}) => {
    const {
        currentDate,
        selectedDate,
        selectDate,
    } = useAttendanceContext();

    const month = useMemo(() => {
        return `${currentDate.getFullYear()}-${String(
            currentDate.getMonth() + 1
        ).padStart(2, "0")}`;
    }, [currentDate]);

    const {
        data,
        isLoading,
        isFetching,
        isError,
    } = useAttendanceCalendar({
        email,
        month,
    });

    const calendarDays = useMemo(
        () =>
            getCalendarDays(
                currentDate
            ),
        [currentDate]
    );

    /*
     * API records -> date keyed object
     *
     * {
     *   "2026-09-18": {
     *      login: "12:29 PM",
     *      logout: "",
     *      lunch_in: "",
     *      lunch_out: ""
     *   }
     * }
     */
    const attendanceMap = useMemo(
        () =>
            transformAttendanceRecords(
                data
            ),
        [data]
    );

    const today = new Date();

    const selectedAttendance = selectedDate
        ? attendanceMap[formatDate(selectedDate)]
        : null;

    useEffect(() => {
        if (!selectedDate) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") selectDate(null);
        };

        document.addEventListener("keydown", handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [selectedDate, selectDate]);

    return (
        <>
            <div
                className="
                w-full
                min-w-0
                overflow-hidden
                rounded-lg
                border
                border-[var(--border)]
                bg-[var(--card)]
                shadow-sm
            "
            >
                <AttendanceHeader />

                <div className="relative w-full">
                    {/* Fetching indicator */}
                    {isFetching &&
                        !isLoading && (
                            <div
                                className="
                                absolute
                                right-3
                                top-3
                                z-20
                            "
                            >
                                <div
                                    className="
                                    h-4
                                    w-4
                                    animate-spin
                                    rounded-full
                                    border-2
                                    border-[var(--border)]
                                    border-t-[var(--primary)]
                                "
                                />
                            </div>
                        )}

                    {/* Error */}
                    {isError ? (
                        <div
                            className="
                            flex
                            min-h-[300px]
                            items-center
                            justify-center
                            px-4
                            text-center
                            text-sm
                            text-[var(--muted-foreground)]
                        "
                        >
                            Unable to load
                            attendance data.
                        </div>
                    ) : (
                        <div
                            className="
                            w-full
                            overflow-x-auto
                            overflow-y-hidden
                            scrollbar-hide
                        "
                        >
                            <div
                                className="
                                min-w-[700px]
                                sm:min-w-[760px]
                                md:min-w-0
                            "
                            >
                                {/* Week Header */}
                                <div
                                    className="
                                    grid
                                    grid-cols-7
                                    border-b
                                    border-[var(--border)]
                                    bg-[var(--muted)]
                                "
                                >
                                    {WEEK_DAYS.map(
                                        (day) => (
                                            <div
                                                key={day}
                                                className="
                                                min-w-0
                                                border-r
                                                border-[var(--border)]
                                                px-2
                                                py-2
                                                text-center
                                                text-[11px]
                                                font-semibold
                                                text-[var(--muted-foreground)]
                                                last:border-r-0

                                                sm:px-3
                                                sm:py-2.5
                                                sm:text-xs
                                            "
                                            >
                                                {day}
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Calendar */}
                                {isLoading ? (
                                    <CalendarSkeleton />
                                ) : (
                                    <div className="grid grid-cols-7">
                                        {calendarDays.map(
                                            ({
                                                day,
                                                date,
                                                isCurrentMonth,
                                            }) => {
                                                const dateKey =
                                                    formatDate(
                                                        date
                                                    );

                                                const attendance =
                                                    attendanceMap[
                                                    dateKey
                                                    ];

                                                const isToday =
                                                    date.toDateString() ===
                                                    today.toDateString();

                                                return (
                                                    <AttendanceDayCell
                                                        key={
                                                            dateKey
                                                        }
                                                        day={
                                                            day
                                                        }
                                                        date={
                                                            date
                                                        }
                                                        isCurrentMonth={
                                                            isCurrentMonth
                                                        }
                                                        isToday={
                                                            isToday
                                                        }
                                                        attendance={
                                                            attendance
                                                        }
                                                        onClick={
                                                            isCurrentMonth
                                                                ? (
                                                                    selectedDate
                                                                ) =>
                                                                    selectDate(
                                                                        selectedDate
                                                                    )
                                                                : undefined
                                                        }
                                                    />
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedDate && (
                    <AttendanceDayDrawer
                        date={selectedDate}
                        attendance={selectedAttendance}
                        email={email}
                        onClose={() => selectDate(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

const AttendanceDayDrawer = ({ date, attendance, email, onClose }) => {
    const [currentMinutes, setCurrentMinutes] = useState(getCurrentIndiaMinutes);

    useEffect(() => {
        const interval = window.setInterval(
            () => setCurrentMinutes(getCurrentIndiaMinutes()),
            30_000
        );

        return () => window.clearInterval(interval);
    }, []);

    const isToday = dateKeyInIndia(date) === dateKeyInIndia(new Date());
    const late = isLoginLate(attendance?.login);
    const totalMinutes = attendance?.logout
        ? getDuration(attendance?.login, attendance.logout)
        : isToday
            ? getDurationToMinute(attendance?.login, currentMinutes)
            : null;
    const breakMinutes = attendance?.lunch_out
        ? getDuration(attendance?.lunch_in, attendance.lunch_out)
        : isToday && attendance?.lunch_in
            ? getDurationToMinute(attendance.lunch_in, currentMinutes)
            : null;
    const effectiveMinutes = totalMinutes === null
        ? null
        : Math.max(totalMinutes, 0);
    const targetMinutes = 9 * 60;
    const progress = effectiveMinutes === null
        ? 0
        : Math.min(Math.round((effectiveMinutes / targetMinutes) * 100), 100);
    const loginMinutes = timeToMinutes(attendance?.login);
    const lateMinutes = loginMinutes === null
        ? 0
        : Math.max(loginMinutes - 10 * 60, 0);
    const activities = [
        ["Login", attendance?.login, "IoLogInOutline"],
        ["Lunch started", attendance?.lunch_in, "IoFastFoodOutline"],
        ["Lunch ended", attendance?.lunch_out, "IoCafeOutline"],
        ["Logout", attendance?.logout, "IoLogOutOutline"],
    ];

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="attendance-drawer-title">
            <MotionButton
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                type="button"
                className="fixed inset-0 z-[9998] cursor-default bg-black/50 backdrop-blur-[2px]"
                onClick={onClose}
                aria-label="Close attendance details"
            />

            <MotionAside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="fixed right-0 top-0 z-[9999] flex h-screen w-[min(420px,100vw)] max-w-[420px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-2xl"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--primary-foreground)] shadow-md"
                            style={{ background: "linear-gradient(135deg, var(--topbtn-primary), var(--topbtn-secondary))" }}
                        >
                            <Icon name="IoCalendarOutline" library="io5" size={19} />
                        </div>
                        <div className="min-w-0">
                            <h2 id="attendance-drawer-title" className="text-base font-semibold">Daily attendance report</h2>
                            <p className="truncate text-xs text-[var(--muted-foreground)]">
                                {date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                        aria-label="Close attendance details"
                    >
                        <Icon name="IoClose" library="io5" size={19} />
                    </button>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto">
                    <section className="border-b border-[var(--border)] p-5">
                        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 pt-16 shadow-sm">
                            <div
                                className="absolute inset-x-0 top-0 h-20"
                                style={{ background: "linear-gradient(135deg, var(--topbtn-primary), var(--topbtn-secondary))" }}
                            />
                            <div className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs text-[var(--muted-foreground)]">Employee</p>
                                        <p className="mt-0.5 truncate text-sm font-semibold">{email || "Current user"}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${late ? "bg-[var(--chart-4)] text-[var(--foreground)]" : "bg-[var(--accent)] text-[var(--accent-foreground)]"}`}>
                                        {late ? `${formatMinutes(lateMinutes)} late` : attendance ? "On time" : "No record"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {!attendance ? (
                        <section className="p-5">
                            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
                                <Icon name="IoCalendarClearOutline" library="io5" size={30} className="mx-auto mb-3 text-[var(--muted-foreground)]" />
                                <p className="text-sm font-semibold">No activity recorded</p>
                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">There is no attendance report for this day.</p>
                            </div>
                        </section>
                    ) : (
                        <>
                            <section className="border-b border-[var(--border)] p-5">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold">Day report</h3>
                                    <p className="text-xs text-[var(--muted-foreground)]">Summary against a 9-hour work target</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <ReportMetric icon="IoTimeOutline" label="Effective time" value={formatMinutes(effectiveMinutes)} />
                                    <ReportMetric icon="IoCafeOutline" label="Break time" value={formatMinutes(breakMinutes)} />
                                </div>
                                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                                    <div className="mb-2 flex items-center justify-between text-xs">
                                        <span className="font-medium">Daily target</span>
                                        <span className="font-semibold text-[var(--primary)]">{progress}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                                        <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">{formatMinutes(effectiveMinutes)} of 9h 00m</p>
                                </div>
                            </section>

                            <section className="p-5">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold">Activity timeline</h3>
                                    <p className="text-xs text-[var(--muted-foreground)]">Recorded events for this day</p>
                                </div>
                                <div className="space-y-2">
                                    {activities.map(([label, value, icon]) => (
                                        <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 transition hover:bg-[var(--accent)]">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)]">
                                                <Icon name={icon} library="io5" size={16} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-medium">{label}</span>
                                                <span className="block text-xs text-[var(--muted-foreground)]">{value ? "Recorded" : "No activity"}</span>
                                            </span>
                                            <span className="text-sm font-semibold">{value || "—"}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </MotionAside>
        </div>
    );
};

const ReportMetric = ({ icon, label, value }) => (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)]">
            <Icon name={icon} library="io5" size={17} />
        </span>
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
);

const CalendarSkeleton = () => {
    return (
        <div className="grid grid-cols-7">
            {Array.from({
                length: 42,
            }).map((_, index) => (
                <div
                    key={index}
                    className="
                        aspect-square
                        border-r
                        border-b
                        border-[var(--border)]
                        bg-[var(--card)]
                        p-2

                        sm:p-2.5
                    "
                >
                    <div
                        className="
                            mb-3
                            ml-auto
                            h-3
                            w-5
                            animate-pulse
                            rounded
                            bg-[var(--muted)]
                        "
                    />

                    <div className="space-y-2">
                        <div
                            className="
                                h-7
                                animate-pulse
                                rounded
                                bg-[var(--muted)]
                            "
                        />

                        <div
                            className="
                                h-7
                                animate-pulse
                                rounded
                                bg-[var(--muted)]
                            "
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EmployeeAttendanceCalendar;
