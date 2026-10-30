import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle2, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLookups, useMarkPayslipPaid, useRunPayroll } from "../../../queries/hr.queries";
import { personName } from "../../../utils/hrOrg";
import { dayKey, formatDate, formatMoney, normalizePayrollRun, previousMonth } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, EmptyState, fieldClass, primaryButton } from "../org/orgUi";
import SampleDataNotice from "./SampleDataNotice";

const monthLabel = (month) => formatDate(`${month}-01`, undefined, { month: "long", year: "numeric" }) || month;
const days = (value) => (Number.isInteger(value) ? value : value.toFixed(1));

function Totals({ run }) {
  const tiles = [
    ["People", run.totals.employees.toLocaleString()],
    ["Gross", formatMoney(run.totals.gross)],
    ["Deductions", formatMoney(run.totals.deductions)],
    ["Unpaid leave", formatMoney(run.totals.unpaidLeave)],
    ["Net to pay", formatMoney(run.totals.net)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tiles.map(([label, value]) => (
        <div key={label} className={cn(candidateStyles.card, "min-w-0 px-3 py-2.5")}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Lines({ run }) {
  if (!run.lines.length) {
    return (
      <EmptyState icon={Users} title="Nobody to pay for this month">
        No one in the selection was employed that month with a salary structure or a monthly salary.
      </EmptyState>
    );
  }
  return (
    <div className={cn(candidateStyles.card, "max-h-[45dvh] overflow-auto")}>
      <table className="w-full min-w-[46rem] text-sm">
        <caption className="sr-only">Payslips for {monthLabel(run.month)}</caption>
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-semibold">Employee</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Days paid</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Unpaid leave days</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Gross</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Deductions</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Unpaid leave</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {run.lines.map((line) => (
            <tr key={line.employeeId || line.name}>
              <th scope="row" className="px-4 py-2.5 text-left font-normal">
                <span className="block font-semibold text-foreground">{line.name}</span>
                {line.partMonth && <span className="mt-0.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">Joined or left this month</span>}
              </th>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{days(line.payableDays)} / {line.days}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{days(line.unpaidDays)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatMoney(line.gross)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatMoney(line.deductions)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatMoney(line.unpaidDeduction)}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">{formatMoney(line.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Run payroll in three steps: pick the month and who, preview every payslip (nothing is saved),
 * then save. Payslips already marked paid are never changed; pending ones are recalculated.
 */
export function RunPayrollDialog({ open, onClose }) {
  const run = useRunPayroll();
  const lookups = useLookups();
  const [month, setMonth] = useState(previousMonth);
  const [who, setWho] = useState("everyone");
  const [picked, setPicked] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(null);
  const thisMonth = dayKey(new Date()).slice(0, 7);
  const employees = useMemo(() => (lookups.data?.employees ?? []).filter((employee) => employee.id), [lookups.data]);
  const term = search.trim().toLowerCase();
  const visible = term ? employees.filter((employee) => personName(employee).toLowerCase().includes(term)) : employees;
  const employeeIds = who === "some" ? [...picked] : undefined;

  const close = () => {
    setPreview(null);
    setSaved(null);
    onClose();
  };
  const toggle = (id) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const showPreview = (event) => {
    event.preventDefault();
    run.mutate({ month, employeeIds, commit: false }, { onSuccess: (data) => setPreview(normalizePayrollRun(data)), onError: (error) => toast.error(error.message) });
  };
  const save = () => {
    run.mutate(
      { month, employeeIds, commit: true },
      {
        onSuccess: (data) => {
          const result = normalizePayrollRun(data);
          setSaved(result);
          toast.success(`Payslips saved for ${result.totals.employees} ${result.totals.employees === 1 ? "person" : "people"}`);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const result = saved ?? preview;
  return (
    <ActionDialog
      open={open}
      onClose={close}
      wide={Boolean(result)}
      title={saved ? `Payroll saved for ${monthLabel(saved.month)}` : preview ? `Check payroll for ${monthLabel(preview.month)}` : "Run payroll"}
      description={
        saved
          ? "Payslips are pending until you mark them paid. Each person sees theirs under My salary."
          : preview
            ? "Nothing is saved yet. Pay is prorated for anyone who joined or left this month, and unpaid leave is taken off."
            : "Work out every payslip for one month. You'll see them all before anything is saved."
      }
    >
      {result ? (
        <div className="space-y-4">
          <SampleDataNotice />
          <Totals run={result} />
          <Lines run={result} />
          {saved ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="inline-flex items-center gap-2 text-sm text-foreground"><CheckCircle2 size={16} className="text-primary" aria-hidden="true" /> Running this month again later only recalculates payslips that aren't paid.</p>
              <button type="button" onClick={close} className={primaryButton}>Done</button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Payslips already marked paid for this month stay as they are.</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={() => setPreview(null)} disabled={run.isPending} className={candidateStyles.ghost}>Back</button>
                <button type="button" onClick={save} disabled={run.isPending || !preview.lines.length} className={primaryButton}>
                  {run.isPending ? "Saving…" : `Save ${preview.lines.length} ${preview.lines.length === 1 ? "payslip" : "payslips"}`}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={showPreview} className="space-y-4">
          <div>
            <label htmlFor="payroll-month" className="text-sm font-semibold text-foreground">Month</label>
            <input id="payroll-month" type="month" required max={thisMonth} value={month} onChange={(event) => setMonth(event.target.value)} className={fieldClass} />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Who</legend>
            <div className="mt-1.5 flex flex-wrap gap-x-5">
              {[["everyone", "Everyone"], ["some", "Choose people"]].map(([value, label]) => (
                <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="payroll-who" value={value} checked={who === value} onChange={() => setWho(value)} className="size-4 accent-primary" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {who === "some" && (
            <div className="space-y-2">
              <label className="relative block">
                <span className="sr-only">Search people</span>
                <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name"
                  className="min-h-11 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </label>
              <ul className={cn(candidateStyles.card, "max-h-56 overflow-y-auto p-1")} aria-label="People to pay">
                {visible.map((employee) => (
                  <li key={employee.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-foreground hover:bg-accent">
                      <input type="checkbox" checked={picked.has(employee.id)} onChange={() => toggle(employee.id)} className="size-4 accent-primary" />
                      {personName(employee)}
                    </label>
                  </li>
                ))}
                {!visible.length && <li className="px-3 py-3 text-sm text-muted-foreground">{lookups.isPending ? "Loading people…" : "Nobody matches that search."}</li>}
              </ul>
              <p className="text-xs text-muted-foreground" aria-live="polite">{picked.size} selected</p>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} className={candidateStyles.ghost}>Cancel</button>
            <button type="submit" disabled={run.isPending || !month || (who === "some" && !picked.size)} className={primaryButton}>
              {run.isPending ? "Working it out…" : "Preview payslips"}
            </button>
          </div>
        </form>
      )}
    </ActionDialog>
  );
}

/** Marks one pending payslip paid, on a chosen date (default today). */
export function MarkPaidDialog({ payslip, name, onClose }) {
  const markPaid = useMarkPayslipPaid();
  const [paidOn, setPaidOn] = useState(() => dayKey(new Date()));

  const submit = (event) => {
    event.preventDefault();
    markPaid.mutate(
      { salaryId: payslip.id, paidOn },
      {
        onSuccess: () => {
          toast.success(`${name}'s payslip marked paid`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <ActionDialog open={Boolean(payslip)} onClose={onClose} title={`Mark ${name}'s payslip paid?`} description="Paid payslips are locked: running payroll again won't change them.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="paid-on" className="text-sm font-semibold text-foreground">Paid on</label>
          <input id="paid-on" type="date" required max={dayKey(new Date())} value={paidOn} onChange={(event) => setPaidOn(event.target.value)} className={fieldClass} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={markPaid.isPending || !paidOn} className={primaryButton}>{markPaid.isPending ? "Saving…" : "Mark paid"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}
