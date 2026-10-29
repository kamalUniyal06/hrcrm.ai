import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMarkNotifications, useNotificationCounts, useNotifications } from "../../../queries/hr.queries";
import { normalizeNotification, notificationCounts, recordsOf } from "../../../utils/hrRecords";
import NotificationItem from "./NotificationItem";
import { useOpenNotification } from "./useOpenNotification";

const LIST_KEYS = ["notifications", "records", "items", "data"];

function LatestNotifications({ onClose }) {
  const latest = useNotifications({ status: "unseen" });
  const open = useOpenNotification();
  const items = useMemo(() => recordsOf(latest.data, LIST_KEYS).slice(0, 6).map(normalizeNotification), [latest.data]);

  if (latest.isPending) return <p className="px-3 py-8 text-center text-xs text-muted-foreground">Loading…</p>;
  if (latest.isError) return <p className="px-3 py-8 text-center text-xs text-muted-foreground">{latest.error?.message}</p>;
  if (!items.length) return <p className="px-3 py-8 text-center text-xs text-muted-foreground">You've read everything. New notices from HR will appear here.</p>;
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.id}><NotificationItem item={item} compact onOpen={(picked) => open(picked, onClose)} /></li>
      ))}
    </ul>
  );
}

/** Header button for HR notifications: unread count, a red dot for important ones, and the latest unread. */
export default function NotificationBell() {
  const counts = useNotificationCounts();
  const mark = useMarkNotifications();
  const [open, setOpen] = useState(false);
  // Shown once counts load, so users without the notifications area (candidates, 403) never see it.
  if (!counts.data) return null;
  const { unseen, unseenHot } = notificationCounts(counts.data);

  const markAll = () =>
    mark.mutate({ all: true }, { onSuccess: () => toast.success("All notifications marked as read"), onError: (error) => toast.error(error.message) });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour="notification-bell"
          aria-label={unseen ? `Notifications, ${unseen} unread${unseenHot ? `, ${unseenHot} important` : ""}` : "Notifications"}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
        >
          <Inbox size={18} aria-hidden="true" />
          {unseen > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground ring-2 ring-background">
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
          {unseenHot > 0 && <span className="absolute bottom-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-card" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="z-1000 w-[min(23rem,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unseen ? `${unseen} unread${unseenHot ? `, ${unseenHot} important` : ""}` : "You're all caught up."}
            </p>
          </div>
          {unseen > 0 && (
            <button type="button" onClick={markAll} disabled={mark.isPending} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-accent disabled:opacity-50">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {open && <LatestNotifications onClose={() => setOpen(false)} />}
        </div>
        <div className="border-t border-border p-2">
          <Link to="/notifications" onClick={() => setOpen(false)} className="flex min-h-10 w-full items-center justify-center rounded-xl text-sm font-semibold text-primary hover:bg-accent">
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
