import { Flame, Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CopyItemButton from "./CopyItemButton";

/** Toast for a notification that just arrived over the socket: opens its route, copies its `copy_item`. */
export default function NotificationToast({ visible, title, hot, copyItem, onOpen, onClose }) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto w-[min(23rem,calc(100vw-2rem))] rounded-xl border border-border bg-card text-card-foreground shadow-lg transition-all duration-200 motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <div className="flex items-start gap-1 p-1.5">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
        >
          <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", hot ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
            {hot ? <Flame size={15} aria-hidden="true" /> : <Inbox size={15} aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{hot ? "Important notification" : "New notification"}</span>
            <span className="mt-0.5 block text-sm font-semibold text-foreground line-clamp-2">{title}</span>
            <span className="mt-0.5 block text-xs text-primary">Open</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {copyItem && <CopyItemButton value={copyItem} className="mb-3 ml-14 mr-3 max-w-[calc(100%-4.25rem)]" />}
    </div>
  );
}
