import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { AlertTriangle, Copy, Loader2, Smartphone, X } from "lucide-react";
import { phoneLink } from "./hauntedOfficeToken";

/** A QR code of the employee's own game link, to play on a phone. */
export default function HauntedOfficeQrDialog({ open, onOpenChange, makeLink, playerName }) {
  const [state, setState] = useState({ status: "idle", link: "", reachable: true });

  // A fresh link (and token) each time the popup opens.
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setState({ status: "loading", link: "", reachable: true });
    makeLink()
      .then((link) => active && setState({ status: "ready", ...phoneLink(link, window.location.hostname) }))
      .catch(() => active && setState({ status: "error", link: "", reachable: true }));
    return () => {
      active = false;
    };
  }, [open, makeLink]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.link);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1002] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#f97316]/40 bg-card text-card-foreground shadow-2xl focus:outline-none">
          <header className="flex items-start gap-3 bg-gradient-to-br from-[#2e1065] to-[#7c2d12] px-5 py-4 text-white">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <Smartphone size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold leading-snug">Play on your phone</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-orange-100">
                Scan with your phone camera to open Haunted Office.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white">
              <X size={18} />
            </Dialog.Close>
          </header>

          <div className="px-5 py-5">
            <div className="mx-auto grid size-[232px] place-items-center rounded-2xl border border-border bg-white p-3">
              {state.status === "ready" ? (
                <QRCodeSVG value={state.link} size={208} level="M" marginSize={0} title="Haunted Office game link" />
              ) : state.status === "error" ? (
                <p className="px-4 text-center text-sm text-destructive">Couldn&apos;t make your code. Close this and try again.</p>
              ) : (
                <Loader2 size={24} className="animate-spin text-[#ea580c]" aria-label="Making your code" />
              )}
            </div>

            {state.status === "ready" && !state.reachable && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--attendance-late)]/40 bg-[var(--attendance-late)]/10 p-3 text-xs leading-5 text-foreground">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--attendance-late)]" aria-hidden="true" />
                This link points to localhost, so a phone can&apos;t open it. Use the game&apos;s public address, or open this app from your computer&apos;s network address.
              </p>
            )}

            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              This code signs you in as <span className="font-semibold text-foreground">{playerName}</span>. Keep it to yourself.
            </p>

            {state.status === "ready" && (
              <button
                type="button"
                onClick={copy}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Copy size={15} aria-hidden="true" /> Copy link
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
