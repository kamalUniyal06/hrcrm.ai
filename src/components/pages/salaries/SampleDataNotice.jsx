import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown wherever salary figures appear: the salary data is sample data for testing, not real pay. */
export default function SampleDataNotice({ className }) {
  return (
    <p role="note" className={cn("flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground", className)}>
      <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
      This is sample data for testing.
    </p>
  );
}
