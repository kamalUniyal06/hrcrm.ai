import * as Dialog from "@radix-ui/react-dialog";
import he from "he";
import { Megaphone, X } from "lucide-react";
import { parseActivityTime } from "../attendance/adminAttendanceUtils";
import AlertHtml from "../alerts/AlertHtml";

function postedLabel(value) {
  const posted = parseActivityTime(value);
  if (!posted) return "Announcement";
  const day = new Date(`${posted.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return `Posted ${day} at ${posted.time}`;
}

/** Full announcement in a popup, with its HTML template rendered as designed. */
export default function AnnouncementDialog({ announcement, onClose }) {
  const title = he.decode(String(announcement?.name ?? "")).trim() || "Announcement";

  return (
    <Dialog.Root open={Boolean(announcement)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
          <header className="flex items-start gap-3 border-b border-border py-4 pl-5 pr-14 sm:pl-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Megaphone size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold leading-snug text-foreground">{title}</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                {postedLabel(announcement?.date_entered)}
              </Dialog.Description>
            </div>
          </header>
          <Dialog.Close
            aria-label="Close announcement"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} />
          </Dialog.Close>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {announcement && (
              <AlertHtml
                description={announcement.description}
                title={`${title} details`}
                emptyText="No details were added to this announcement."
              />
            )}
          </div>
          <footer className="flex justify-end border-t border-border px-5 py-3 sm:px-6">
            <Dialog.Close className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Close
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
