import { createElement, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { ArrowLeft, BellRing, CircleCheck, CirclePause, Clock3, Eye, Pencil, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { selectIsAdmin } from "@/utils/pageAccess";
import { pageGutter } from "../components/home/homeUi";
import { announcementPreview } from "../components/home/homeDashboardUtils";
import AnnouncementDialog from "../components/home/AnnouncementDialog";
import { parseActivityTime } from "../components/attendance/adminAttendanceUtils";
import AlertForm from "../components/alerts/AlertForm";
import AlertStatusDialog from "../components/alerts/AlertStatusDialog";
import { ANSWER_TONES, badgeClass, typeMeta } from "../components/alerts/alertUi";
import {
  AUDIENCES,
  RESPONSE_TYPES,
  alertBadges,
  alertExpiresAt,
  alertTitle,
  answerLabel,
  audienceOf,
  countAnswers,
  formatDateKey,
  formatExpiry,
  responseTypeOf,
} from "../components/alerts/systemAlertUtils";
import { deleteSystemAlert, fetchSystemAlertResponses } from "../api/systemAlerts.api";

const FILTERS = [
  { id: "all", label: "All alerts", icon: BellRing },
  { id: "live", label: "Live now", icon: CircleCheck },
  { id: "inactive", label: "Turned off", icon: CirclePause },
  { id: "expired", label: "Expired", icon: Clock3 },
];
const iconButton = "grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const postedOn = (alert) => {
  const time = parseActivityTime(alert.date_entered);
  return time ? { label: formatDateKey(time.date), stamp: time.stamp } : { label: "", stamp: 0 };
};

export default function SystemAlertsPage() {
  const isAdmin = useSelector(selectIsAdmin);
  const [params, setParams] = useSearchParams();
  const creating = params.get("view") === "create";
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const [statusAlert, setStatusAlert] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["system-alerts", "admin-responses"],
    queryFn: fetchSystemAlertResponses,
    enabled: isAdmin,
  });
  const deletion = useMutation({
    mutationFn: deleteSystemAlert,
    onSuccess: () => {
      setDeleteTarget(null);
      setConfirmed(false);
      void queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      toast.success("Alert deleted.");
    },
  });

  // One row per alert, newest first, with its status and answer totals.
  const rows = useMemo(() => (query.data || [])
    .filter((group) => !group.alert.unavailable)
    .map(({ alert, responses }) => ({
      alert,
      responses: responses.length,
      counts: countAnswers(responses),
      status: alertBadges(alert)[0].label.toLowerCase(),
      posted: postedOn(alert),
    }))
    .sort((a, b) => b.posted.stamp - a.posted.stamp), [query.data]);
  const counts = {
    all: rows.length,
    live: rows.filter((row) => row.status === "live").length,
    inactive: rows.filter((row) => row.status === "inactive").length,
    expired: rows.filter((row) => row.status === "expired").length,
  };
  const term = search.trim().toLowerCase();
  const visible = rows.filter((row) => (filter === "all" || row.status === filter) && (!term || alertTitle(row.alert).toLowerCase().includes(term)));
  const orphaned = (query.data || []).filter((group) => group.alert.unavailable).reduce((sum, group) => sum + group.responses.length, 0);

  const openCreate = () => setParams({ view: "create" });
  const closeForm = () => {
    setEditing(null);
    if (creating) setParams({});
  };
  const startDelete = (alert) => {
    setDeleteTarget(alert);
    setConfirmed(false);
    deletion.reset();
  };

  if (!isAdmin) return null;

  if (creating || editing) {
    return (
      <div className={`${pageGutter} mx-auto w-full max-w-[1400px] space-y-5`}>
        <div>
          <button type="button" onClick={closeForm} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <ArrowLeft size={16} aria-hidden="true" /> All alerts
          </button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{editing ? "Edit alert" : "New alert"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editing ? "Changes reach employees the next time their alerts refresh." : "Write the message, choose who gets it and how they answer."}
          </p>
        </div>
        <AlertForm
          key={editing?.id || "new"}
          alert={editing}
          responseCount={rows.find((row) => row.alert.id === editing?.id)?.responses || 0}
          onSaved={closeForm}
          onCancel={closeForm}
        />
      </div>
    );
  }

  return (
    <div className={`${pageGutter} mx-auto w-full max-w-[1400px] space-y-5`}>
      <header className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/70 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Employee communication</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">System alerts</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Send alerts to your team and see who has responded.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} aria-label="Refresh alerts" className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:bg-muted disabled:opacity-50">
            <RefreshCw size={17} className={cn(query.isFetching && "animate-spin")} />
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Plus size={17} aria-hidden="true" /> New alert
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {FILTERS.map(({ id, label, icon }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-3 rounded-2xl p-4 text-left ring-1 transition active:scale-[0.99] sm:gap-4",
                active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15 ring-primary" : "bg-card ring-border/70 hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", active ? "bg-primary-foreground/15" : "bg-primary/10 text-primary")}>
                {createElement(icon, { size: 19, "aria-hidden": true })}
              </span>
              <span>
                <span className="block text-2xl font-semibold tabular-nums">{query.isPending ? "—" : counts[id]}</span>
                <span className={cn("block text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section aria-label="Alerts" className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/70">
        <div className="border-b border-border p-4">
          <label className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 sm:max-w-sm">
            <Search size={16} className="text-muted-foreground" aria-hidden="true" />
            <input type="search" aria-label="Search alerts" placeholder="Search alerts by title" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent py-2.5 text-sm outline-none" />
          </label>
        </div>

        {query.isPending ? (
          <ul aria-busy="true">
            {[0, 1, 2].map((index) => (
              <li key={index} className="flex animate-pulse items-center gap-4 border-b border-border p-5 last:border-0">
                <span className="h-10 w-10 rounded-xl bg-muted" />
                <span className="flex-1 space-y-2"><span className="block h-4 w-2/5 rounded bg-muted" /><span className="block h-3 w-3/5 rounded bg-muted" /></span>
              </li>
            ))}
          </ul>
        ) : query.isError ? (
          <div role="alert" className="p-8 text-center text-sm text-destructive">
            {query.error?.message || "Could not load alerts."}{" "}
            <button type="button" onClick={() => query.refetch()} className="font-semibold underline">Try again</button>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><BellRing size={22} aria-hidden="true" /></span>
            <p className="mt-4 font-semibold text-foreground">{rows.length ? "No alerts match" : "No alerts yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length ? "Try another search or status." : "Send your first alert to the team."}</p>
            {!rows.length && (
              <button type="button" onClick={openCreate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} aria-hidden="true" /> New alert</button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map(({ alert, responses, counts: answers, posted }) => {
              const type = responseTypeOf(alert);
              const status = alertBadges(alert)[0];
              const expiry = alertExpiresAt(alert);
              const preview = announcementPreview(alert.description);
              return (
                <li key={alert.id} className="flex flex-col gap-3 p-4 transition hover:bg-muted/40 sm:p-5 lg:flex-row lg:items-center lg:gap-6">
                  <button
                    type="button"
                    onClick={() => setStatusAlert(alert)}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", status.label === "Live" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {createElement(typeMeta(type).icon, { size: 18, "aria-hidden": true })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="break-words font-semibold text-foreground">{alertTitle(alert)}</span>
                        <span className={badgeClass(status.tone)}>{status.label}</span>
                      </span>
                      {preview && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{preview}</span>}
                      <span className="mt-1.5 block text-xs text-muted-foreground">
                        {AUDIENCES[audienceOf(alert)]} · {RESPONSE_TYPES[type].label}
                        {expiry && ` · ${status.label === "Expired" ? "Ended" : "Until"} ${formatExpiry(expiry)}`}
                        {posted.label && ` · Sent ${posted.label}`}
                      </span>
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5 pl-[52px] lg:w-64 lg:justify-end lg:pl-0">
                    {responses ? Object.entries(answers).map(([answer, count]) => (
                      <span key={answer} className={badgeClass(ANSWER_TONES[answer] || "neutral")}>
                        {answerLabel(answer)} <span className="tabular-nums">{count}</span>
                      </span>
                    )) : <span className="text-xs text-muted-foreground">No responses yet</span>}
                  </div>

                  <div className="flex items-center gap-1 pl-[52px] lg:pl-0">
                    <button type="button" onClick={() => setStatusAlert(alert)} className="mr-1 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15">
                      <Users size={14} aria-hidden="true" /> Who responded
                    </button>
                    <button type="button" onClick={() => setPreview(alert)} aria-label={`Preview ${alertTitle(alert)}`} title="Preview" className={iconButton}><Eye size={16} /></button>
                    <button type="button" onClick={() => setEditing(alert)} aria-label={`Edit ${alertTitle(alert)}`} title="Edit" className={iconButton}><Pencil size={16} /></button>
                    <button type="button" onClick={() => startDelete(alert)} aria-label={`Delete ${alertTitle(alert)}`} title="Delete" className={cn(iconButton, "hover:bg-destructive/10 hover:text-destructive")}><Trash2 size={16} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {orphaned > 0 && !query.isPending && (
          <p className="border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
            {orphaned} older response{orphaned === 1 ? " belongs" : "s belong"} to alerts that were deleted.
          </p>
        )}
      </section>

      <AlertStatusDialog alert={statusAlert} onClose={() => setStatusAlert(null)} />
      <AnnouncementDialog announcement={preview} onClose={() => setPreview(null)} />

      <AlertDialog.Root open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deletion.isPending) setDeleteTarget(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[110] bg-black/50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[111] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl">
            <AlertDialog.Title className="text-xl font-semibold">Delete this alert?</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Deleting “{deleteTarget ? alertTitle(deleteTarget) : ""}” also removes all its employee responses. This can’t be undone.
              To stop showing it but keep the answers, edit it and turn it off instead.
            </AlertDialog.Description>
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
              <input type="checkbox" checked={confirmed} disabled={deletion.isPending} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
              <span>I have collected the response data I need.</span>
            </label>
            {deletion.isError && (
              <p role="alert" className="mt-3 text-sm text-destructive">{deletion.error?.message || "Could not delete the alert."}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel disabled={deletion.isPending} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">Cancel</AlertDialog.Cancel>
              <button type="button" disabled={!confirmed || deletion.isPending} onClick={() => deletion.mutate(deleteTarget.id)} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">
                {deletion.isPending ? "Deleting..." : "Delete alert"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
