import { createElement, useId } from "react";
import { BellRing, ChevronRight } from "lucide-react";
import { useSystemAlerts } from "./systemAlertsContext";
import { typeMeta } from "./alertUi";
import { alertTitle, formatUtcTime, popupQueue } from "./systemAlertUtils";

const SHOWN = 3;

/** Home-page reminder of the alerts still waiting for this employee. */
export default function PendingAlertsBanner() {
  const titleId = useId();
  const { alerts, blockingCount, openAlert, openPending } = useSystemAlerts();
  // Newest first here; the popup itself works oldest first.
  const pending = popupQueue(alerts).reverse();
  if (!pending.length) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-2xl border-2 border-[var(--attendance-late)]/45 bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--attendance-late)]/10 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--attendance-late)] text-white shadow-sm">
            <BellRing size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-foreground sm:text-base">
              {pending.length === 1 ? "1 alert is waiting for you" : `${pending.length} alerts are waiting for you`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {blockingCount
                ? `Answer ${blockingCount === 1 ? "it" : blockingCount === pending.length ? "them" : `${blockingCount} of them`} before you clock out.`
                : "Have a look when you have a moment."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {pending.length === 1 ? "Open alert" : "Go through them"} <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
      <ul className="divide-y divide-border">
        {pending.slice(0, SHOWN).map((alert) => {
          const meta = typeMeta(alert.response_type);
          return (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => openAlert(alert.id)}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60 focus:outline-none focus-visible:bg-muted/60 sm:px-5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  {createElement(meta.icon, { size: 15, "aria-hidden": true })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{alertTitle(alert)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {meta.chip}
                    {alert.date_entered && ` · ${formatUtcTime(alert.date_entered)}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary group-hover:underline">{meta.action}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {pending.length > SHOWN && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground sm:px-5">
          {pending.length - SHOWN} more in the bell at the top of the page.
        </p>
      )}
    </section>
  );
}
