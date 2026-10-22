import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { selectIsAdmin } from "@/utils/pageAccess";
import { MY_ALERTS_KEY, respondToAlert } from "../../api/systemAlerts.api";
import { useMyAlerts } from "../../queries/systemAlerts.queries";
import AlertPopup from "./AlertPopup";
import { SystemAlertsContext } from "./systemAlertsContext";
import { answerLabel, markAlertAnswered, popupQueue, respondErrorKind } from "./systemAlertUtils";

const SNOOZE_KEY = "hrcrm:system-alerts-snoozed";
const NO_ALERTS = [];

// "Remind me later" lasts for this browser session only.
const readSnoozed = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SNOOZE_KEY) || "[]"));
  } catch {
    return new Set();
  }
};
const writeSnoozed = (ids) => {
  try {
    sessionStorage.setItem(SNOOZE_KEY, JSON.stringify([...ids]));
  } catch {
    /* Storage may be unavailable; the snooze then lasts until reload. */
  }
};


/**
 * The signed-in employee's alerts (from my_alerts) and the popup that asks for answers.
 * The popup opens by itself for unanswered alerts, and in "required" mode when the
 * logout check finds alerts that still need an answer.
 */
export function SystemAlertsProvider({ children }) {
  const userInfo = useSelector((state) => state.user.userInfo);
  const isAdmin = useSelector(selectIsAdmin);
  const enabled = Boolean(userInfo?.id) && (userInfo?.phase === "Employment" || isAdmin);
  const query = useMyAlerts({ enabled });
  const alerts = query.data?.alerts ?? NO_ALERTS;
  const queryClient = useQueryClient();
  const [snoozed, setSnoozed] = useState(readSnoozed);
  // { mode: "queue" | "required" | "single", alertId?, ignoreSnooze? }
  const [popup, setPopup] = useState(null);
  const answeredInPopup = useRef(false);

  const snooze = useCallback((ids, add = true) => {
    setSnoozed((current) => {
      const next = new Set(current);
      ids.forEach((id) => (add ? next.add(id) : next.delete(id)));
      writeSnoozed(next);
      return next;
    });
  }, []);

  const queue = useMemo(() => {
    if (!popup) return NO_ALERTS;
    if (popup.mode === "single") return alerts.filter((alert) => alert.id === popup.alertId);
    if (popup.mode === "required") return popupQueue(alerts, { blockingOnly: true });
    return popupQueue(alerts, { snoozed: popup.ignoreSnooze ? new Set() : snoozed });
  }, [popup, alerts, snoozed]);
  const current = queue[0] || null;

  // Open by itself whenever unanswered alerts are waiting that weren't put off this session.
  useEffect(() => {
    if (popup || !query.isSuccess) return;
    if (popupQueue(alerts, { snoozed }).length) {
      answeredInPopup.current = false;
      setPopup({ mode: "queue" });
    }
  }, [popup, alerts, snoozed, query.isSuccess]);

  // Close once everything in the popup is answered.
  useEffect(() => {
    if (!popup || current) return;
    if (popup.mode === "required" && answeredInPopup.current) {
      toast.success("All responses saved. You can log out now.");
    }
    setPopup(null);
  }, [popup, current]);

  // The logout check dispatches this when alerts still need an answer.
  useEffect(() => {
    const showRequired = (event) => {
      snooze((event.detail?.alerts || []).map((alert) => alert.id), false);
      answeredInPopup.current = false;
      setPopup({ mode: "required" });
    };
    window.addEventListener("system-alerts-required", showRequired);
    return () => window.removeEventListener("system-alerts-required", showRequired);
  }, [snooze]);

  const respond = useMutation({
    mutationFn: respondToAlert,
    onSuccess: (_, { alert, answer }) => {
      queryClient.setQueryData(MY_ALERTS_KEY, (data) => (data ? markAlertAnswered(data, alert.id, answer) : data));
      void queryClient.invalidateQueries({ queryKey: MY_ALERTS_KEY });
      answeredInPopup.current = true;
      if (alert.response_type === "yes_no") toast.success(`Your answer "${answerLabel(answer)}" was saved.`);
      else if (alert.response_type === "acknowledge") toast.success("Thanks. Marked as read.");
      setPopup((open) => (open?.mode === "single" ? null : open));
    },
    onError: (error) => {
      toast.error(error?.message || "Could not save your response. Please try again.");
      if (respondErrorKind(error) === "unavailable") void queryClient.invalidateQueries({ queryKey: MY_ALERTS_KEY });
    },
  });

  // Closing the popup puts off whatever it still holds for this session.
  // On an information alert, closing is the answer.
  const dismiss = useCallback(() => {
    if (respond.isPending) return;
    if (current && !current.responded && current.response_type === "none") {
      respond.mutate({ alert: current, answer: "seen" });
    }
    snooze(queue.filter((alert) => !alert.responded).map((alert) => alert.id));
    setPopup(null);
  }, [current, queue, respond, snooze]);

  const value = useMemo(() => ({
    available: query.isSuccess,
    loading: enabled && query.isPending,
    alerts,
    pendingCount: query.data?.pendingCount ?? 0,
    blockingCount: query.data?.blockingCount ?? 0,
    openAlert: (alertId) => setPopup({ mode: "single", alertId }),
    openPending: () => {
      answeredInPopup.current = false;
      setPopup({ mode: "queue", ignoreSnooze: true });
    },
  }), [query.isSuccess, query.isPending, query.data, enabled, alerts]);

  return (
    <SystemAlertsContext.Provider value={value}>
      {children}
      <AlertPopup
        alert={current}
        remaining={Math.max(queue.filter((alert) => !alert.responded).length - 1, 0)}
        required={popup?.mode === "required"}
        answering={respond.isPending ? respond.variables?.answer : null}
        onAnswer={(answer) => current && respond.mutate({ alert: current, answer })}
        onRemindLater={dismiss}
        onDismiss={dismiss}
      />
    </SystemAlertsContext.Provider>
  );
}
