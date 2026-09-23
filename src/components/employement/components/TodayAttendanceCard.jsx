import {
  Clock3,
  Fingerprint,
  LogIn,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import {
  useDailyActivity,
  useLogOut,
  useLunchIn,
  useLunchOut,
  useMarkPresent,
} from "../queries/dailyActivity.queries";

import TodayPresentCard from "./TodayPresentCard";

const apiDateKey = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})/);

  return match ? `${match[3]}-${match[1]}-${match[2]}` : null;
};

const todayInIndia = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

function TodayAttendanceSkeleton() {
  return (
    <section className="flex min-h-[280px] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width={70} height={22} />
        <Skeleton
          width={65}
          height={24}
          borderRadius={999}
        />
      </div>

      {/* Divider */}
      <div className="my-4 h-px w-full bg-border" />

      {/* Body */}
      <div className="flex flex-1 items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Skeleton circle width={27} height={27} />

          <div className="mt-3">
            <Skeleton count={2} width="85%" />
          </div>

          <div className="mt-2">
            <Skeleton width={130} />
          </div>
        </div>

        <Skeleton
          circle
          width={105}
          height={105}
        />
      </div>

      {/* Button */}
      <div className="mt-5">
        <Skeleton
          height={42}
          borderRadius={10}
        />
      </div>
    </section>
  );
}

function CardHeader({ status }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Today
        </h2>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "Error"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground"
            }`}
        >
          {status}
        </span>
      </div>

      <div className="my-4 h-px w-full bg-border" />
    </>
  );
}

function AttendanceProgress() {
  return (
    <div className="relative flex h-[105px] w-[105px] shrink-0 items-center justify-center rounded-full bg-muted">
      <div className="absolute inset-[7px] flex flex-col items-center justify-center rounded-full bg-card text-center">
        <strong className="text-xl font-bold leading-none text-foreground">
          0%
        </strong>

        <span className="mt-1 text-[11px] font-medium text-muted-foreground">
          in office
        </span>

        <small className="mt-1 text-[9px] font-bold tracking-wider text-destructive">
          ABSENT
        </small>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <section className="flex min-h-[280px] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <CardHeader status="Error" />

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Fingerprint size={28} />
        </div>

        <p className="mt-3 text-sm font-medium text-muted-foreground">
          Unable to load today's attendance.
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <RotateCcw size={15} />
          Try Again
        </button>
      </div>
    </section>
  );
}

function AbsentState({ isPending, onMarkPresent }) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <CardHeader status="Absent" />

      {/* Main content */}
      <div className="flex flex-1 items-center justify-between gap-6">
        {/* Information */}
        <div className="min-w-0 flex-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Fingerprint size={27} />
          </div>

          <p className="mt-4 max-w-[300px] text-base font-medium leading-6 text-foreground">
            You have not marked yourself as present today!
          </p>

          <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <Clock3
              size={15}
              className="mt-0.5 shrink-0"
            />

            <span>
              Mark your attendance to start your day.
            </span>
          </div>
        </div>

        {/* Progress */}
        <AttendanceProgress />
      </div>

      {/* Action */}
      <button
        type="button"
        disabled={isPending}
        onClick={onMarkPresent}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          "Marking Present..."
        ) : (
          <>
            <LogIn size={17} />
            Mark Present
          </>
        )}
      </button>
    </section>
  );
}

export default function TodayAttendanceCard() {
  const { data, isPending, error, refetch } = useDailyActivity();

  const present = useMarkPresent();
  const lunchIn = useLunchIn();
  const lunchOut = useLunchOut();
  const logout = useLogOut();
  const [loginStartedAt, setLoginStartedAt] = useState(null);

  const handleMarkPresent = async () => {
    try {
      await present.mutateAsync();
      // Anchor the visible timer to the successful login response so it
      // begins at zero instead of inheriting API/refetch latency.
      setLoginStartedAt(Date.now());
    } catch {
      setLoginStartedAt(null);
    }
  };

  const record = useMemo(
    () =>
      Array.isArray(data)
        ? data[0] || null
        : data?.records?.[0] ||
        data?.data?.[0] ||
        null,
    [data]
  );

  const isPresentToday =
    apiDateKey(record?.login) === todayInIndia();

  if (isPending) {
    return <TodayAttendanceSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!isPresentToday) {
    return (
      <AbsentState
        isPending={present.isPending}
        onMarkPresent={handleMarkPresent}
      />
    );
  }

  return (
    <TodayPresentCard
      record={record}
      loginStartedAt={loginStartedAt}
      actionLoading={
        lunchIn.isPending
          ? "break"
          : lunchOut.isPending
            ? "back"
            : logout.isPending
              ? "checkout"
              : null
      }
      handleTakeBreak={() => lunchIn.mutateAsync()}
      handleBackFromBreak={() => lunchOut.mutate()}
      handleCheckOut={() => logout.mutate()}
    />
  );
}
