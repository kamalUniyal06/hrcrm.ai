import { CalendarDays, Palmtree, Thermometer } from "lucide-react";
import { useLeave } from "../../context/LeaveContext";

// Display details for the leave types LeaveContext provides; unknown types fall back to a calendar.
const LEAVE_TYPES = {
  "Annual Leave": { label: "Annual leave", hint: "Planned time off", Icon: Palmtree },
  "Sick Leave": { label: "Sick leave", hint: "When you're unwell", Icon: Thermometer },
};

function BalanceSkeleton() {
  return (
    <li className="flex animate-pulse items-center gap-4 rounded-xl border border-border p-4 motion-reduce:animate-none">
      <div className="size-11 shrink-0 rounded-xl bg-[var(--leave-track)]" />
      <div className="flex-1 space-y-2"><div className="h-3.5 w-24 rounded bg-[var(--leave-track)]" /><div className="h-3 w-32 rounded bg-[var(--leave-track)]" /></div>
      <div className="h-8 w-10 rounded bg-[var(--leave-track)]" />
    </li>
  );
}

export default function LeaveBalances() {
  const { balances, leaveBalanceIsLoading } = useLeave();

  return (
    <section aria-labelledby="leave-balance-title" className="flex flex-1 flex-col rounded-2xl border border-border bg-[var(--leave-surface)] p-5 shadow-sm sm:p-6">
      <h2 id="leave-balance-title" className="text-base font-semibold text-[var(--leave-text)]">Leave balance</h2>
      <p className="pt-1 text-sm text-[var(--leave-muted)]">Days you can still apply for.</p>

      {!leaveBalanceIsLoading && balances.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-[var(--leave-muted)]">
          No leave balance found for your account. Ask HR to set it up.
        </div>
      ) : (
        <ul className="mt-4 grid flex-1 content-center gap-3 sm:grid-cols-2">
          {leaveBalanceIsLoading ? <><BalanceSkeleton /><BalanceSkeleton /></> : balances.map((item) => {
            const { label, hint, Icon } = LEAVE_TYPES[item.type] ?? { label: item.type, Icon: CalendarDays };
            const available = Number(item.available || 0);

            return (
              <li key={item.type} className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-[var(--leave-page)] p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[var(--leave-text)]">{label}</h3>
                  {hint && <p className="truncate text-xs text-[var(--leave-muted)]">{hint}</p>}
                </div>
                <p className="shrink-0 text-right">
                  <span className={`block text-3xl font-semibold leading-none tabular-nums ${available > 0 ? "text-[var(--leave-text)]" : "text-[var(--leave-muted)]"}`}>{available}</span>
                  <span className="mt-1 block text-xs text-[var(--leave-muted)]">{available > 0 ? (available === 1 ? "day left" : "days left") : "None left"}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
