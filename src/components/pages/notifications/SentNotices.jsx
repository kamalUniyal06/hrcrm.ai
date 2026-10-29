import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Flame, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationReceipts, useSentNotifications } from "../../../queries/hr.queries";
import { formatDate, normalizeSentNotice, recordsOf } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, QueryState, Segmented } from "../org/orgUi";

const when = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };

function Receipts({ id }) {
  const query = useNotificationReceipts(id);
  const receipts = query.data?.receipts ?? {};
  const groups = [["seen", "Read", receipts.seen], ["unseen", "Not read yet", receipts.unseen]];
  return (
    <QueryState query={query} rows={2}>
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map(([key, label, people = []]) => (
          <section key={key} aria-label={label}>
            <h4 className="text-xs font-semibold text-muted-foreground">{label} <span className="tabular-nums">({people.length})</span></h4>
            {people.length ? (
              <ul className="mt-2 space-y-1">
                {people.map((person) => (
                  <li key={person.employee_id} className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm text-foreground">
                    <span className="min-w-0 truncate">{person.name || person.email1 || "Unnamed"}</span>
                    {key === "seen" && person.seen_at && <span className="text-[11px] text-muted-foreground">{formatDate(person.seen_at, undefined, when)}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{key === "seen" ? "Nobody yet." : "Everyone has read it."}</p>
            )}
          </section>
        ))}
      </div>
    </QueryState>
  );
}

/** Notices the viewer sent, with how many have read each. Roles that read every notice can switch to everyone's. */
export default function SentNotices({ canSeeEveryone }) {
  const [whose, setWhose] = useState("mine");
  const [openId, setOpenId] = useState(null);
  const query = useSentNotifications({ mine: !canSeeEveryone || whose === "mine" });
  const items = useMemo(() => recordsOf(query.data, ["items", "records", "data"]).map(normalizeSentNotice), [query.data]);

  return (
    <div className="space-y-4">
      {canSeeEveryone && <Segmented label="Whose notices" options={[["mine", "Sent by me"], ["everyone", "Everyone's"]]} value={whose} onChange={setWhose} />}
      <QueryState query={query} rows={4}>
        {items.length ? (
          <ul className="space-y-2">
            {items.map((item) => {
              const open = openId === item.id;
              return (
                <li key={item.id} className={cn(candidateStyles.card, "p-1.5")}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
                  >
                    {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        {item.hot && <Flame size={14} className="shrink-0 text-destructive" aria-label="Important" />}
                        <span className="truncate">{item.title}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[item.audience, formatDate(item.date, undefined, when)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      <span className="tabular-nums font-semibold text-foreground">{item.seen}</span> of <span className="tabular-nums">{item.recipients}</span> read
                    </span>
                  </button>
                  {open && <div className="border-t border-border px-3 py-3"><Receipts id={item.id} /></div>}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Send} title="Nothing sent yet">Notices you send to your team show up here with who has read them.</EmptyState>
        )}
      </QueryState>
    </div>
  );
}
