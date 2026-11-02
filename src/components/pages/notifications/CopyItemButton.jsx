import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

/** Copies a notification's `copy_item` (leave token code, meeting link) without opening the notification. */
export default function CopyItemButton({ value, className }) {
  const [copied, setCopied] = useState(false);
  const copy = (event) => {
    event.stopPropagation();
    if (!navigator.clipboard) return toast.error("Your browser blocked copying. Select the text and copy it instead.");
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => toast.error("Your browser blocked copying. Select the text and copy it instead."),
    );
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : `Copy ${value}`}
      className={cn(
        "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
        className,
      )}
    >
      <span className="truncate font-mono">{value}</span>
      {copied ? <Check size={14} className="shrink-0 text-primary" aria-hidden="true" /> : <Copy size={14} className="shrink-0" aria-hidden="true" />}
      <span className="shrink-0">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
