import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlertStatus } from "../../queries/systemAlerts.queries";
import { ANSWER_TONES, badgeClass } from "./alertUi";
import { alertBadges, alertTitle, answerLabel, formatUtcTime } from "./systemAlertUtils";

const TABS = [["responded", "Responded"], ["pending", "Pending"]];

/** HR view of one alert: how many of its targets answered, what they said, and who is left. */
export default function AlertStatusDialog({ alert, onClose }) {
  const status = useAlertStatus(alert?.id, { enabled: Boolean(alert) });
  const [tab, setTab] = useState("responded");
  const [search, setSearch] = useState("");
  const data = status.data;
  const term = search.trim().toLowerCase();
  const people = (data?.[tab] || []).filter((person) => !term || person.name.toLowerCase().includes(term) || person.email.toLowerCase().includes(term));
  const percent = data?.targetCount ? Math.round((data.respondedCount / data.targetCount) * 100) : 0;

  return (
    <Dialog.Root open={Boolean(alert)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
          <header className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold leading-snug text-foreground">{alertTitle(data?.alert || alert)}</Dialog.Title>
              <Dialog.Description className="sr-only">Who has responded to this alert and who is still pending.</Dialog.Description>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {alertBadges(data?.alert || alert).map((badge) => <span key={badge.key} className={badgeClass(badge.tone)}>{badge.label}</span>)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => status.refetch()}
              disabled={status.isFetching}
              aria-label="Refresh responses"
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw size={17} className={status.isFetching ? "animate-spin" : ""} />
            </button>
            <Dialog.Close aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <X size={18} />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {status.isPending ? (
              <p role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 size={17} className="animate-spin" /> Loading responses…
              </p>
            ) : status.isError ? (
              <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                {status.error?.status === 403
                  ? "Only HR can see who responded to an alert."
                  : status.error?.message || "Could not load the responses."}{" "}
                {status.error?.status !== 403 && (
                  <button type="button" onClick={() => status.refetch()} className="font-semibold underline">Try again</button>
                )}
              </div>
            ) : (
              <>
                <section aria-label="Response progress" className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-3xl font-semibold tabular-nums text-foreground">{data.respondedCount}</span>
                      {" "}of {data.targetCount} responded
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">{percent}%</p>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={data.targetCount} aria-valuenow={data.respondedCount} aria-label="Responses received">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(data.answerCounts).map(([answer, count]) => (
                      <span key={answer} className={badgeClass(ANSWER_TONES[answer] || "neutral")}>
                        {answerLabel(answer)} <span className="tabular-nums">{count}</span>
                      </span>
                    ))}
                    <span className={badgeClass("warning")}>Pending <span className="tabular-nums">{data.pendingCount}</span></span>
                  </div>
                </section>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div role="tablist" aria-label="Response lists" className="flex gap-1 rounded-lg bg-muted p-1">
                    {TABS.map(([value, text]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                        className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                      >
                        {text} <span className="tabular-nums text-muted-foreground">{data[value].length}</span>
                      </button>
                    ))}
                  </div>
                  <label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 sm:max-w-xs">
                    <Search size={15} className="text-muted-foreground" aria-hidden="true" />
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search employees" className="w-full bg-transparent py-2 text-sm outline-none" />
                  </label>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-border" role="tabpanel">
                  {people.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      {term ? "No one matches your search." : tab === "pending" ? "Everyone has responded." : "No responses yet."}
                    </p>
                  ) : (
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Name</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Email</th>
                          {tab === "responded" && <th scope="col" className="px-4 py-2.5 font-semibold">Answer</th>}
                          {tab === "responded" && <th scope="col" className="px-4 py-2.5 font-semibold">Answered</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {people.map((person) => (
                          <tr key={person.id || person.email} className="border-b border-border last:border-0">
                            <td className="px-4 py-3 font-medium text-foreground">{person.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{person.email || "—"}</td>
                            {tab === "responded" && (
                              <td className="px-4 py-3"><span className={badgeClass(ANSWER_TONES[person.answer] || "neutral")}>{answerLabel(person.answer)}</span></td>
                            )}
                            {tab === "responded" && (
                              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatUtcTime(person.answeredAt) || "—"}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
