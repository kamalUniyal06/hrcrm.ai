import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { CheckCheck, Inbox, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarkNotifications, useNotificationCounts, useNotifications } from "../../../queries/hr.queries";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { normalizeNotification, notificationCounts, pageCount, recordsOf } from "../../../utils/hrRecords";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, QueryState, Segmented } from "../org/orgUi";
import ComposeNotice from "./ComposeNotice";
import NotificationItem from "./NotificationItem";
import SentNotices from "./SentNotices";
import { useOpenNotification } from "./useOpenNotification";

const STATUSES = [["all", "All"], ["unseen", "Unread"], ["seen", "Read"]];
const TYPES = [["all", "All types"], ["hot", "Important"], ["general", "General"]];

function InboxList() {
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const query = useNotifications({ status, type, page });
  const open = useOpenNotification();

  const items = useMemo(() => recordsOf(query.data, ["notifications", "records", "items", "data"]).map(normalizeNotification), [query.data]);
  const totalPages = pageCount(query.data);
  const filter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Segmented label="Show" options={STATUSES} value={status} onChange={filter(setStatus)} />
        <Segmented label="Type" options={TYPES} value={type} onChange={filter(setType)} />
      </div>

      <QueryState query={query} rows={6}>
        {items.length ? (
          <ul className={cn(candidateStyles.card, "space-y-1 p-2")}>
            {items.map((item) => <li key={item.id}><NotificationItem item={item} onOpen={open} /></li>)}
          </ul>
        ) : (
          <EmptyState icon={Inbox} title={status === "unseen" ? "No unread notifications" : "No notifications here"}>
            When HR sends a notice or something changes on your requests, it shows up here.
          </EmptyState>
        )}
      </QueryState>

      {totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={candidateStyles.ghost}>Previous</button>
          <span className="text-xs text-muted-foreground">Page <span className="tabular-nums">{page}</span> of <span className="tabular-nums">{totalPages}</span></span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className={candidateStyles.ghost}>Next</button>
        </nav>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const counts = notificationCounts(useNotificationCounts().data);
  const mark = useMarkNotifications();
  const access = useHrAccess();
  // `send` is true when the role can create notifications in any scope.
  const canSend = access.can("notifications", "send");
  const canSeeEveryone = access.scopeOf("notifications", "read") === "all";
  const [composing, setComposing] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = canSend && params.get("tab") === "sent" ? "sent" : "inbox";
  const show = (next) => setParams(next === "inbox" ? {} : { tab: next }, { replace: true });

  const markAll = () =>
    mark.mutate({ all: true }, { onSuccess: () => toast.success("All notifications marked as read"), onError: (error) => toast.error(error.message) });

  return (
    <main className={candidateStyles.page}>
      <CandidatePageHeader
        icon={Inbox}
        eyebrow="Inbox"
        title="Notifications"
        description={canSend ? "Notices from HR, updates on your requests, and notices you send to your team." : "Notices from HR and updates about your requests and bookings."}
      >
        <div className="flex flex-wrap gap-2">
          {tab === "inbox" && (
            <button type="button" onClick={markAll} disabled={!counts.unseen || mark.isPending} className={candidateStyles.ghost}>
              <CheckCheck size={16} aria-hidden="true" /> Mark all read
            </button>
          )}
          {canSend && (
            <button type="button" onClick={() => setComposing(true)} data-tour="notice-compose" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none">
              <PenLine size={16} aria-hidden="true" /> Compose
            </button>
          )}
        </div>
      </CandidatePageHeader>

      {canSend && (
        <div role="tablist" aria-label="Notifications" className="inline-flex rounded-lg bg-muted p-1">
          {[["inbox", "Inbox"], ["sent", "Sent"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`notice-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`notice-panel-${id}`}
              onClick={() => show(id)}
              className={cn("min-h-10 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none", tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <section role={canSend ? "tabpanel" : undefined} id={`notice-panel-${tab}`} aria-labelledby={canSend ? `notice-tab-${tab}` : undefined}>
        {tab === "sent" ? <SentNotices canSeeEveryone={canSeeEveryone} /> : <InboxList />}
      </section>

      {canSend && <ComposeNotice open={composing} onClose={() => setComposing(false)} />}
    </main>
  );
}
