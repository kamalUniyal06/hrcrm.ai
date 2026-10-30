import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShowAllSalaries } from "@/hooks/useShowAllSalaries";
import { MASKED_AMOUNT, requestSalaryAccess, salaryVisibility } from "@/utils/salaryVisibility";

/**
 * A salary amount, masked as "₹ ******" until someone presses SalaryRevealButton.
 * `children` is the formatted amount; `label` names it for screen readers.
 */
export function MaskedAmount({ children, label = "amount", className }) {
  const shown = useShowAllSalaries();
  if (shown) return children;
  return (
    <span className={cn("tracking-wider text-muted-foreground", className)}>
      <span aria-hidden="true">{MASKED_AMOUNT}</span>
      <span className="sr-only">{label} hidden</span>
    </span>
  );
}

/** The one eye icon that shows or hides every salary amount in the app. */
export function SalaryRevealButton({ className }) {
  const shown = useShowAllSalaries();
  const toggle = async () => {
    if (shown) return salaryVisibility.setShowAll(false);
    if (await requestSalaryAccess()) salaryVisibility.setShowAll(true);
  };
  const label = shown ? "Hide salary amounts" : "Show salary amounts";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={shown}
      aria-label={label}
      title={label}
      className={cn("inline-grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none", shown && "text-primary", className)}
    >
      {shown ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
    </button>
  );
}
