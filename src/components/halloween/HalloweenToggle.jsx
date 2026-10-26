import { cn } from "@/lib/utils";
import { Pumpkin } from "./HalloweenArt";
import { setHalloweenTheme, useHalloweenThemeOn } from "./halloweenPreference";
import { useShowHalloween } from "./useShowHalloween";

/** Top-bar switch for the Halloween decorations. Off until the person turns it on. */
export default function HalloweenToggle() {
  const allowed = useShowHalloween();
  const on = useHalloweenThemeOn();
  if (!allowed) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Halloween theme"
      title={on ? "Turn off the Halloween theme" : "Turn on the Halloween theme"}
      onClick={() => setHalloweenTheme(!on)}
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 rounded-xl border px-2.5 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fb923c] active:scale-[0.98]",
        on ? "border-[#f97316] bg-[#fff7ed]" : "border-border bg-card hover:border-[#f97316]/60",
      )}
    >
      <Pumpkin size={22} glow={on} className={cn("transition", !on && "opacity-50 grayscale")} />
      <span
        aria-hidden="true"
        className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-[#ea580c]" : "bg-muted-foreground/30")}
      >
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}
