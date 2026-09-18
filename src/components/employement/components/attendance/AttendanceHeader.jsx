import React from "react";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    CalendarDays,
} from "lucide-react";

import { useAttendanceContext } from "../../context/AttendanceContext";

const AttendanceHeader = () => {
    const {
        currentDate,
        goToPreviousMonth,
        goToNextMonth,
        goToToday,
        openRequestModal,
    } = useAttendanceContext();

    const now = new Date();

    const currentMonthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    const selectedMonthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    );

    // Employee can only move backwards.
    // Next month is disabled when already on current month.
    const isCurrentMonth =
        selectedMonthStart.getTime() >= currentMonthStart.getTime();

    const monthName = currentDate.toLocaleString("en-US", {
        month: "long",
    });

    const year = currentDate.getFullYear();

    return (
        <div
            className="
                flex
                flex-col
                gap-3
                border-b
                border-[var(--border)]
                bg-[var(--card)]
                px-3
                py-3

                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:px-4
            "
        >
            {/* Left Section */}
            <div className="flex items-center gap-2">
                {/* Calendar / Month Navigation */}
                <div
                    className="
                        flex
                        h-10
                        overflow-hidden
                        rounded-lg
                        border
                        border-[var(--border)]
                        bg-[var(--card)]
                        shadow-sm
                    "
                >
                    {/* Previous */}
                    <button
                        type="button"
                        onClick={goToPreviousMonth}
                        className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            border-r
                            border-[var(--border)]
                            text-[var(--muted-foreground)]
                            transition-colors
                            hover:bg-[var(--muted)]
                            hover:text-[var(--foreground)]
                        "
                        title="Previous month"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {/* Month */}
                    <div
                        className="
                            flex
                            min-w-[145px]
                            items-center
                            justify-center
                            gap-2
                            px-3
                        "
                    >
                        <CalendarDays
                            size={16}
                            className="text-[var(--primary)]"
                        />

                        <div className="flex items-baseline gap-1.5">
                            <span
                                className="
                                    text-sm
                                    font-semibold
                                    text-[var(--foreground)]
                                "
                            >
                                {monthName}
                            </span>

                            <span
                                className="
                                    text-xs
                                    font-medium
                                    text-[var(--muted-foreground)]
                                "
                            >
                                {year}
                            </span>
                        </div>
                    </div>

                    {/* Next */}
                    <button
                        type="button"
                        onClick={goToNextMonth}
                        disabled={isCurrentMonth}
                        className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            border-l
                            border-[var(--border)]
                            transition-colors

                            ${isCurrentMonth
                                ? "cursor-not-allowed text-[var(--border)]"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                            }
                        `}
                        title={
                            isCurrentMonth
                                ? "You are already on the current month"
                                : "Next month"
                        }
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Today */}
                {!isCurrentMonth && (
                    <button
                        type="button"
                        onClick={goToToday}
                        className="
                            h-10
                            rounded-lg
                            border
                            border-[var(--border)]
                            bg-[var(--card)]
                            px-3
                            text-xs
                            font-semibold
                            text-[var(--muted-foreground)]
                            shadow-sm
                            transition-colors
                            hover:bg-[var(--muted)]
                            hover:text-[var(--foreground)]

                            sm:px-4
                            sm:text-sm
                        "
                    >
                        TODAY
                    </button>
                )}
            </div>


        </div>
    );
};

export default AttendanceHeader;