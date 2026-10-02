import Icon from "../../../ui/Icon/Icon";

const timeToMinutes = (time) => {
    const match = String(time || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + Number(match[2]);
};

const isLoginLate = (loginTime, lateAfterMinutes) => {
    if (!loginTime) return false;
    const loginMinutes = timeToMinutes(loginTime);
    return loginMinutes !== null && loginMinutes > lateAfterMinutes;
};

const AttendanceDayCell = ({
    day,
    date,
    isCurrentMonth,
    isToday,
    attendance,
    isWeekend = false,
    holidayName,
    lateAfterMinutes = 600,
    onClick,
}) => {
    const isLate = isLoginLate(attendance?.login, lateAfterMinutes);

    if (!isCurrentMonth) {
        return (
            <div
                aria-hidden="true"
                className="min-h-[110px] border-b border-r border-[var(--border)] bg-[var(--muted)]/35 sm:min-h-[125px]"
            />
        );
    }

    const dayType = holidayName
        ? { label: holidayName, shortLabel: "Public holiday", icon: "IoSparklesOutline" }
        : isWeekend
            ? { label: "Weekend", shortLabel: "Weekend", icon: "IoCafeOutline" }
            : null;

    return (
        <div
            onClick={() => onClick?.(date)}
            className={`
                relative
                min-w-0
                min-h-[110px]
                overflow-hidden
                border-r
                border-b
                border-[var(--border)]
                p-1.5
                transition-all
                duration-150

                sm:min-h-[125px]
                sm:p-2

                ${isToday
                    ? "bg-[var(--accent)]/10 ring-1 ring-inset ring-[var(--primary)]"
                    : dayType
                        ? "bg-[var(--muted)]/45"
                        : "bg-[var(--card)]"
                }

                ${onClick
                    ? "cursor-pointer hover:bg-[var(--primary)]/5"
                    : ""
                }

                ${!isCurrentMonth
                    ? "bg-[var(--muted)] opacity-60"
                    : ""
                }
            `}
        >
            {/* Date */}
            <div className="flex justify-end">
                <div
                    className={`
                        flex
                        h-6
                        min-w-6
                        items-center
                        justify-center
                        rounded-full
                        text-[10px]
                        font-medium
                        text-[var(--muted-foreground)]
                        transition-colors

                        sm:h-7
                        sm:min-w-7
                        sm:text-xs

                        ${isToday
                            ? `
                                bg-[var(--primary)]
                                px-1.5
                                font-bold
                                text-[var(--primary-foreground)]
                                shadow-sm
                            `
                            : ""
                        }
                    `}
                >
                    {day}
                </div>
            </div>

            {dayType && !attendance && (
                <div className="mt-2 flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[var(--border)] bg-[var(--card)]/65 px-1.5 py-2 text-center sm:min-h-[62px]">
                    <Icon
                        name={dayType.icon}
                        library="io5"
                        size={14}
                        className={holidayName ? "text-emerald-600" : "text-amber-600"}
                    />
                    <span className="text-[9px] font-semibold leading-tight text-[var(--foreground)] sm:text-[10px]">
                        {dayType.shortLabel}
                    </span>
                    {holidayName && (
                        <span className="line-clamp-2 text-[8px] leading-tight text-[var(--muted-foreground)] sm:text-[9px]" title={dayType.label}>
                            {dayType.label}
                        </span>
                    )}
                </div>
            )}

            {isCurrentMonth && attendance && (
                <div className="mt-1 space-y-1 sm:mt-2">
                    {/* Login */}
                    {attendance.login && (
                        <div
                            className="
                                flex
                                min-h-[30px]
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-sm
                                bg-[var(--muted)]
                                px-1
                                text-[9px]
                                font-semibold
                                text-[var(--foreground)]

                                sm:min-h-[40px]
                                sm:text-[10px]

                                md:text-xs
                            "
                        >
                            <span>{attendance.login}</span>

                            {isLate && (
                                <span
                                    className="ml-1 rounded bg-[var(--chart-4)] px-1 py-0.5 text-[8px] text-[var(--foreground)] sm:text-[9px]"
                                    title="Logged in after the configured login grace period"
                                >
                                    Late
                                </span>
                            )}
                        </div>
                    )}

                    {/* Logout */}
                    {attendance.logout && (
                        <div
                            className="
                                flex
                                min-h-[23px]
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-sm
                                bg-[var(--muted)]
                                px-1
                                text-[9px]
                                font-semibold
                                text-[var(--foreground)]

                                sm:min-h-[26px]
                                sm:text-[10px]

                                md:text-xs
                            "
                        >
                            {attendance.logout}
                        </div>
                    )}

                    {/* Lunch */}
                    {attendance.lunch_in && (
                            <div
                                className="
                                    flex
                                    min-h-[23px]
                                    items-center
                                    justify-center
                                    gap-0.5
                                    overflow-hidden
                                    rounded-sm
                                    bg-[var(--accent)]
                                    px-1
                                    text-[8px]
                                    font-semibold
                                    text-[var(--accent-foreground)]

                                    sm:min-h-[26px]
                                    sm:text-[10px]
                                "
                            >
                                <Icon
                                    name="IoFastFood"
                                    library="io5"
                                    size={10}
                                    className="
                                        shrink-0
                                        text-[var(--accent-foreground)]
                                    "
                                />

                                <span className="truncate">
                                    {attendance.lunch_in}
                                    {attendance.lunch_out
                                        ? ` - ${attendance.lunch_out}`
                                        : ""}
                                </span>
                            </div>
                        )}
                </div>
            )}
        </div>
    );
};

export default AttendanceDayCell;
