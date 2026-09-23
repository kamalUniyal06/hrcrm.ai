import Icon from "../../../ui/Icon/Icon";

const isLoginLate = (loginTime) => {
    if (!loginTime) return false;

    const match = loginTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) return false;

    const [, hours, minutes, period] = match;
    let hour = Number(hours) % 12;

    if (period.toUpperCase() === "PM") hour += 12;

    return hour > 10 || (hour === 10 && Number(minutes) > 0);
};

const AttendanceDayCell = ({
    day,
    date,
    isCurrentMonth,
    isToday,
    attendance,
    onClick,
}) => {
    const isLate = isLoginLate(attendance?.login);

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
                                    title="Logged in after 10:00 AM"
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
