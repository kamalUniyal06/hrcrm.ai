import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { BellRing, ChevronDown, RefreshCw, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import he from "he";
import { selectIsAdmin } from "@/utils/pageAccess";
import {
  deleteSystemAlert,
  fetchSystemAlertResponses,
} from "../api/systemAlerts.api";

const clean = (value) => String(value || "").trim();
const title = (alert) => he.decode(clean(alert.name)) || "Untitled alert";
const answer = (record) => clean(record.description).toLowerCase();

export default function SystemAlertsPage() {
  const isAdmin = useSelector(selectIsAdmin);
  const [search, setSearch] = useState("");
  const [responseFilter, setResponseFilter] = useState("");
  const [preview, setPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const queryClient = useQueryClient();
  const deletion = useMutation({
    mutationFn: deleteSystemAlert,
    onSuccess: () => {
      setDeleteTarget(null);
      setConfirmed(false);
      queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      toast.success("Alert deleted.");
    },
  });
  const query = useQuery({
    queryKey: ["system-alerts", "admin-responses"],
    queryFn: fetchSystemAlertResponses,
    enabled: isAdmin,
  });
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data || [])
      .map((group) => ({
        ...group,
        visibleResponses: group.responses.filter(
          (record) =>
            (!responseFilter || answer(record) === responseFilter) &&
            (!term ||
              title(group.alert).toLowerCase().includes(term) ||
              clean(record.name).toLowerCase().includes(term)),
        ),
      }))
      .filter(
        (group) =>
          group.visibleResponses.length ||
          (!responseFilter &&
            (!term || title(group.alert).toLowerCase().includes(term))),
      );
  }, [query.data, search, responseFilter]);

  if (!isAdmin) return null;

  return (
    <section className="space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <BellRing className="size-6 text-primary" />
            System alerts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review responses, open an alert for details, and close completed
            requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </header>
      {query.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            [
              "Alerts",
              query.data.filter((group) => !group.alert.unavailable).length,
            ],
            [
              "Responses",
              query.data.reduce(
                (sum, group) => sum + group.responses.length,
                0,
              ),
            ],
            [
              "Answered yes",
              query.data.reduce(
                (sum, group) =>
                  sum +
                  group.responses.filter((record) => answer(record) === "yes")
                    .length,
                0,
              ),
            ],
            [
              "Answered no",
              query.data.reduce(
                (sum, group) =>
                  sum +
                  group.responses.filter((record) => answer(record) === "no")
                    .length,
                0,
              ),
            ],
          ].map(([label, count]) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
                {count}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Search alerts or employee email"
          placeholder="Search alerts or employee email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm"
        />
        <select
          aria-label="Filter responses"
          value={responseFilter}
          onChange={(event) => setResponseFilter(event.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm"
        >
          <option value="">All responses</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      {query.isPending ? (
        <p role="status" className="p-8 text-center text-muted-foreground">
          Loading alerts and responses…
        </p>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 p-5 text-destructive"
        >
          {query.error?.message || "Could not load responses."} Use Refresh to
          try again.
        </div>
      ) : groups.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground">
          No alerts or responses match your filters.
        </p>
      ) : (
        groups.map(({ alert, responses, visibleResponses }) => (
          <details
            key={`${alert.id || "unlinked"}-${search}-${responseFilter}`}
            open={Boolean(search || responseFilter)}
            className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <h2 className="break-words text-base font-semibold text-foreground">
                  {title(alert)}
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {responses.length} responses <span className="mx-2">/</span>
                  <span className="text-emerald-700">
                    {
                      responses.filter((record) => answer(record) === "yes")
                        .length
                    }{" "}
                    Yes
                  </span>
                  <span className="mx-2">/</span>
                  <span className="text-red-600">
                    {
                      responses.filter((record) => answer(record) === "no")
                        .length
                    }{" "}
                    No
                  </span>
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                View responses
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/30 p-5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Response details
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{responses.length} responses</span>
                  <span className="font-medium text-emerald-700">
                    Yes:{" "}
                    {
                      responses.filter((record) => answer(record) === "yes")
                        .length
                    }
                  </span>
                  <span className="font-medium text-red-600">
                    No:{" "}
                    {
                      responses.filter((record) => answer(record) === "no")
                        .length
                    }
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {alert.description && (
                  <button
                    type="button"
                    onClick={() => setPreview(alert)}
                    className="rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                  >
                    View alert
                  </button>
                )}
                {!alert.unavailable && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(alert);
                      setConfirmed(false);
                      deletion.reset();
                    }}
                    className="flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="size-4" />
                    Delete alert
                  </button>
                )}
              </div>
            </div>
            {visibleResponses.length ? (
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        Employee email
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Response
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Responded at
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleResponses.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-5 py-4">
                          {clean(record.name) ||
                            clean(record.employee_id) ||
                            "Unknown employee"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${answer(record) === "yes" ? "bg-emerald-100 text-emerald-800" : answer(record) === "no" ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground"}`}
                          >
                            {answer(record) === "yes"
                              ? "Yes"
                              : answer(record) === "no"
                                ? "No"
                                : "Unknown"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                          {record.date_entered_uni_format ||
                            record.date_entered ||
                            "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm text-muted-foreground">
                No responses yet.
              </p>
            )}
          </details>
        ))
      )}
      <AlertDialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletion.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[110] bg-black/50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[111] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl">
            <AlertDialog.Title className="text-xl font-semibold">
              Delete this alert?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Has the objective of “{deleteTarget ? title(deleteTarget) : ""}”
              been fulfilled, and have you collected all the response data you
              need? Deleting removes this alert and all its employee responses. This
              action cannot be undone here.
            </AlertDialog.Description>
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={deletion.isPending}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span>
                Yes, the objective is complete and I have collected the response
                data.
              </span>
            </label>
            {deletion.isError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {deletion.error?.message || "Could not delete the alert."}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel
                disabled={deletion.isPending}
                className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </AlertDialog.Cancel>
              <button
                type="button"
                disabled={!confirmed || deletion.isPending}
                onClick={() => deletion.mutate(deleteTarget.id)}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
              >
                {deletion.isPending ? "Deleting..." : "Delete alert"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <Dialog.Root
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-card p-6 text-foreground shadow-xl">
            <Dialog.Title className="pr-8 text-lg font-semibold">
              {preview ? title(preview) : "Alert"}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Alert description shared with employees.
            </Dialog.Description>
            <Dialog.Close
              aria-label="Close preview"
              className="absolute right-4 top-4 rounded p-1 hover:bg-muted"
            >
              <X className="size-5" />
            </Dialog.Close>
            <div
              className="mt-5 overflow-auto break-words text-sm leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_img]:max-w-full [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  he.decode(String(preview?.description || "")),
                  { USE_PROFILES: { html: true } },
                ),
              }}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
