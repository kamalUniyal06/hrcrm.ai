import { createElement, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ensureSystemAlertsAnswered } from "../api/systemAlerts.api";
import {
    AlertCircle,
    Coffee,
    LogIn,
    LogOut,
    MapPin,
    MessageSquareText,
    Play,
    TimerReset,
    Users,
    X,
} from "lucide-react";
import CheckInShell, { Spinner, StatusPill } from "./home/CheckInShell";
import { actionButton } from "./home/homeUi";

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
    shift,
    loginStartedAt,
    actionLoading,
    handleTakeBreak,
    handleBackFromBreak,
    handleCheckOut,
    lunchOutMinutes = 40,
}) {
    const breakDurationSeconds = lunchOutMinutes * 60;
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
    const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
    const employeeId = useSelector((state) => state.user.userInfo?.id);
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

    const handleExitMeetingOpenChange = async (open) => {
        if (actionLoading === "checkout") return;
        if (!open) {
            setIsExitMeetingOpen(false);
            resetExitMeetingForm();
            return;
        }
        if (isCheckingAlerts) return;
        setIsCheckingAlerts(true);
        try {
            await ensureSystemAlertsAnswered(employeeId);
            setIsExitMeetingOpen(true);
        } catch (error) {
            if (error.code !== "SYSTEM_ALERTS_REQUIRED") {
                toast.error(error.message || "Could not check required alerts. Please try again.");
            }
        } finally {
            setIsCheckingAlerts(false);
        }
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

    const breakOvertimeSeconds = Math.max(
        breakSeconds - breakDurationSeconds,
        0
    );

    const lunchSecondsLeft = Math.max(
        breakDurationSeconds - breakSeconds,
        0
    );

    const completedBreakSeconds = useMemo(
        () => getWorkedSeconds(record?.lunch_in, record?.lunch_out),
        [record?.lunch_in, record?.lunch_out]
    );

    const isLunchOutLate =
        hasTakenBreak && completedBreakSeconds > breakDurationSeconds;

    const breakReturnTime = useMemo(() => {
        if (!isOnBreak) return null;

        const apiLunchIn = parseApiDateTime(record?.lunch_in);
        const timerStartedAt = breakStartedAt ?? apiLunchIn?.getTime();

        if (!timerStartedAt) return null;

        return new Date(
            timerStartedAt + breakDurationSeconds * 1000
        ).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    }, [breakDurationSeconds, breakStartedAt, isOnBreak, record?.lunch_in]);

    const displayedShiftSeconds = isCheckedOut
        ? workedSeconds
        : shiftElapsedSeconds;

    const isLunchOverdue = isOnBreak && breakOvertimeSeconds > 0;
    const lunchValue = record?.lunch_in
        ? `${formatTime(record.lunch_in)} – ${record?.lunch_out ? formatTime(record.lunch_out) : "now"}`
        : "Not taken yet";

    const statusPill = isOnBreak ? (
        <StatusPill tone={isLunchOverdue ? "danger" : "warning"} pulse>
            {isLunchOverdue ? "Lunch overdue" : "At lunch"}
        </StatusPill>
    ) : isCheckedOut ? (
        <StatusPill>Completed</StatusPill>
    ) : isLunchOutLate ? (
        <StatusPill tone="danger">Late lunch out</StatusPill>
    ) : (
        <StatusPill tone="success" pulse>Present</StatusPill>
    );

    const locationBadge = record?.ip_address === "122.176.54.204" ? (
        <span title="Logged in from the office network" className="inline-flex items-center gap-1 rounded-full bg-[var(--employee-green-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--employee-green)]">
            <MapPin size={11} aria-hidden="true" />
            Office
        </span>
    ) : (
        <span title="Logged in outside the office network" className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
            <MapPin size={11} aria-hidden="true" />
            Outside office
        </span>
    );

    /**
     * ------------------------------------------------------------
     * RENDER
     * ------------------------------------------------------------
     */
    return (
        <>
            <CheckInShell shift={shift} status={statusPill} badge={locationBadge}>
                {/* The live shift clock is the headline; login and lunch read as simple rows. */}
                <p className="text-xs font-medium text-muted-foreground">{isCheckedOut ? "Worked today" : "Shift time"}</p>
                <p className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{formatDuration(displayedShiftSeconds)}</p>

                <dl className="mt-3 divide-y divide-border rounded-xl bg-card/70 ring-1 ring-border">
                    {[
                        ["Login", LogIn, formatTime(record?.login), false],
                        ["Lunch", Coffee, lunchValue, isLunchOutLate],
                    ].map(([label, icon, value, warn]) => (
                        <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                {createElement(icon, { size: 14, "aria-hidden": true })}
                                {label}
                            </dt>
                            <dd className={`text-right text-sm font-semibold tabular-nums ${warn ? "text-destructive" : "text-foreground"}`}>
                                {value}
                                {warn && <span className="sr-only"> (late)</span>}
                            </dd>
                        </div>
                    ))}
                </dl>

                {isOnBreak && (
                    <div
                        role={isLunchOverdue ? "alert" : undefined}
                        className={`mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${isLunchOverdue
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-[var(--employee-orange)]/25 bg-[var(--employee-break-soft)] text-[var(--employee-break-foreground)]"
                            }`}
                    >
                        <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
                            {isLunchOverdue ? <AlertCircle size={15} className="shrink-0" /> : <Coffee size={15} className="shrink-0" />}
                            <span className="truncate">
                                {isLunchOverdue
                                    ? `Your ${lunchOutMinutes}-minute lunch is over`
                                    : `Back by ${breakReturnTime ?? "--"}`}
                            </span>
                        </span>
                        <span className="text-sm font-bold tabular-nums">
                            {isLunchOverdue ? `+${formatDuration(breakOvertimeSeconds)}` : formatDuration(lunchSecondsLeft)}
                        </span>
                    </div>
                )}

                {!isCheckedOut && (
                    <div className="mt-4 flex gap-2">
                        {isOnBreak ? (
                            <button
                                type="button"
                                disabled={actionLoading === "back"}
                                onClick={handleBackFromBreak}
                                className={actionButton.primary}
                            >
                                {actionLoading === "back" ? <><Spinner />Updating...</> : <><Play size={15} />I&apos;m Back</>}
                            </button>
                        ) : !hasTakenBreak ? (
                            <button
                                type="button"
                                disabled={actionLoading === "break" || actionLoading === "checkout"}
                                onClick={() => setIsBreakConfirmOpen(true)}
                                className={actionButton.lunch}
                            >
                                {actionLoading === "break" ? <><Spinner />Starting...</> : <><Coffee size={15} />Start Lunch</>}
                            </button>
                        ) : null}

                        <button
                            type="button"
                            disabled={isOnBreak || isCheckingAlerts || actionLoading === "checkout"}
                            title={isOnBreak ? "End your lunch before logging out" : undefined}
                            onClick={() => handleExitMeetingOpenChange(true)}
                            className={actionButton.danger}
                        >
                            {actionLoading === "checkout"
                                ? <><Spinner />Logging Out...</>
                                : <><LogOut size={15} />{isCheckingAlerts ? "Checking alerts..." : "Log Out"}</>}
                        </button>
                    </div>
                )}
            </CheckInShell>

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
                                Your {lunchOutMinutes}-minute lunch countdown will start immediately after you confirm.
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
        </>
    );
}
