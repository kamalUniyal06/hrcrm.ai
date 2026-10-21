import { Clock3, LogIn, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import {
  useDailyActivity,
  useLogOut,
  useLunchIn,
  useLunchOut,
  useMarkPresent,
} from "../queries/dailyActivity.queries";

import TodayPresentCard from "./TodayPresentCard";
import CheckInShell, { Spinner, StatusPill } from "./home/CheckInShell";
import { actionButton, shiftWindow } from "./home/homeUi";
import { timeToMinutes, useAttendanceLimits } from "../attendanceLimits";
import { cn } from "@/lib/utils";

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

const currentMinutesInIndia = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === "hour")?.value) * 60
    + Number(parts.find((part) => part.type === "minute")?.value);
};

export default function TodayAttendanceCard() {
  const { data, isPending, error, refetch } = useDailyActivity();
  const limits = useAttendanceLimits();
  const [currentMinutes, setCurrentMinutes] = useState(currentMinutesInIndia);

  const present = useMarkPresent();
  const lunchIn = useLunchIn();
  const lunchOut = useLunchOut();
  const logout = useLogOut();
  const [loginStartedAt, setLoginStartedAt] = useState(null);

  useEffect(() => {
    const interval = window.setInterval(
      () => setCurrentMinutes(currentMinutesInIndia()),
      30_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  const loginStartMinutes = timeToMinutes(limits.actualLoginTime);
  const canLogin = loginStartMinutes === null || currentMinutes >= loginStartMinutes;
  const shift = shiftWindow(limits.actualLoginTime);

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
    return (
      <CheckInShell shift={shift} status={<Skeleton width={64} height={20} borderRadius={999} />}>
        <Skeleton height={14} width="70%" />
        <div className="mt-3"><Skeleton height={40} borderRadius={12} /></div>
      </CheckInShell>
    );
  }

  if (error) {
    return (
      <CheckInShell shift={shift} status={<StatusPill tone="danger">Error</StatusPill>}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load today&apos;s attendance.</p>
          <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
            <RotateCcw size={13} />
            Retry
          </button>
        </div>
      </CheckInShell>
    );
  }

  if (!isPresentToday) {
    return (
      <CheckInShell attention shift={shift} status={<StatusPill tone="danger" pulse>Not checked in</StatusPill>}>
        <p className="mb-3 text-sm text-muted-foreground">
          Clock in to start tracking your shift, lunch and working hours.
        </p>
        {canLogin ? (
          <button type="button" disabled={present.isPending} onClick={handleMarkPresent} className={cn(actionButton.primary, "h-11 w-full text-base shadow-md")}>
            {present.isPending ? <><Spinner />Clocking in...</> : <><LogIn size={16} />Clock In</>}
          </button>
        ) : (
          <div className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 text-sm font-medium text-muted-foreground">
            <Clock3 size={15} />
            Clock in opens at {limits.actualLoginTime}
          </div>
        )}
      </CheckInShell>
    );
  }

  return (
    <TodayPresentCard
      record={record}
      shift={shift}
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
      lunchOutMinutes={limits.lunchOutMinutes}
    />
  );
}
