import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
    AlertCircle,
    Coffee,
    Fingerprint,
    LogOut,
    MessageSquareText,
    Play,
    TimerReset,
    Users,
    X,
} from "lucide-react";

const SHIFT_DURATION_SECONDS = 9 * 60 * 60;
const BREAK_DURATION_SECONDS = 40 * 60;

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
    loginStartedAt,
    actionLoading,
    handleTakeBreak,
    handleBackFromBreak,
    handleCheckOut,
}) {
    const [breakStartedAt, setBreakStartedAt] = useState(null);

    /**
     * User is currently on break when:
     *
     * lunch_in  exists
     * lunch_out does not exist
     */
    const isOnBreak =
        !record?.lunch_out &&
        (Boolean(record?.lunch_in) || Boolean(breakStartedAt));

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

    const [shiftElapsedSeconds, setShiftElapsedSeconds] = useState(0);

    const [breakSeconds, setBreakSeconds] = useState(0);
    const [isBreakConfirmOpen, setIsBreakConfirmOpen] = useState(false);
    const [isExitMeetingOpen, setIsExitMeetingOpen] = useState(false);
    const [meetingHeld, setMeetingHeld] = useState("");
    const [conductedBy, setConductedBy] = useState("");
    const [remarks, setRemarks] = useState("");
    const [exitMeetingError, setExitMeetingError] = useState("");

    const resetExitMeetingForm = () => {
        setMeetingHeld("");
        setConductedBy("");
        setRemarks("");
        setExitMeetingError("");
    };

    const handleExitMeetingOpenChange = (open) => {
        if (actionLoading === "checkout") return;

        setIsExitMeetingOpen(open);
        if (!open) resetExitMeetingForm();
    };

    const selectMeetingStatus = (status) => {
        setMeetingHeld(status);
        setExitMeetingError(
            status === "no"
                ? "The exit meeting must be completed before you can log out."
                : ""
        );

        if (status === "no") {
            setConductedBy("");
            setRemarks("");
        }
    };

    const submitExitMeeting = (event) => {
        event.preventDefault();

        if (meetingHeld !== "yes") {
            setExitMeetingError(
                "The exit meeting must be completed before you can log out."
            );
            return;
        }

        if (!conductedBy || !remarks.trim()) {
            setExitMeetingError(
                "Select who conducted the meeting and add the meeting remarks."
            );
            return;
        }

        setExitMeetingError("");
        handleCheckOut({
            exitMeetingHeld: true,
            exitMeetingConductedBy: conductedBy,
            exitMeetingRemarks: remarks.trim(),
        });
    };

    useEffect(() => {
        if (isCheckedOut) {
            setIsExitMeetingOpen(false);
            setMeetingHeld("");
            setConductedBy("");
            setRemarks("");
            setExitMeetingError("");
        }
    }, [isCheckedOut]);

    useEffect(() => {
        if (isOnBreak) {
            setIsBreakConfirmOpen(false);
        }
    }, [isOnBreak]);

    const handleBreakConfirmOpenChange = (open) => {
        if (actionLoading === "break") return;
        setIsBreakConfirmOpen(open);
    };

    const confirmTakeBreak = async () => {
        const startedAt = Date.now();

        setBreakStartedAt(startedAt);
        setBreakSeconds(0);
        setIsBreakConfirmOpen(false);

        try {
            await handleTakeBreak();
        } catch {
            // Roll back the optimistic timer when starting the break fails.
            setBreakStartedAt(null);
            setBreakSeconds(0);
        }
    };

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
            const loginDate = loginStartedAt
                ? new Date(loginStartedAt)
                : parseApiDateTime(record.login);

            if (!loginDate) {
                setShiftElapsedSeconds(0);
                return;
            }

            const elapsedSeconds = Math.floor(
                (Date.now() - loginDate.getTime()) / 1000
            );

            setShiftElapsedSeconds(Math.max(elapsedSeconds, 0));

        };

        updateShiftTimer();

        const interval = setInterval(
            updateShiftTimer,
            1000
        );

        return () => clearInterval(interval);
    }, [record?.login, loginStartedAt, isCheckedOut]);

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
        if (record?.lunch_out) {
            setBreakStartedAt(null);
            setBreakSeconds(0);
            return;
        }

        const apiLunchIn = parseApiDateTime(record?.lunch_in);
        const timerStartedAt = breakStartedAt ?? apiLunchIn?.getTime();

        if (!timerStartedAt) {
            setBreakSeconds(0);
            return;
        }

        const updateBreakTimer = () => {
            const elapsedSeconds = Math.floor(
                (Date.now() - timerStartedAt) / 1000
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
        breakStartedAt,
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

    const shiftOvertimeSeconds = Math.max(
        (isCheckedOut ? workedSeconds : shiftElapsedSeconds) -
        SHIFT_DURATION_SECONDS,
        0
    );

    const hasCompletedShift =
        (isCheckedOut ? workedSeconds : shiftElapsedSeconds) >=
        SHIFT_DURATION_SECONDS;

    const breakOvertimeSeconds = Math.max(
        breakSeconds - BREAK_DURATION_SECONDS,
        0
    );

    const lunchSecondsLeft = Math.max(
        BREAK_DURATION_SECONDS - breakSeconds,
        0
    );

    const completedBreakSeconds = useMemo(
        () => getWorkedSeconds(record?.lunch_in, record?.lunch_out),
        [record?.lunch_in, record?.lunch_out]
    );

    const isLunchOutLate =
        hasTakenBreak && completedBreakSeconds > BREAK_DURATION_SECONDS;

    const breakReturnTime = useMemo(() => {
        if (!isOnBreak) return null;

        const apiLunchIn = parseApiDateTime(record?.lunch_in);
        const timerStartedAt = breakStartedAt ?? apiLunchIn?.getTime();

        if (!timerStartedAt) return null;

        return new Date(
            timerStartedAt + BREAK_DURATION_SECONDS * 1000
        ).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    }, [breakStartedAt, isOnBreak, record?.lunch_in]);

    const displayedShiftSeconds = isCheckedOut
        ? workedSeconds
        : shiftElapsedSeconds;

    const shiftProgress = Math.min(
        (displayedShiftSeconds / SHIFT_DURATION_SECONDS) * 100,
        100
    );

    const statusClasses = breakOvertimeSeconds > 0 || isLunchOutLate
        ? "border-destructive/20 bg-destructive/10 text-destructive"
        : isOnBreak
            ? "border-[var(--employee-orange)]/25 bg-[var(--employee-break-soft)] text-[var(--employee-break-foreground)]"
            : "border-[var(--employee-green)]/25 bg-[var(--employee-green-soft)] text-[var(--employee-green)]";

    /**
     * ------------------------------------------------------------
     * RENDER
     * ------------------------------------------------------------
     */
    return (
        <section className="relative row-span-2 flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_16px_45px_-28px_rgba(15,23,42,0.45)]">
            <div className="h-1 w-full shrink-0 bg-primary" />
            <div className="flex flex-1 flex-col p-5 sm:p-6">
                {/* HEADER */}

                <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                            <Fingerprint size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-[var(--employee-heading)]">Today&apos;s attendance</h2>
                            <p className="truncate text-xs text-muted-foreground">Your workday at a glance</p>
                        </div>
                    </div>

                    <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${statusClasses}`}>
                        {isOnBreak
                            ? breakOvertimeSeconds > 0
                                ? "Lunch Overdue"
                                : "At Lunch"
                            : isCheckedOut
                                ? "Completed"
                                : isLunchOutLate
                                    ? "Late Lunch Out"
                                    : "Present"}
                    </span>
                </div>

                <div className="my-5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* BODY */}

                <div className={`grid w-full min-w-0 flex-1 gap-4 ${isCheckedOut ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_minmax(210px,0.55fr)]"}`}>
                    {/* LEFT CONTENT */}

                    <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-muted/45 via-card to-card p-4 sm:p-5">
                        {isOnBreak ? (
                            <>
                                <div className="mb-2 flex items-center gap-2">
                                    <Coffee
                                        className="shrink-0"
                                        style={{ color: "var(--employee-orange)" }}
                                        size={27}
                                    />

                                    <span className="truncate text-sm font-medium">
                                        You&apos;re at lunch
                                    </span>
                                </div>

                                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                                    {breakOvertimeSeconds > 0
                                        ? "Your 40-minute lunch time has ended. Please return to work."
                                        : "Your 40-minute lunch time is counting down."}
                                </p>

                                <div className="mt-4 flex items-center gap-2">
                                    <TimerReset
                                        size={18}
                                        className="shrink-0"
                                        style={{ color: "var(--employee-orange)" }}
                                    />

                                    <span className="text-3xl font-bold tracking-tight tabular-nums">
                                        {breakOvertimeSeconds > 0
                                            ? `+${formatDuration(breakOvertimeSeconds)}`
                                            : formatDuration(lunchSecondsLeft)}
                                    </span>
                                </div>

                                {breakOvertimeSeconds > 0 && (
                                    <div role="alert" className="mt-3 w-fit flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                                        <AlertCircle size={17} className="shrink-0" />
                                        You are late returning from lunch.
                                    </div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <span>
                                        Return by:{" "}
                                        <strong className="text-foreground">
                                            {breakReturnTime ?? "--"}
                                        </strong>
                                    </span>
                                </div>
                            </>
                        ) : isCheckedOut ? (
                            <>
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--employee-green-soft)] text-[var(--employee-green)] ring-1 ring-[var(--employee-green)]/15">
                                        <LogOut size={21} />
                                    </span>

                                    <div>
                                        <span className="block text-base font-bold text-foreground">
                                            Great work today!
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Your attendance is complete
                                        </span>
                                    </div>
                                </div>

                                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                                    You&apos;ve wrapped up your day after working{" "}
                                    <strong className="text-foreground">
                                        {workedTime}
                                    </strong>. Take time to recharge you&apos;ve earned it.
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

                                    {hasTakenBreak && (
                                        <span>
                                            Lunch: <strong className={isLunchOutLate ? "text-destructive" : "text-foreground"}>
                                                {formatTime(record?.lunch_in)} - {formatTime(record?.lunch_out)}
                                                {` (${formatDuration(completedBreakSeconds)})`}
                                            </strong>
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>


                                <p className="max-w-md text-sm font-medium leading-6 text-foreground">
                                    {hasCompletedShift
                                        ? "You completed your 9-hour shift. Excellent work and dedication today!"
                                        : "You're marked present today. Have a productive day!"}
                                </p>

                                {hasCompletedShift && (
                                    <div className="mt-3 w-fit rounded-xl border border-[var(--employee-green)]/30 bg-[var(--employee-green-soft)] px-3 py-2 text-sm font-semibold text-[var(--employee-green)]">
                                        Shift complete · Overtime +{formatDuration(shiftOvertimeSeconds)}
                                    </div>
                                )}

                                <div className="mt-3 flex flex-col flex-wrap gap-4 text-sm text-muted-foreground">
                                    <span>
                                        Login:{" "}
                                        <strong className="text-foreground">
                                            {formatTime(
                                                record?.login
                                            )}
                                        </strong>
                                    </span>

                                    {hasTakenBreak && (
                                        <span>
                                            Lunch: <strong className="text-foreground">{formatTime(record?.lunch_in)}</strong> -  <strong className={isLunchOutLate ? "text-destructive" : "text-foreground"}>
                                                {formatTime(record?.lunch_out)}
                                            </strong>
                                        </span>
                                    )}



                                    {hasTakenBreak && (
                                        <span>
                                            Lunch duration: <strong className={isLunchOutLate ? "text-destructive" : "text-foreground"}>
                                                {formatDuration(completedBreakSeconds)}
                                                {isLunchOutLate ? " · Late" : ""}
                                            </strong>
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* SIMPLE FORWARD SHIFT TIMER */}
                    {!isCheckedOut && <div className="min-w-0">
                        <div className="flex h-full min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 shadow-sm">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <TimerReset size={16} className="text-primary" />
                                Shift worked
                            </div>

                            <strong className="block text-3xl font-bold tracking-tight tabular-nums text-foreground">
                                {formatDuration(displayedShiftSeconds)}
                            </strong>

                            {hasCompletedShift && (
                                <span className="mt-2 block text-sm font-semibold tabular-nums text-[var(--employee-green)]">
                                    Overtime +{formatDuration(shiftOvertimeSeconds)}
                                </span>
                            )}

                            <div className="mt-5">
                                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{Math.round(shiftProgress)}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--employee-blue)] transition-[width] duration-500" style={{ width: `${shiftProgress}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>}

                </div>

                {/* ACTION BUTTONS */}

                {!isCheckedOut && (
                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border/70 pt-5 sm:grid-cols-2">
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
                                className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
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
                                        I&apos;m Back From Lunch
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
                                onClick={() =>
                                    setIsBreakConfirmOpen(true)
                                }
                                className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--employee-orange)]/30 bg-[var(--employee-break-soft)] px-4 text-sm font-semibold text-[var(--employee-break-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--employee-orange)] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                {actionLoading === "break" ? (
                                    <>
                                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Starting Lunch...
                                    </>
                                ) : (
                                    <>
                                        <Coffee
                                            size={17}
                                            className="shrink-0"
                                        />
                                        Start Lunch
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
                            onClick={() =>
                                setIsExitMeetingOpen(true)
                            }
                            className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--employee-red)]/40 bg-[var(--leave-red-soft)] px-4 text-sm font-semibold text-[var(--employee-red)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--employee-red)] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            {actionLoading ===
                                "checkout" ? (
                                <>
                                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Loging Out...
                                </>
                            ) : (
                                <>
                                    <LogOut
                                        size={17}
                                        className="shrink-0"
                                    />
                                    Log Out
                                </>
                            )}
                        </button>
                    </div>
                )}

            </div>

            <Dialog.Root
                open={isBreakConfirmOpen}
                onOpenChange={handleBreakConfirmOpenChange}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-[999] bg-slate-950/55 backdrop-blur-sm" />
                    <Dialog.Content
                        aria-describedby="break-confirmation-description"
                        className="fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
                    >
                        <div className="relative bg-gradient-to-br from-orange-500 to-amber-400 px-6 pb-6 pt-7 text-white">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    disabled={actionLoading === "break"}
                                    aria-label="Close lunch confirmation"
                                    className="absolute right-4 top-4 rounded-lg p-2 text-white/90 transition hover:bg-white/15 disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </Dialog.Close>

                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-sm ring-1 ring-white/25">
                                <Coffee size={25} />
                            </div>
                            <Dialog.Title className="pr-10 text-xl font-semibold">
                                Ready to start lunch?
                            </Dialog.Title>
                            <Dialog.Description
                                id="break-confirmation-description"
                                className="mt-1.5 text-sm leading-6 text-white/85"
                            >
                                Your 40-minute lunch countdown will start immediately after you confirm.
                            </Dialog.Description>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                                <TimerReset size={18} className="mt-0.5 shrink-0 text-orange-600" />
                                <p>
                                    Remember to select <strong>I&apos;m Back From Lunch</strong> when you return.
                                </p>
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        disabled={actionLoading === "break"}
                                        className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="button"
                                    disabled={actionLoading === "break"}
                                    onClick={confirmTakeBreak}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {actionLoading === "break" ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Starting Lunch...
                                        </>
                                    ) : (
                                        <>
                                            <Coffee size={17} />
                                            Start My Lunch
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root
                open={isExitMeetingOpen}
                onOpenChange={handleExitMeetingOpenChange}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-[999] bg-slate-950/55 backdrop-blur-sm" />
                    <Dialog.Content
                        aria-describedby="exit-meeting-description"
                        className="fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
                    >
                        <div className="border-b border-border bg-primary px-6 py-5 text-primary-foreground">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="mb-2 inline-block rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider">
                                        New Process
                                    </span>
                                    <Dialog.Title className="text-xl font-semibold">
                                        Exit Meeting
                                    </Dialog.Title>
                                    <Dialog.Description
                                        id="exit-meeting-description"
                                        className="mt-1 text-sm text-primary-foreground/80"
                                    >
                                        Complete the exit meeting details before logging out.
                                    </Dialog.Description>
                                </div>
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        disabled={actionLoading === "checkout"}
                                        aria-label="Close exit meeting form"
                                        className="rounded-lg p-2 text-primary-foreground transition hover:bg-primary-foreground/15 disabled:opacity-50"
                                    >
                                        <X size={20} />
                                    </button>
                                </Dialog.Close>
                            </div>
                        </div>

                        <form onSubmit={submitExitMeeting} className="space-y-5 p-6">
                            <fieldset>
                                <legend className="mb-3 text-sm font-semibold text-foreground">
                                    Was the Exit Meeting held? <span className="text-destructive">*</span>
                                </legend>
                                <div className="grid grid-cols-2 gap-3">
                                    {["yes", "no"].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            aria-pressed={meetingHeld === status}
                                            onClick={() => selectMeetingStatus(status)}
                                            className={`rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition ${meetingHeld === status
                                                ? status === "yes"
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-destructive bg-destructive text-destructive-foreground"
                                                : "border-border bg-muted text-muted-foreground hover:border-primary"
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            {meetingHeld === "yes" && (
                                <div className="space-y-5">
                                    <fieldset>
                                        <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <Users size={17} className="text-primary" />
                                            Who conducted the Exit Meeting? <span className="text-destructive">*</span>
                                        </legend>
                                        <div className="grid grid-cols-2 gap-3">
                                            {["Team Lead (TL)", "Manager"].map((person) => (
                                                <label
                                                    key={person}
                                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${conductedBy === person
                                                        ? "border-primary bg-accent text-accent-foreground"
                                                        : "border-border bg-card text-muted-foreground hover:border-primary"
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="conductedBy"
                                                        value={person}
                                                        checked={conductedBy === person}
                                                        onChange={(event) => {
                                                            setConductedBy(event.target.value);
                                                            setExitMeetingError("");
                                                        }}
                                                        className="h-4 w-4 accent-[var(--primary)]"
                                                    />
                                                    {person}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    <div>
                                        <label htmlFor="exit-meeting-remarks" className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <MessageSquareText size={17} className="text-primary" />
                                            Exit Meeting Remarks <span className="text-destructive">*</span>
                                        </label>
                                        <textarea
                                            id="exit-meeting-remarks"
                                            value={remarks}
                                            onChange={(event) => {
                                                setRemarks(event.target.value);
                                                setExitMeetingError("");
                                            }}
                                            rows={4}
                                            required
                                            placeholder="Add notes from the exit meeting..."
                                            className="w-full resize-none rounded-xl border border-border bg-input-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            )}

                            {exitMeetingError && (
                                <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                    <span>{exitMeetingError}</span>
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        disabled={actionLoading === "checkout"}
                                        className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={meetingHeld !== "yes" || !conductedBy || !remarks.trim() || actionLoading === "checkout"}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {actionLoading === "checkout" ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Logging Out...
                                        </>
                                    ) : (
                                        <>
                                            <LogOut size={17} />
                                            Complete Logout
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </section>
    );
}
