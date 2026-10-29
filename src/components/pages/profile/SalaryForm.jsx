import { useState } from "react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useReviseSalary } from "../../../queries/hr.queries";
import {
  REVISION_TYPES,
  SALARY_COMPONENT_GROUPS,
  computeSalary,
  dayKey,
  formatDate,
  formatMoney,
  revisionPercent,
  salaryComponents,
  salaryFormValues,
} from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, fieldClass, primaryButton } from "../org/orgUi";

/** One amount input per salary component, grouped into earnings, deductions and employer cost. */
export function SalaryFields({ idPrefix, values, onChange }) {
  return (
    <div className="space-y-4">
      {SALARY_COMPONENT_GROUPS.map(([title, fields]) => (
        <fieldset key={title}>
          <legend className="text-xs font-semibold text-muted-foreground">{title}</legend>
          <div className="mt-1 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {fields.map(([key, label]) => (
              <div key={key}>
                <label htmlFor={`${idPrefix}-${key}`} className="text-sm font-medium text-foreground">{label}</label>
                <input
                  id={`${idPrefix}-${key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={values[key] ?? ""}
                  onChange={(event) => onChange({ ...values, [key]: event.target.value })}
                  placeholder="0"
                  className={cn(fieldClass, "tabular-nums")}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/** Live totals for the values being typed, and the change from the current gross. */
export function SalaryPreview({ values, currentGross }) {
  const totals = computeSalary(values);
  const change = revisionPercent(currentGross, totals.gross);
  return (
    <div aria-live="polite" className="rounded-xl bg-muted px-3 py-3">
      <dl className="grid grid-cols-3 gap-2">
        {[["Gross / month", totals.gross], ["Net / month", totals.net], ["CTC / year", totals.ctc]].map(([name, value]) => (
          <div key={name} className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">{name}</dt>
            <dd className="truncate text-sm font-semibold tabular-nums text-foreground">{formatMoney(value)}</dd>
          </div>
        ))}
      </dl>
      {change !== null && (
        <p className={cn("mt-2 text-xs font-medium", change < 0 ? "text-destructive" : "text-muted-foreground")}>
          {change === 0 ? "Gross pay is unchanged" : `Gross pay ${change > 0 ? "goes up" : "goes down"} ${Math.abs(change)}% from ${formatMoney(currentGross)}`}
        </p>
      )}
    </div>
  );
}

/**
 * Records a new salary version for `employeeId`, starting from `current` (the structure in force).
 * The backend refuses an effective date before the current structure's.
 */
export function ReviseSalaryDialog({ open, onClose, employeeId, name, current }) {
  const revise = useReviseSalary();
  const minDate = current?.id ? current.effective_from : undefined;
  const blank = () => ({ values: salaryFormValues(current), effectiveFrom: dayKey(new Date()), revisionType: "increment", remarks: "" });
  const [form, setForm] = useState(blank);
  const set = (key) => (event) => setForm((state) => ({ ...state, [key]: event.target.value }));
  const close = () => {
    setForm(blank());
    onClose();
  };
  const noEarnings = computeSalary(form.values).gross <= 0;

  const submit = (event) => {
    event.preventDefault();
    revise.mutate(
      {
        employeeId,
        components: salaryComponents(form.values),
        effectiveFrom: form.effectiveFrom,
        revisionType: form.revisionType,
        remarks: form.remarks.trim(),
      },
      { onSuccess: () => { toast.success("Salary revised"); close(); }, onError: (error) => toast.error(error.message) },
    );
  };

  return (
    <ActionDialog
      open={open}
      onClose={close}
      title={name ? `Revise ${name}'s salary` : "Revise salary"}
      description="This adds a new salary version from the date you pick and logs it on the career timeline. Earlier versions stay in the history."
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="revise-type" className="text-sm font-semibold text-foreground">Reason</label>
            <select id="revise-type" value={form.revisionType} onChange={set("revisionType")} className={fieldClass}>
              {REVISION_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="revise-from" className="text-sm font-semibold text-foreground">Effective from</label>
            <input id="revise-from" type="date" required min={minDate} value={form.effectiveFrom} onChange={set("effectiveFrom")} className={fieldClass} />
            {minDate && <p className="mt-1 text-xs text-muted-foreground">Not before {formatDate(minDate)}, when the current pay started.</p>}
          </div>
        </div>
        <SalaryFields idPrefix="revise" values={form.values} onChange={(values) => setForm((state) => ({ ...state, values }))} />
        <SalaryPreview values={form.values} currentGross={current?.gross_monthly} />
        <div>
          <label htmlFor="revise-remarks" className="text-sm font-semibold text-foreground">Remarks <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="revise-remarks" rows={2} value={form.remarks} onChange={set("remarks")} className={cn(fieldClass, "py-2")} />
        </div>
        {noEarnings && <p className="text-sm text-destructive">Add at least one earning, such as Basic.</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={revise.isPending || noEarnings} className={primaryButton}>{revise.isPending ? "Saving…" : "Save revision"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}
