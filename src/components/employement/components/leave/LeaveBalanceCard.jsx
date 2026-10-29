import { useId } from "react";
import Skeleton from "react-loading-skeleton";
import { Wallet } from "lucide-react";
import { useLeaveBalance } from "../../../../queries/hr.queries";
import { normalizeLeaveBalance } from "../../../../utils/hrRecords";

const days = (value) => `${Number.isInteger(value) ? value : value.toFixed(1)} ${value === 1 ? "day" : "days"}`;

/**
 * Planned, sick and total leave available, plus what's been used and how leave builds up.
 * Without `employeeId` it is the signed-in employee's own balance.
 */
export default function LeaveBalanceCard({ employeeId, title = "My leave balance", className = "mb-4" }) {
  const query = useLeaveBalance(employeeId);
  const titleId = useId();
  // The balance is extra information; the leave pages still work without it.
  if (query.isError) return null;
  const balance = normalizeLeaveBalance(query.data);
  const tiles = [
    ["Total available", balance.total],
    ["Planned leave", balance.planned],
    ["Sick leave", balance.sick],
    ["Used this year", balance.usedThisYear],
  ];

  return (
    <section aria-labelledby={titleId} data-tour={employeeId ? undefined : "leave-balance"} className={`${className} rounded-2xl border border-border bg-card p-4 sm:p-5`}>
      <h2 id={titleId} className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
        <Wallet size={16} className="text-primary" aria-hidden="true" /> {title}
      </h2>
      {query.isPending ? (
        <Skeleton className="mt-3" height={56} borderRadius={12} />
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted px-3 py-2.5">
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums text-foreground">{days(value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {balance.monthlyAccrual > 0 && <>{employeeId ? "Earns" : "You earn"} {days(balance.monthlyAccrual)} of leave each month. </>}
            {balance.unpaidDays > 0 ? <>{days(balance.unpaidDays)} taken as unpaid this year. </> : null}
            Leave beyond {employeeId ? "the" : "your"} balance is unpaid.
          </p>
        </>
      )}
    </section>
  );
}
