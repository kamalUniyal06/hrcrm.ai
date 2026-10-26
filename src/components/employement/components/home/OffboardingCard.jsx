import { ChevronRight, DoorOpen, PartyPopper } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import InsightCard, { InsightAvatar, InsightEmpty, InsightError, MiniMetric } from "./InsightCard";
import { OFFBOARDING_APPROVALS, OFFBOARDING_TASKS, tint } from "./adminInsights";

const APPROVAL_COLOR = "var(--attendance-late)";
const CHECKOUT_COLOR = "var(--primary)";

function ProgressRing({ percent, color }) {
  return (
    <span
      role="img"
      aria-label={`${percent}% of exit steps done`}
      className="grid size-11 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${percent}%, var(--muted) 0)` }}
    >
      <span className="grid size-[34px] place-items-center rounded-full bg-card text-[10px] font-semibold tabular-nums text-foreground">{percent}%</span>
    </span>
  );
}

/** Employees with an open offboarding case, least progressed first. */
export default function OffboardingCard({ cases = [], loading, error, onRetry, onOpen, onViewAll, onFilter }) {
  const awaiting = cases.filter((item) => !item.progress.approvalsReady).length;
  const checkout = cases.length - awaiting;

  return (
    <InsightCard
      icon={DoorOpen}
      color="var(--attendance-absent)"
      title="Exit"
      subtitle="Employees on their way out"
      badge={loading || error ? null : cases.length}
      onViewAll={onViewAll}
    >
      <div className="grid grid-cols-2 gap-2">
        <MiniMetric label="Awaiting approvals" value={loading || error ? "—" : awaiting} color={APPROVAL_COLOR} onClick={() => onFilter("pending")} />
        <MiniMetric label="Checkout in progress" value={loading || error ? "—" : checkout} color={CHECKOUT_COLOR} onClick={() => onFilter("progress")} />
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        {error ? (
          <InsightError message="Exit cases could not be loaded." onRetry={onRetry} />
        ) : loading ? (
          <ul className="space-y-2">{[0, 1, 2].map((index) => <li key={index}><Skeleton height={58} borderRadius={12} /></li>)}</ul>
        ) : cases.length === 0 ? (
          <InsightEmpty icon={PartyPopper} title="No one is leaving">Open resignations will show up here.</InsightEmpty>
        ) : (
          <ul className="max-h-[296px] space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
            {cases.map((item) => {
              const color = item.progress.approvalsReady ? CHECKOUT_COLOR : APPROVAL_COLOR;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-border hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <InsightAvatar name={item.name} color="var(--attendance-absent)" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded-full px-2 py-0.5 font-semibold" style={{ color, backgroundColor: tint(color, 12) }}>
                          {item.progress.approvalsReady ? `Checklist ${item.progress.tasks}/${OFFBOARDING_TASKS.length}` : `Approvals ${item.progress.approvals}/${OFFBOARDING_APPROVALS.length}`}
                        </span>
                        <span className="truncate">{item.noticePeriod ? `${item.noticePeriod} days notice` : item.designation || item.email}</span>
                      </span>
                    </span>
                    <ProgressRing percent={item.progress.percent} color={color} />
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </InsightCard>
  );
}
