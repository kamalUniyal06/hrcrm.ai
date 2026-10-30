import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { usePayrollOverview } from "../../../queries/hr.queries";
import { SCOPE_LABELS } from "../../../utils/hrAccess";
import { formatMoney, normalizePayrollOverview } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { QueryState } from "../org/orgUi";
import SampleDataNotice from "../salaries/SampleDataNotice";
import { MaskedAmount, SalaryRevealButton } from "../../ui/MaskedAmount";

/** Headcount and current pay totals for everyone in the viewer's salary read scope. */
export default function PayOverview({ tour = "team-pay", note }) {
  const query = usePayrollOverview();
  const overview = useMemo(() => normalizePayrollOverview(query.data), [query.data]);
  const tiles = [
    ["People", overview.employees.toLocaleString()],
    ["Monthly gross", <MaskedAmount key="gross" label="monthly gross">{formatMoney(overview.monthlyGross)}</MaskedAmount>],
    ["Monthly net", <MaskedAmount key="net" label="monthly net">{formatMoney(overview.monthlyNet)}</MaskedAmount>],
    ["Annual CTC", <MaskedAmount key="ctc" label="annual CTC">{formatMoney(overview.annualCtc)}</MaskedAmount>],
  ];
  return (
    <QueryState query={query} rows={2}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1"><SampleDataNotice /></div>
          <SalaryRevealButton />
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour={tour}>
          {tiles.map(([label, value]) => (
            <div key={label} className={cn(candidateStyles.card, "min-w-0 px-4 py-3")}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Current pay for {SCOPE_LABELS[overview.scope]?.toLowerCase() || "the people you can see"}.
          {overview.withoutStructure > 0 && ` ${overview.withoutStructure} ${overview.withoutStructure === 1 ? "person has" : "people have"} no salary structure yet and ${overview.withoutStructure === 1 ? "isn't" : "aren't"} counted.`}
          {" "}{note ?? "To revise someone's pay or promote them, open them from People."}
        </p>
      </div>
    </QueryState>
  );
}
