import { ChevronRight, Plus, ReceiptText, Wallet } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import InsightCard, { InsightEmpty, InsightError, MiniMetric } from "./InsightCard";
import { amountOf, daysOutstanding, formatAmount, isPaid } from "../../../pages/quotations/quotationUtils";

const UNPAID_COLOR = "var(--attendance-absent)";
const PAID_COLOR = "var(--attendance-present)";
const compact = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(amount || 0);

/** Unpaid office-work quotations for the admin home page. `summary` comes from quotationSummary(). */
export default function QuotationAlertsCard({ records = [], summary, loading, error, onRetry, onViewAll, onOpen, onFilter, onCreate, limit = 4 }) {
  const unpaid = records.filter((record) => !isPaid(record));
  const blank = loading || error;

  return (
    <div data-tour="quotation-alerts">
      <InsightCard
        icon={ReceiptText}
        color={UNPAID_COLOR}
        title="Quotation alerts"
        subtitle="Office work waiting to be paid"
        badge={blank || !summary.unpaidCount ? null : `${summary.unpaidCount} unpaid`}
        onViewAll={onViewAll}
      >
        <div className="grid grid-cols-2 gap-2">
          <MiniMetric label="Outstanding" value={blank ? "—" : compact(summary.outstanding)} color={UNPAID_COLOR} onClick={() => onFilter("unpaid")} />
          <MiniMetric label="Paid this month" value={blank ? "—" : compact(summary.paidThisMonth)} color={PAID_COLOR} onClick={() => onFilter("paid")} />
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          {error ? (
            <InsightError message="Quotations could not be loaded." onRetry={onRetry} />
          ) : loading ? (
            <ul className="space-y-2">{[0, 1, 2].map((index) => <li key={index}><Skeleton height={48} borderRadius={12} /></li>)}</ul>
          ) : unpaid.length === 0 ? (
            <InsightEmpty icon={Wallet} title="Nothing to pay">Every quotation is settled.</InsightEmpty>
          ) : (
            <ul className="space-y-1.5">
              {unpaid.slice(0, limit).map((record) => {
                const age = daysOutstanding(record);
                return (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(record)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-border hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{record.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {record.worker_name}{age === null ? "" : ` · ${age === 0 ? "today" : `${age}d outstanding`}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatAmount(amountOf(record))}</span>
                      <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button type="button" onClick={onCreate} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
          <Plus size={14} aria-hidden="true" /> New quotation
        </button>
      </InsightCard>
    </div>
  );
}
