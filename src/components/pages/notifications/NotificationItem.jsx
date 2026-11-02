import { Circle, Flame, MailOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "../../../utils/hrRecords";
import CopyItemButton from "./CopyItemButton";

export default function NotificationItem({ item, onOpen, compact = false }) {
  return (
    <div className={cn("rounded-xl transition-colors hover:bg-muted motion-reduce:transition-none", !item.seen && "bg-primary/5")}>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", item.hot ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
          {item.hot ? <Flame size={15} aria-hidden="true" /> : item.seen ? <MailOpen size={15} aria-hidden="true" /> : <Circle size={10} fill="currentColor" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm text-foreground", item.seen ? "font-medium" : "font-semibold", compact && "line-clamp-2")}>{item.title}</span>
          {item.body && <span className={cn("mt-0.5 block text-xs leading-5 text-muted-foreground", compact ? "line-clamp-1" : "line-clamp-3")}>{item.body}</span>}
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {[item.hot ? "Important" : "General", item.seen ? "Read" : "Unread", formatDate(item.date, undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })].filter(Boolean).join(" · ")}
          </span>
        </span>
      </button>
      {item.copyItem && <CopyItemButton value={item.copyItem} className="mb-2.5 ml-13.5 mr-2.5 -mt-1" />}
    </div>
  );
}
