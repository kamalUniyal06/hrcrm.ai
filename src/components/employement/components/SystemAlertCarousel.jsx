import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import {
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RotateCw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createSystemAlertResponse,
  fetchPendingSystemAlerts,
} from "../api/systemAlerts.api";

const alertKey = (employeeId) => ["system-alerts", "pending", employeeId];

const alertMessage = (alert) =>
  String(alert?.description || alert?.name || "").trim() ||
  "A new system notice requires your response.";

export default function SystemAlertCarousel({ employeeId }) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const query = useQuery({
    queryKey: alertKey(employeeId),
    queryFn: () => fetchPendingSystemAlerts(employeeId),
    enabled: Boolean(employeeId),
    staleTime: 60 * 1000,
  });

  const alerts = query.data || [];
  const activeAlert = alerts[activeIndex];

  useEffect(() => {
    if (activeIndex > Math.max(alerts.length - 1, 0)) {
      setActiveIndex(Math.max(alerts.length - 1, 0));
    }
  }, [activeIndex, alerts.length]);

  const responseMutation = useMutation({
    mutationFn: ({ alert, answer }) =>
      createSystemAlertResponse({
        employeeId,
        alertId: alert.id,
        answer,
      }),
    onSuccess: (_, { alert, answer }) => {
      queryClient.setQueryData(alertKey(employeeId), (current = []) =>
        current.filter((item) => item.id !== alert.id),
      );
      setDirection(1);
      toast.success(`Response saved: ${answer === "yes" ? "Yes" : "No"}`);
    },
    onError: (error) => {
      toast.error(error?.message || "Could not save your response. Please retry.");
    },
  });

  useEffect(() => {
    if (
      reduceMotion ||
      isPaused ||
      responseMutation.isPending ||
      alerts.length < 2
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setDirection(1);
      setActiveIndex((current) => (current + 1) % alerts.length);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [activeIndex, alerts.length, isPaused, reduceMotion, responseMutation.isPending]);

  const move = (nextDirection) => {
    if (alerts.length < 2 || responseMutation.isPending) return;
    setDirection(nextDirection);
    setActiveIndex((current) =>
      (current + nextDirection + alerts.length) % alerts.length,
    );
  };

  const jumpTo = (index) => {
    if (index === activeIndex || responseMutation.isPending) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  if (!employeeId) return null;

  if (query.isLoading) {
    return (
      <section
        className="mt-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
        aria-label="Loading system alerts"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-6 w-3/4 rounded bg-muted" />
          <div className="h-8 w-full rounded-xl bg-muted sm:w-64" />
        </div>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-semibold text-foreground">Alerts are unavailable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We could not load your pending alerts. Your previous responses are safe.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.98]"
        >
          <RotateCw className="size-4" />
          Try again
        </button>
      </section>
    );
  }

  if (!activeAlert) return null;

  return (
    <section
      className="relative mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_14px_40px_-34px_hsl(var(--primary)/0.55)]"
      aria-labelledby="system-alert-title"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_270px]">
        <div className="relative overflow-hidden p-4 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <BellRing className="size-4" />
              </div>
              <div>
                <h2 id="system-alert-title" className="text-sm font-semibold text-foreground">
                  Action required
                </h2>
              </div>
            </div>

            {alerts.length > 1 && (
              <div className="flex items-center gap-2" aria-label="Alert navigation">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  disabled={responseMutation.isPending}
                  aria-label="Previous alert"
                  className="grid size-8 place-items-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.96] disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="min-w-12 text-center text-xs font-medium tabular-nums text-muted-foreground">
                  {activeIndex + 1} of {alerts.length}
                </span>
                <button
                  type="button"
                  onClick={() => move(1)}
                  disabled={responseMutation.isPending}
                  aria-label="Next alert"
                  className="grid size-8 place-items-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.96] disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <Motion.div
              key={activeAlert.id}
              custom={direction}
              initial={reduceMotion ? false : { opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="max-w-4xl text-sm font-medium leading-relaxed text-foreground sm:text-base">
                {alertMessage(activeAlert)}
              </p>
              {activeAlert.date_entered_uni_format && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Posted {activeAlert.date_entered_uni_format}
                </p>
              )}
            </Motion.div>
          </AnimatePresence>

          {alerts.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Choose an alert">
              {alerts.map((alert, index) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => jumpTo(index)}
                  disabled={responseMutation.isPending}
                  aria-label={`Show alert ${index + 1}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  className={`h-1.5 rounded-full transition-all active:scale-95 disabled:opacity-50 ${index === activeIndex
                    ? "w-7 bg-primary"
                    : "w-3 bg-border hover:bg-primary/45"
                    }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center border-t border-border bg-muted/35 p-4 lg:border-l lg:border-t-0">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Your response</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={responseMutation.isPending}
              onClick={() => responseMutation.mutate({ alert: activeAlert, answer: "yes" })}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:brightness-95 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              <Check className="size-4" />
              Yes
            </button>
            <button
              type="button"
              disabled={responseMutation.isPending}
              onClick={() => responseMutation.mutate({ alert: activeAlert, answer: "no" })}
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-primary/5 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              <X className="size-4" />
              No
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
