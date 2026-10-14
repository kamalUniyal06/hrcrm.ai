import { BriefcaseBusiness, Camera, Check, GraduationCap, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Personal details", short: "Personal", icon: UserRound },
  { label: "Skills", short: "Skills", icon: Sparkles },
  { label: "Experience", short: "Work", icon: BriefcaseBusiness },
  { label: "Education", short: "Education", icon: GraduationCap },
  { label: "Photo & ID", short: "Photo / ID", icon: Camera },
];

export default function ProfileSetupProgress({ active, completed, disabled, onStepChange }) {
  return (
    <nav aria-label="Profile setup" className="mb-7 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Your profile</p>
        <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{completed.length} of {steps.length} steps saved</p>
      </div>
      <div role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed.length} aria-valuetext={`${completed.length} of ${steps.length} steps saved`} className="mt-3 grid grid-cols-5 gap-1.5">
        {steps.map((item, index) => <span key={item.label} className={cn("h-1.5 rounded-full bg-muted", completed.includes(index) && "bg-primary")} />)}
      </div>
      <ol aria-label="Profile setup steps" className="mt-4 grid grid-cols-5 gap-1 sm:gap-3">
        {steps.map(({ label, short, icon }, index) => {
          const Icon = icon;
          const current = active === index;
          const done = completed.includes(index);
          const canReturn = done && index < active;
          return (
            <li key={label} aria-current={current ? "step" : undefined}>
              <button
                type="button"
                disabled={disabled || !canReturn}
                onClick={() => onStepChange(index)}
                aria-label={`${label}, ${current ? "current step" : done ? "saved" : "upcoming"}${canReturn ? ", go back to this step" : ""}`}
                className="group flex w-full flex-col items-center gap-2 rounded-xl px-0.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary enabled:hover:bg-accent disabled:cursor-default"
              >
                <span className={cn(
                  "grid size-11 place-items-center rounded-full border border-border bg-muted text-muted-foreground transition-colors motion-reduce:transition-none",
                  current && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/10",
                  done && !current && "border-primary/20 bg-accent text-primary",
                )}>
                  {done && !current ? <Check size={19} aria-hidden="true" /> : <Icon size={19} aria-hidden="true" />}
                </span>
                <span className={cn("text-[11px] leading-4 text-muted-foreground sm:text-xs", done && "text-foreground", current && "font-semibold text-primary")}>
                  <span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span>
                </span>
                <span className="hidden text-[11px] leading-4 text-muted-foreground sm:block">{current ? "In progress" : done ? "Saved" : "Upcoming"}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
