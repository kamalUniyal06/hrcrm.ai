import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import {
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import he from "he";
import * as Dialog from "@radix-ui/react-dialog";

import {
  createSystemAlertResponse,
  fetchPendingSystemAlerts,
} from "../api/systemAlerts.api";

const alertKey = (employeeId) => ["system-alerts", "pending", employeeId];

const alertMessage = (alert) =>
  String(alert?.name || "").trim() ||
  "A new system notice requires your response.";

export default function SystemAlertCarousel({ employeeId, email }) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [detailAlert, setDetailAlert] = useState(null);
  const [logoutGuidance, setLogoutGuidance] = useState(false);
  const sectionRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const required = location.state?.requiredAlerts;
    if (!required || required.employeeId !== employeeId) return;
    queryClient.setQueryData(alertKey(employeeId), required.alerts);
    setActiveIndex(0);
    setLogoutGuidance(true);
    setDetailAlert(required.alerts[0] || null);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, employeeId, navigate, queryClient]);

  useEffect(() => {
    if (logoutGuidance) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [logoutGuidance]);

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
        email: email?.trim(),
        employeeId,
        alertId: alert.id,
        answer,
      }),
    onSuccess: (_, { alert, answer }) => {
      const remaining = (queryClient.getQueryData(alertKey(employeeId)) || []).filter((item) => item.id !== alert.id);
      setDetailAlert(logoutGuidance ? remaining[0] || null : null);
      queryClient.setQueryData(alertKey(employeeId), (current = []) =>
        current.filter((item) => item.id !== alert.id),
      );
      setDirection(1);
      toast.success(remaining.length === 0 && logoutGuidance
        ? "All responses saved. You can now log out."
        : `Response saved: ${answer === "yes" ? "Yes" : "No"}`);
    },
    onError: (error) => {
      toast.error(error?.message || "Could not save your response. Please retry.");
    },
  });

  useEffect(() => {
    if (
      reduceMotion ||
      isPaused ||
      detailAlert ||
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
  }, [activeIndex, alerts.length, isPaused, detailAlert, reduceMotion, responseMutation.isPending]);

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

  if (query.isError) return null;

  if (!activeAlert) return null;

  return (
    <>
    <section
      ref={sectionRef}
      className="relative mt-4 overflow-hidden rounded-2xl border-2 border-amber-500/60 bg-amber-50 shadow-md dark:bg-amber-950/20"
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
      <div className="flex justify-between gap-4 p-4 sm:p-5">
        
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <BellRing className="size-4" />
              </div>
              <div>
                <h2 id="system-alert-title" className="text-sm font-semibold text-foreground">
                  Action required
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Respond {alerts.length} pending alerts before logging out.</p>
                <p className="max-w-4xl text-sm font-medium leading-relaxed text-foreground sm:text-base">
                {alertMessage(activeAlert)}
              </p>
               {activeAlert.date_entered_uni_format && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Posted {activeAlert.date_entered_uni_format}
                </p>
              )}
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

        <div className=""><AnimatePresence mode="wait" initial={false} custom={direction}>
            <Motion.div
              key={activeAlert.id}
              custom={direction}
              initial={reduceMotion ? false : { opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => setDetailAlert(activeAlert)}
                className="mt-5 rounded-lg bg-amber-500 px-5 py-3  text-sm font-semibold text-slate-950 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
              >
                View more
              </button>
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
          )}</div>
      </div>
    </section>
    <Dialog.Root open={Boolean(detailAlert)} onOpenChange={(open) => { if (!open) setDetailAlert(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl">
          <Dialog.Title className="pr-8 text-lg font-semibold">{alertMessage(detailAlert)}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">{logoutGuidance ? "Please give your response here before logging out. Choose Yes or No below." : "Read this alert and submit your response before logging out."}</Dialog.Description>
          <Dialog.Close aria-label="Close alert" className="absolute right-4 top-4 rounded p-1 hover:bg-muted"><X className="size-5" /></Dialog.Close>
          <div
            className="my-5 min-h-0 overflow-auto break-words text-sm leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                he.decode(String(detailAlert?.description || "No description provided.")),
                { USE_PROFILES: { html: true } },
              ),
            }}
          />
          <div className="flex shrink-0 justify-end gap-3 border-t border-border pt-4">
            { ["yes", "no"].map((answer) => (
              <button key={answer} type="button" disabled={responseMutation.isPending} onClick={() => responseMutation.mutate({ alert: detailAlert, answer })} className="rounded-lg border border-border bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {answer === "yes" ? "Yes" : "No"}
              </button>
            )) }
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}
