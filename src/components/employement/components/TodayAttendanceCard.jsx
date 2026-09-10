import {
  Coffee,
  Fingerprint,
  LogIn,
  LogOut,
  Play,
  RotateCcw,
  TimerReset,
  Clock3,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";

import { useDailyActivity, useMarkPresent } from "@/components/employement/queries/dailyActivity.queries";

const TIMEZONE = "Asia/Kolkata";

/**
 * ------------------------------------------------------------
 * DATE HELPERS
 * ------------------------------------------------------------
 */

const getTodayDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const getDateFromApiValue = (value) => {
  if (!value) return null;

  const stringValue = String(value).trim();

  if (!stringValue) return null;

  /*
   * API format:
   *
   * 09/07/2026 13:02
   *
   * We only need the date portion.
   */
  const match = stringValue.match(
    /^(\d{2})\/(\d{2})\/(\d{4})/
  );

  if (match) {
    const [, day, month, year] = match;

    return `${year}-${month}-${day}`;
  }

  /*
   * Fallback for ISO dates.
   */
  const date = new Date(stringValue);

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  return null;
};

const isLoginToday = (login) => {
  if (!login) return false;

  const loginDate = getDateFromApiValue(login);

  return loginDate === getTodayDate();
};

/**
 * ------------------------------------------------------------
 * TIME HELPERS
 * ------------------------------------------------------------
 */

const parseApiDate = (value) => {
  if (!value) return null;

  const match = String(value)
    .trim()
    .match(
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/
    );

  if (!match) return null;

  const [, day, month, year, hours, minutes] = match;

  /*
   * API is Asia/Kolkata.
   *
   * We intentionally construct the date using the
   * equivalent UTC value for India (+05:30).
   */
  return new Date(
    `${year}-${month}-${day}T${hours}:${minutes}:00+05:30`
  );
};

const getElapsedSeconds = (startTime) => {
  if (!startTime) return 0;

  const start = new Date(startTime).getTime();

  if (Number.isNaN(start)) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - start) / 1000)
  );
};

const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
};

const formatTime = (value) => {
  if (!value) return "--";

  const date = parseApiDate(value);

  if (!date) {
    /*
     * If backend already sends a displayable value,
     * show it instead of failing.
     */
    return String(value).split(" ").pop() || "--";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

/**
 * ------------------------------------------------------------
 * SKELETON
 * ------------------------------------------------------------
 */

function TodayAttendanceSkeleton() {
  return (
    <section className="employee-card today-card">
      <div className="card-title-row">
        <Skeleton width={70} height={22} />
        <Skeleton width={65} height={24} borderRadius={999} />
      </div>

      <div className="divider" />

      <div className="today-card__body">
        <div className="min-w-0 flex-1">
          <Skeleton circle width={27} height={27} />

          <div className="mt-3">
            <Skeleton count={2} width="85%" />
          </div>

          <div className="mt-3">
            <Skeleton width={130} />
          </div>
        </div>

        <div className="shrink-0">
          <Skeleton circle width={105} height={105} />
        </div>
      </div>

      <div className="mt-4">
        <Skeleton height={42} borderRadius={10} />
      </div>
    </section>
  );
}

/**
 * ------------------------------------------------------------
 * MAIN COMPONENT
 * ------------------------------------------------------------
 */

export default function TodayAttendanceCard() {
  const {
    data,
    isPending,
    error,
    refetch,
  } = useDailyActivity();
  const { mutate, isPending: markPresentLoading } = useMarkPresent();
  const [breakStartedAt, setBreakStartedAt] = useState(null);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);

  /**
   * ----------------------------------------------------------
   * NORMALIZE API RESPONSE
   * ----------------------------------------------------------
   *
   * Your response:
   *
   * {
   *   records: [...]
   * }
   *
   * But this also supports:
   *
   * data = [...]
   */

  const record = useMemo(() => {
    if (Array.isArray(data)) {
      return data[0] || null;
    }

    return data?.records?.[0] || data?.data?.[0] || null;
  }, [data]);

  /**
   * ----------------------------------------------------------
   * ATTENDANCE STATE
   * ----------------------------------------------------------
   */

  const isPresentToday = useMemo(() => {
    return isLoginToday(record?.login);
  }, [record?.login]);

  const isOnBreak = Boolean(breakStartedAt);

  /**
   * ----------------------------------------------------------
   * BREAK TIMER
   * ----------------------------------------------------------
   *
   * We calculate from timestamps instead of simply incrementing
   * a counter. This prevents the timer from becoming inaccurate
   * when the browser tab sleeps.
   */

  useEffect(() => {
    if (!breakStartedAt) {
      setBreakSeconds(0);
      return;
    }

    const updateTimer = () => {
      setBreakSeconds(
        getElapsedSeconds(breakStartedAt)
      );
    };

    updateTimer();

    const interval = setInterval(
      updateTimer,
      1000
    );

    return () => clearInterval(interval);
  }, [breakStartedAt]);

  /**
   * ----------------------------------------------------------
   * RESTORE BREAK TIMER
   * ----------------------------------------------------------
   *
   * If you later store the break start in the API/localStorage,
   * this component can restore it after refresh.
   */

  useEffect(() => {
    try {
      const storedBreak = sessionStorage.getItem(
        "hrc_break_started_at"
      );

      if (storedBreak) {
        const timestamp = Number(storedBreak);

        if (
          Number.isFinite(timestamp) &&
          timestamp > 0
        ) {
          setBreakStartedAt(timestamp);
        }
      }
    } catch {
      // Ignore sessionStorage errors.
    }
  }, []);

  /**
   * ----------------------------------------------------------
   * BREAK START
   * ----------------------------------------------------------
   */

  const startBreakTimer = useCallback(() => {
    const timestamp = Date.now();

    setBreakStartedAt(timestamp);

    try {
      sessionStorage.setItem(
        "hrc_break_started_at",
        String(timestamp)
      );
    } catch {
      // Ignore sessionStorage errors.
    }
  }, []);

  /**
   * ----------------------------------------------------------
   * BREAK END
   * ----------------------------------------------------------
   */

  const stopBreakTimer = useCallback(() => {
    setBreakStartedAt(null);
    setBreakSeconds(0);

    try {
      sessionStorage.removeItem(
        "hrc_break_started_at"
      );
    } catch {
      // Ignore sessionStorage errors.
    }
  }, []);

  /**
   * ----------------------------------------------------------
   * API ACTION WRAPPER
   * ----------------------------------------------------------
   *
   * Connect your existing mutation/API functions here.
   *
   * The component intentionally doesn't invent an endpoint
   * because the fetch response alone doesn't tell us what your
   * backend expects for these actions.
   */

  const executeAction = async (
    action,
    apiFunction
  ) => {
    if (actionLoading) return;

    try {
      setActionLoading(action);

      if (typeof apiFunction !== "function") {
        throw new Error(
          `${action} API function is not connected yet.`
        );
      }

      await apiFunction();

      await refetch();

      toast.success(
        action === "present"
          ? "You are marked present."
          : action === "break"
            ? "Break started."
            : action === "back"
              ? "Welcome back! Break ended."
              : "You have checked out."
      );
    } catch (err) {
      console.error(
        `Attendance ${action} failed:`,
        err
      );

      toast.error(
        err?.message ||
        `Failed to ${action}. Please try again.`
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * ----------------------------------------------------------
   * MARK PRESENT
   * ----------------------------------------------------------
   *
   * Replace this with your actual mutation.
   */

  const handleMarkPresent = () => {
    mutate();
  };

  /**
   * ----------------------------------------------------------
   * TAKE BREAK
   * ----------------------------------------------------------
   */

  const handleTakeBreak = () => {
    executeAction("break", async () => {
      /*
       * TODO:
       *
       * await startBreak({
       *   id: record?.id,
       * });
       */

      /*
       * Start local timer immediately so the UI feels
       * instantaneous.
       */
      startBreakTimer();
    });
  };

  /**
   * ----------------------------------------------------------
   * I'M BACK
   * ----------------------------------------------------------
   */

  const handleBackFromBreak = () => {
    executeAction("back", async () => {
      /*
       * TODO:
       *
       * await endBreak({
       *   id: record?.id,
       * });
       */

      stopBreakTimer();
    });
  };

  /**
   * ----------------------------------------------------------
   * CHECK OUT
   * ----------------------------------------------------------
   */

  const handleCheckOut = () => {
    executeAction("checkout", async () => {
      /*
       * TODO:
       *
       * await checkOut({
       *   id: record?.id,
       * });
       */

      stopBreakTimer();
    });
  };

  /**
   * ----------------------------------------------------------
   * ERROR
   * ----------------------------------------------------------
   */

  if (error) {
    return (
      <section className="employee-card today-card">
        <div className="card-title-row">
          <h2 className="card-title">Today</h2>
          <span className="status-badge">
            Error
          </span>
        </div>

        <div className="divider" />

        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Fingerprint
            size={32}
            className="mb-3 text-red-500"
          />

          <p className="text-sm text-muted-foreground">
            Unable to load today's attendance.
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <RotateCcw size={15} />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  /**
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */

  if (isPending) {
    return <TodayAttendanceSkeleton />;
  }

  /**
   * ----------------------------------------------------------
   * ABSENT STATE
   * ----------------------------------------------------------
   */

  if (!isPresentToday) {
    return (
      <section className="employee-card today-card">
        <div className="card-title-row">
          <h2 className="card-title">
            Today
          </h2>

          <span className="status-badge">
            Absent
          </span>
        </div>

        <div className="divider" />

        <div className="today-card__body">
          <div className="min-w-0 flex-1">
            <Fingerprint
              className="today-card__icon"
              size={27}
            />

            <p className="today-card__message">
              You have not marked yourself as
              present today!
            </p>

            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 size={15} />

              <span>
                Mark your attendance to start
                your day.
              </span>
            </div>
          </div>

          <div className="progress-ring">
            <div className="progress-ring__content">
              <strong>0%</strong>
              <span>in office</span>
              <small>ABSENT</small>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={
            markPresentLoading
          }
          onClick={handleMarkPresent}
          className="mark-present disabled:cursor-not-allowed disabled:opacity-60"
        >
          {markPresentLoading ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Marking Present...
            </>
          ) : (
            <>
              <LogIn
                size={17}
                className="mr-2 inline"
              />
              Mark Present
            </>
          )}
        </button>
      </section>
    );
  }

  /**
   * ----------------------------------------------------------
   * PRESENT STATE
   * ----------------------------------------------------------
   */

  return (
    <section className="employee-card today-card">
      <div className="card-title-row">
        <h2 className="card-title">
          Today
        </h2>

        <span className="status-badge present">
          {isOnBreak ? "On Break" : "Present"}
        </span>
      </div>

      <div className="divider" />

      <div className="today-card__body">
        <div className="min-w-0 flex-1">
          {isOnBreak ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                <Coffee
                  className="text-orange-500"
                  size={27}
                />

                <span className="text-sm font-medium">
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
                  className="text-orange-500"
                />

                <span className="text-2xl font-semibold tabular-nums">
                  {formatDuration(
                    breakSeconds
                  )}
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
                    {formatTime(record?.login)}
                  </strong>
                </span>

                {record?.logout && (
                  <span>
                    Logout:{" "}
                    <strong className="text-foreground">
                      {formatTime(
                        record?.logout
                      )}
                    </strong>
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="progress-ring">
          <div className="progress-ring__content">
            <strong>
              {isOnBreak ? "—" : "100%"}
            </strong>

            <span>
              {isOnBreak
                ? "on break"
                : "in office"}
            </span>

            <small>
              {isOnBreak
                ? "BREAK"
                : "GOOD"}
            </small>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isOnBreak ? (
          <button
            type="button"
            disabled={
              actionLoading === "back"
            }
            onClick={handleBackFromBreak}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "back" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <Play size={17} />
                I'm Back From Break
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={
              actionLoading === "break" ||
              actionLoading === "checkout"
            }
            onClick={handleTakeBreak}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "break" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Starting Break...
              </>
            ) : (
              <>
                <Coffee size={17} />
                Take a Break
              </>
            )}
          </button>
        )}

        <button
          type="button"
          disabled={
            isOnBreak ||
            actionLoading === "checkout"
          }
          onClick={handleCheckOut}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
        >
          {actionLoading === "checkout" ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Checking Out...
            </>
          ) : (
            <>
              <LogOut size={17} />
              Check Out
            </>
          )}
        </button>
      </div>
    </section>
  );
}
