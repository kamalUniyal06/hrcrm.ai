import { useEffect, useMemo, useState } from "react";
import {
    Coffee,
    Fingerprint,
    LogOut,
    Play,
    TimerReset,
} from "lucide-react";

const SHIFT_DURATION_SECONDS = 9 * 60 * 60;

/**
 * API date format:
 * MM/DD/YYYY HH:mm:ss
 */
const parseApiDateTime = (value) => {
    if (!value) return null;

    const match = String(value)
        .trim()
        .match(
            /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/
        );

    if (!match) return null;

    const [
        ,
        month,
        day,
        year,
        hours = "00",
        minutes = "00",
        seconds = "00",
    ] = match;

    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds)
    );
};

/**
 * Format API time.
 *
 * Example:
 * 09/10/2026 07:27
 * -> 07:27 AM
 */
const formatTime = (value) => {
    if (!value) return "--";

    const date = parseApiDateTime(value);

    if (!date) return "--";

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

/**
 * Format seconds as HH:MM:SS.
 *
 * Example:
 * 6207 -> 01:43:27
 */
const formatDuration = (totalSeconds) => {
    const safeSeconds = Math.max(
        Math.floor(Number(totalSeconds) || 0),
        0
    );

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(
        minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

/**
 * Calculate actual worked duration from login -> logout.
 */
const getWorkedSeconds = (login, logout) => {
    const loginDate = parseApiDateTime(login);
    const logoutDate = parseApiDateTime(logout);

    if (!loginDate || !logoutDate) return 0;

    return Math.max(
        Math.floor(
            (logoutDate.getTime() - loginDate.getTime()) / 1000
        ),
        0
    );
};

export default function TodayPresentCard({
    record,
    actionLoading,
    handleTakeBreak,
    handleBackFromBreak,
    handleCheckOut,
}) {
    /**
     * User is currently on break when:
     *
     * lunch_in  exists
     * lunch_out does not exist
     */
    const isOnBreak =
        Boolean(record?.lunch_in) && !record?.lunch_out;

    /**
     * User has already completed their break when:
     *
     * lunch_in exists
     * lunch_out exists
     */
    const hasTakenBreak =
        Boolean(record?.lunch_in) &&
        Boolean(record?.lunch_out);

    /**
     * User has already checked out.
     */
    const isCheckedOut = Boolean(record?.logout);

    const [shiftSecondsLeft, setShiftSecondsLeft] = useState(
        SHIFT_DURATION_SECONDS
    );

    const [breakSeconds, setBreakSeconds] = useState(0);

    /**
     * ------------------------------------------------------------
     * 9 HOUR SHIFT COUNTDOWN
     * ------------------------------------------------------------
     *
     * Starts from the actual login time.
     */
    useEffect(() => {
        if (!record?.login || isCheckedOut) {
            return;
        }

        const updateShiftTimer = () => {
            const loginDate = parseApiDateTime(record.login);

            if (!loginDate) {
                setShiftSecondsLeft(
                    SHIFT_DURATION_SECONDS
                );
                return;
            }

            const elapsedSeconds = Math.floor(
                (Date.now() - loginDate.getTime()) / 1000
            );

            const remaining = Math.max(
                SHIFT_DURATION_SECONDS - elapsedSeconds,
                0
            );

            setShiftSecondsLeft(remaining);
        };

        updateShiftTimer();

        const interval = setInterval(
            updateShiftTimer,
            1000
        );

        return () => clearInterval(interval);
    }, [record?.login, isCheckedOut]);

    /**
     * ------------------------------------------------------------
     * BREAK TIMER
     * ------------------------------------------------------------
     *
     * Starts from lunch_in.
     *
     * If lunch_out exists, the break has ended.
     */
    useEffect(() => {
        if (
            !record?.lunch_in ||
            record?.lunch_out
        ) {
            setBreakSeconds(0);
            return;
        }

        const updateBreakTimer = () => {
            const lunchInDate = parseApiDateTime(
                record.lunch_in
            );

            if (!lunchInDate) {
                setBreakSeconds(0);
                return;
            }

            const elapsedSeconds = Math.floor(
                (Date.now() - lunchInDate.getTime()) / 1000
            );

            setBreakSeconds(
                Math.max(elapsedSeconds, 0)
            );
        };

        updateBreakTimer();

        const interval = setInterval(
            updateBreakTimer,
            1000
        );

        return () => clearInterval(interval);
    }, [
        record?.lunch_in,
        record?.lunch_out,
    ]);

    /**
     * ------------------------------------------------------------
     * WORKED TIME
     * ------------------------------------------------------------
     */
    const workedSeconds = useMemo(() => {
        if (!record?.login || !record?.logout) {
            return 0;
        }

        return getWorkedSeconds(
            record.login,
            record.logout
        );
    }, [
        record?.login,
        record?.logout,
    ]);

    const workedTime = formatDuration(
        workedSeconds
    );

    /**
     * ------------------------------------------------------------
     * SHIFT PROGRESS
     * ------------------------------------------------------------
     */
    const shiftProgress = useMemo(() => {
        if (isCheckedOut) {
            return 100;
        }

        const elapsed =
            SHIFT_DURATION_SECONDS -
            shiftSecondsLeft;

        return Math.min(
            Math.max(
                (elapsed /
                    SHIFT_DURATION_SECONDS) *
                100,
                0
            ),
            100
        );
    }, [
        shiftSecondsLeft,
        isCheckedOut,
    ]);

    const shiftTimeLeft = formatDuration(
        shiftSecondsLeft
    );

    const breakTime = formatDuration(
        breakSeconds
    );

    /**
     * ------------------------------------------------------------
     * RENDER
     * ------------------------------------------------------------
     */
    return (
        <section className="employee-card today-card box-border w-full max-w-full min-w-0 overflow-hidden">
            {/* HEADER */}

            <div className="card-title-row flex min-w-0 items-center justify-between gap-3">
                <h2 className="card-title truncate">
                    Today
                </h2>

                <span className="status-badge present shrink-0">
                    {isOnBreak
                        ? "On Break"
                        : isCheckedOut
                            ? "Completed"
                            : "Present"}
                </span>
            </div>

            <div className="divider" />

            {/* BODY */}

            <div className="today-card__body flex w-full max-w-full min-w-0 flex-col gap-6 overflow-hidden sm:flex-row sm:items-center sm:justify-between">
                {/* LEFT CONTENT */}

                <div className="min-w-0 flex-1 overflow-hidden">
                    {isOnBreak ? (
                        <>
                            <div className="mb-2 flex items-center gap-2">
                                <Coffee
                                    className="shrink-0 text-orange-500"
                                    size={27}
                                />

                                <span className="truncate text-sm font-medium">
                                    You're on a break
                                </span>
                            </div>

                            <p className="today-card__message">
                                Take your time. Your break is
                                being tracked.
                            </p>

                            <div className="mt-4 flex items-center gap-2">
                                <TimerReset
                                    size={18}
                                    className="shrink-0 text-orange-500"
                                />

                                <span className="text-2xl font-semibold tabular-nums">
                                    {breakTime}
                                </span>
                            </div>
                        </>
                    ) : isCheckedOut ? (
                        <>
                            <div className="mb-2 flex items-center gap-2">
                                <Fingerprint
                                    className="today-card__icon"
                                    size={27}
                                />

                                <span className="text-sm font-medium">
                                    Attendance completed
                                </span>
                            </div>

                            <p className="today-card__message">
                                You've worked for{" "}
                                <strong className="text-foreground">
                                    {workedTime}
                                </strong>{" "}
                                today. Great work!
                            </p>

                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span>
                                    Login:{" "}
                                    <strong className="text-foreground">
                                        {formatTime(
                                            record?.login
                                        )}
                                    </strong>
                                </span>

                                <span>
                                    Logout:{" "}
                                    <strong className="text-foreground">
                                        {formatTime(
                                            record?.logout
                                        )}
                                    </strong>
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <Fingerprint
                                className="today-card__icon"
                                size={27}
                            />

                            <p className="today-card__message">
                                You're marked present today.
                                Have a productive day!
                            </p>

                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span>
                                    Login:{" "}
                                    <strong className="text-foreground">
                                        {formatTime(
                                            record?.login
                                        )}
                                    </strong>
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* SHIFT / WORKED TIME RING */}

                <div className="flex w-full shrink-0 justify-center sm:w-auto mr-10">
                    <div className="shift-progress-ring">
                        <div
                            className="shift-progress-ring__track"
                            style={{
                                background: `conic-gradient(
                                    var(--primary) ${shiftProgress}%,
                                    var(--muted) ${shiftProgress}% 100%
                                )`,
                            }}
                        >
                            <div className="shift-progress-ring__inner">
                                <span className="shift-progress-ring__label">
                                    {isOnBreak
                                        ? "ON BREAK"
                                        : isCheckedOut
                                            ? "WORKED"
                                            : "SHIFT LEFT"}
                                </span>

                                <strong className="shift-progress-ring__time">
                                    {isOnBreak
                                        ? breakTime
                                        : isCheckedOut
                                            ? workedTime
                                            : shiftTimeLeft}
                                </strong>

                                <small className="shift-progress-ring__total">
                                    {isOnBreak
                                        ? "BREAK"
                                        : isCheckedOut
                                            ? "COMPLETED"
                                            : "9 HR SHIFT"}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS */}

            {!isCheckedOut && (
                <div
                    className={`mt-4 grid w-full min-w-0 gap-3 ${isOnBreak || !hasTakenBreak
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1"
                        }`}
                >
                    {/* BREAK / BACK */}

                    {isOnBreak ? (
                        <button
                            type="button"
                            disabled={
                                actionLoading === "back"
                            }
                            onClick={
                                handleBackFromBreak
                            }
                            className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {actionLoading === "back" ? (
                                <>
                                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Play
                                        size={17}
                                        className="shrink-0"
                                    />
                                    I'm Back From Break
                                </>
                            )}
                        </button>
                    ) : !hasTakenBreak ? (
                        <button
                            type="button"
                            disabled={
                                actionLoading === "break" ||
                                actionLoading === "checkout"
                            }
                            onClick={
                                handleTakeBreak
                            }
                            className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {actionLoading === "break" ? (
                                <>
                                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Starting Break...
                                </>
                            ) : (
                                <>
                                    <Coffee
                                        size={17}
                                        className="shrink-0"
                                    />
                                    Take a Break
                                </>
                            )}
                        </button>
                    ) : null}

                    {/* CHECK OUT */}

                    <button
                        type="button"
                        disabled={
                            isOnBreak ||
                            actionLoading === "checkout"
                        }
                        onClick={
                            handleCheckOut
                        }
                        className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                    >
                        {actionLoading ===
                            "checkout" ? (
                            <>
                                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Checking Out...
                            </>
                        ) : (
                            <>
                                <LogOut
                                    size={17}
                                    className="shrink-0"
                                />
                                Check Out
                            </>
                        )}
                    </button>
                </div>
            )}
        </section>
    );
}