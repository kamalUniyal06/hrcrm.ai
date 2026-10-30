import { BadgeIndianRupee, ChevronRight, Inbox } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import InsightCard, { InsightAvatar, InsightEmpty, InsightError, MiniMetric } from "./InsightCard";
import { MaskedAmount, SalaryRevealButton } from "../../../ui/MaskedAmount";
import { requestIdentity, requestedAnnualSalary } from "../../api/incrementAdminData";
import { appliedDate } from "../../../pages/candidates/candidateView";

const COMPLETE_COLOR = "var(--attendance-present)";
const AWAITING_COLOR = "var(--attendance-late)";
const amountFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Latest increment requests with questionnaire progress. `overview` comes from requestOverview(). */
export default function IncrementRequestsCard({ overview, loading, error, onRetry, onViewAll, onFilter, onOpen, limit = 5 }) {
  const rows = overview?.rows || [];
  const answeredShare = overview?.total ? Math.round((overview.complete / overview.total) * 100) : 0;
  const blank = loading || error;

  return (
    <InsightCard
      icon={BadgeIndianRupee}
      color="var(--attendance-present)"
      title="Increment requests"
      subtitle="Compensation requests from employees"
      badge={blank ? null : overview?.awaiting ? `${overview.awaiting} open` : null}
      onViewAll={onViewAll}
      actions={<SalaryRevealButton className="size-8 border-transparent bg-transparent" />}
    >
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric label="Total" value={blank ? "—" : overview.total} color="var(--primary)" onClick={onViewAll} />
        <MiniMetric label="Answered" value={blank ? "—" : overview.complete} color={COMPLETE_COLOR} onClick={() => onFilter("complete")} />
        <MiniMetric label="Awaiting" value={blank ? "—" : overview.awaiting} color={AWAITING_COLOR} onClick={() => onFilter("awaiting")} />
      </div>

      {!blank && overview.total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
            <span>Questionnaires completed</span>
            <span className="tabular-nums text-foreground">{answeredShare}%</span>
          </div>
          <div role="progressbar" aria-label="Questionnaires completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={answeredShare} className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted">
            <span className="h-full rounded-full transition-[width] duration-700" style={{ width: `${answeredShare}%`, background: `linear-gradient(90deg, var(--primary), ${COMPLETE_COLOR})` }} />
          </div>
        </div>
      )}

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        {error ? (
          <InsightError message="Increment requests could not be loaded." onRetry={onRetry} />
        ) : loading ? (
          <ul className="space-y-2">{[0, 1, 2].map((index) => <li key={index}><Skeleton height={52} borderRadius={12} /></li>)}</ul>
        ) : rows.length === 0 ? (
          <InsightEmpty icon={Inbox} title="No increment requests yet">New requests from employees will appear here.</InsightEmpty>
        ) : (
          <ul className="space-y-1.5">
            {rows.slice(0, limit).map(({ record, progress }) => {
              const identity = requestIdentity(record);
              const salary = requestedAnnualSalary(record);
              const percent = progress.total ? Math.round((progress.answered / progress.total) * 100) : 0;
              const color = progress.complete ? COMPLETE_COLOR : AWAITING_COLOR;
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(identity)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-border hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <InsightAvatar name={identity.name} color="var(--attendance-present)" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{identity.name}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <span className="block h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {progress.total ? `${progress.answered}/${progress.total} answered` : "No questions"} · {appliedDate(record)}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums text-foreground">{salary === null ? "—" : <MaskedAmount label={`${identity.name} requested salary`}>{amountFormat.format(salary)}</MaskedAmount>}</span>
                      <span className="block text-[10px] text-muted-foreground">requested / yr</span>
                    </span>
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
