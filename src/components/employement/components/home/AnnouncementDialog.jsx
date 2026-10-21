import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import DOMPurify from "dompurify";
import he from "he";
import { Megaphone, X } from "lucide-react";
import { parseActivityTime } from "../attendance/adminAttendanceUtils";

const themeToken = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

// A complete page for the iframe. Announcements are often pasted email templates, so they are
// rendered apart from the app: Tailwind's reset can't flatten their headings and lists, and
// their own <style> rules can't leak into the app. Colors and font follow the active theme.
function templateDocument(html) {
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
html { overflow-y: hidden; }
body { margin: 0; display: flow-root; background: ${themeToken("--card", "white")}; color: ${themeToken("--card-foreground", "black")}; font: 14px/1.6 ${font}; overflow-wrap: anywhere; }
body > :first-child { margin-top: 0; }
body > :last-child { margin-bottom: 0; }
img, video { max-width: 100%; height: auto; }
a { color: ${themeToken("--primary", "blue")}; }
</style></head><body>${html}</body></html>`;
}

// Sandboxed: no scripts run, links open in a new tab. The frame grows to fit its content.
function TemplateFrame({ html, title }) {
  const frameRef = useRef(null);
  const observerRef = useRef(null);
  const [height, setHeight] = useState(80);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const handleLoad = () => {
    const body = frameRef.current?.contentDocument?.body;
    if (!body) return;
    const measure = () => setHeight(Math.ceil(body.scrollHeight));
    measure();
    observerRef.current?.disconnect();
    if (typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver(measure);
      observerRef.current.observe(body);
    }
  };

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={templateDocument(html)}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      onLoad={handleLoad}
      className="block w-full border-0"
      style={{ height }}
    />
  );
}

function postedLabel(value) {
  const posted = parseActivityTime(value);
  if (!posted) return "Announcement";
  const day = new Date(`${posted.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return `Posted ${day} at ${posted.time}`;
}

/** Full announcement in a popup, with its HTML template rendered as designed. */
export default function AnnouncementDialog({ announcement, onClose }) {
  const title = he.decode(String(announcement?.name ?? "")).trim() || "Announcement";
  const html = announcement
    ? DOMPurify.sanitize(he.decode(String(announcement.description ?? "")), { USE_PROFILES: { html: true } }).trim()
    : "";

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
            {html ? (
              <TemplateFrame html={html} title={`${title} details`} />
            ) : (
              <p className="text-sm text-muted-foreground">No details were added to this announcement.</p>
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
