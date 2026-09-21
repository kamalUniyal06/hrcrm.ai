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
                                    className="shrink-0"
                                    style={{ color: "var(--employee-orange)" }}
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
                                    className="shrink-0"
                                    style={{ color: "var(--employee-orange)" }}
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
                <div className="attendance-actions">
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
                            className="attendance-action attendance-action--primary"
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
                            className="attendance-action"
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
                        onClick={() =>
                            setIsExitMeetingOpen(true)
                        }
                        className="attendance-action attendance-action--danger"
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
