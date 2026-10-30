import { useMemo, useState } from "react";
import { Pencil, Wallet } from "lucide-react";
import { useSalary } from "../../../queries/hr.queries";
import { formatDate, formatMoney, normalizeSalary } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, QueryState } from "../org/orgUi";
import { ReviseSalaryDialog } from "./SalaryForm";
import SampleDataNotice from "../salaries/SampleDataNotice";

const label = (value) => String(value ?? "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Lines({ title, lines, total, totalLabel }) {
  return (
    <div className="min-w-0">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      <dl className="mt-2 divide-y divide-border">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
            <dt className="text-foreground/80">{line.label}</dt>
            <dd className="tabular-nums text-foreground">{formatMoney(line.amount)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm font-semibold">
          <dt>{totalLabel}</dt>
          <dd className="tabular-nums">{formatMoney(total)}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Pay: current structure, revision history and payslips. Without `employeeId` it is the signed-in
 * employee's own; `canRevise` adds a "Revise" button (the backend still checks the person is in scope).
 */
export default function MySalary({ employeeId, name, canRevise = false }) {
  const query = useSalary(employeeId);
  const [revising, setRevising] = useState(false);
  const salary = useMemo(() => normalizeSalary(query.data), [query.data]);
  const deductionsTotal = salary.deductions.reduce((sum, line) => sum + line.amount, 0);
  const revisable = canRevise && Boolean(employeeId);

  return (
    <QueryState query={query} rows={3}>
      {revisable && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => setRevising(true)} className={candidateStyles.ghost} data-tour="salary-revise">
            <Pencil size={15} aria-hidden="true" /> {salary.hasStructure ? "Revise" : "Set salary"}
          </button>
        </div>
      )}
      {salary.hasStructure ? (
        <div className="space-y-5">
          <SampleDataNotice />
          <dl className="grid grid-cols-3 gap-2">
            {[["Gross / month", salary.gross], ["Net / month", salary.net], ["CTC / year", salary.ctc]].map(([name, value]) => (
              <div key={name} className="rounded-xl bg-muted px-3 py-2.5">
                <dt className="text-[11px] text-muted-foreground">{name}</dt>
                <dd className="truncate text-base font-semibold tabular-nums text-foreground">{value ? formatMoney(value) : "—"}</dd>
              </div>
            ))}
          </dl>
          {salary.effectiveFrom && <p className="text-xs text-muted-foreground">Effective from {formatDate(salary.effectiveFrom)}</p>}

          <div className="grid gap-5 sm:grid-cols-2">
            <Lines title="Earnings" lines={salary.earnings} total={salary.gross} totalLabel="Gross" />
            {salary.deductions.length > 0 && <Lines title="Deductions" lines={salary.deductions} total={deductionsTotal} totalLabel="Total deductions" />}
          </div>

          {salary.revisions.length > 0 && (
            <section aria-labelledby="salary-revisions">
              <h3 id="salary-revisions" className="text-xs font-semibold text-muted-foreground">Revision history</h3>
              <ul className="mt-2 divide-y divide-border">
                {salary.revisions.map((revision, index) => (
                  <li key={revision.id ?? index} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm">
                    <span className="text-foreground">
                      {label(revision.revision_type) || "Revision"}
                      <span className="text-muted-foreground"> · {formatDate(revision.date)}</span>
                    </span>
                    {(revision.ctc ?? revision.gross) !== undefined && (
                      <span className="tabular-nums text-foreground">{formatMoney(revision.ctc ?? revision.gross)}{revision.ctc !== undefined ? " CTC / year" : " gross"}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="salary-payslips">
            <h3 id="salary-payslips" className="text-xs font-semibold text-muted-foreground">Payslips</h3>
            {salary.payslips.length ? (
              <ul className="mt-2 divide-y divide-border">
                {salary.payslips.map((slip, index) => (
                  <li key={slip.id ?? index} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm">
                    <span className="text-foreground">{slip.period || "Payslip"}</span>
                    <span className="flex items-baseline gap-3">
                      <span className="tabular-nums text-foreground">{formatMoney(slip.net)}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">{label(slip.status) || "Pending"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Payslips appear here after HR runs payroll for a month.</p>
            )}
          </section>
        </div>
      ) : (
        <EmptyState icon={Wallet} title="No salary structure yet">
          {employeeId ? "No salary details have been added for this person yet." : "HR hasn't added your salary details. Book an HR appointment if you have questions about pay."}
        </EmptyState>
      )}
      {revising && (
        <ReviseSalaryDialog open onClose={() => setRevising(false)} employeeId={employeeId} name={name} current={query.data?.current} />
      )}
    </QueryState>
  );
}
