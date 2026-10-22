import { createElement, useState } from "react";
import { Bell, BellRing, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSystemAlerts } from "./systemAlertsContext";
import { typeMeta } from "./alertUi";
import { alertTitle, answerLabel, formatUtcTime } from "./systemAlertUtils";

const TABS = [["pending", "Waiting"], ["past", "Past alerts"]];

/** Top-bar bell: the badge counts unanswered alerts; the list opens any alert. */
export default function AlertBell() {
  const { available, alerts, pendingCount, blockingCount, openAlert, openPending } = useSystemAlerts();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("pending");
  if (!available) return null;

  const pending = alerts.filter((alert) => !alert.responded);
  const past = alerts.filter((alert) => alert.responded);
  const list = tab === "pending" ? pending : past;
  const choose = (action) => {
    setOpen(false);
    action();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={pendingCount ? `Alerts, ${pendingCount} waiting` : "Alerts"}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
        >
          {pendingCount ? <BellRing size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}
          {pendingCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-sidebar-primary">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="z-[1000] w-[min(23rem,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Alerts</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {blockingCount
              ? `${blockingCount} need${blockingCount === 1 ? "s" : ""} an answer before you clock out.`
              : pendingCount
                ? "Nothing is holding up your clock-out."
                : "You're all caught up."}
          </p>
          <div role="tablist" aria-label="Alert lists" className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {TABS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label} <span className="tabular-nums text-muted-foreground">{value === "pending" ? pending.length : past.length}</span>
              </button>
            ))}
          </div>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="tabpanel">
          {list.length === 0 ? (
            <li className="px-3 py-8 text-center text-xs text-muted-foreground">
              {tab === "pending" ? "No alerts are waiting for you." : "Alerts you answer will appear here."}
            </li>
          ) : list.map((alert) => {
            const meta = typeMeta(alert.response_type);
            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => choose(() => openAlert(alert.id))}
                  className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn(
                    "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                    alert.responded ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                  )}>
                    {createElement(alert.responded ? CheckCircle2 : meta.icon, { size: 15, "aria-hidden": true })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold text-foreground">{alertTitle(alert)}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {alert.responded ? `You answered ${answerLabel(alert.answer)}` : meta.chip}
                      {alert.date_entered && ` · ${formatUtcTime(alert.date_entered)}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {tab === "pending" && pending.length > 1 && (
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => choose(openPending)}
              className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Go through all {pending.length}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
