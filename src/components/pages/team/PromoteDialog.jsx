import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useLookups, usePromote, useSalary } from "../../../queries/hr.queries";
import { personName } from "../../../utils/hrOrg";
import { computeSalary, dayKey, salaryComponents, salaryFormValues } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, fieldClass, primaryButton } from "../org/orgUi";
import { SalaryFields, SalaryPreview } from "../profile/SalaryForm";

const bySeniority = (a, b) => (Number(b.role_level) || 0) - (Number(a.role_level) || 0) || String(a.name).localeCompare(String(b.name));

/**
 * Promotes one person: new designation, job role and manager, optionally with a salary revision,
 * logged as one Promotion event. `canReviseSalary` offers the salary step.
 */
export default function PromoteDialog({ open, onClose, person, canReviseSalary = false }) {
  const id = person?.id ?? person?.employee_id;
  const name = personName(person);
  const lookups = useLookups();
  const salary = useSalary(id, { enabled: canReviseSalary && Boolean(id) });
  const promote = usePromote();
  const current = canReviseSalary ? salary.data?.current : null;
  const [form, setForm] = useState({ designation: "", roleId: "", managerId: "", effectiveDate: dayKey(new Date()), remarks: "", withSalary: false, values: null });
  const values = form.values ?? salaryFormValues(current);
  const set = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((state) => ({ ...state, [key]: value }));
  };
  const roles = useMemo(() => [...(lookups.data?.roles ?? [])].sort(bySeniority), [lookups.data]);
  const managers = useMemo(
    () => (lookups.data?.employees ?? []).filter((employee) => employee.id && employee.id !== id),
    [lookups.data, id],
  );
  const nothingChosen = !form.designation.trim() && !form.roleId;
  const noEarnings = form.withSalary && computeSalary(values).gross <= 0;

  const submit = (event) => {
    event.preventDefault();
    promote.mutate(
      {
        employeeId: id,
        newDesignation: form.designation.trim(),
        roleId: form.roleId,
        reportingPersonId: form.managerId,
        effectiveDate: form.effectiveDate,
        remarks: form.remarks.trim(),
        salary: form.withSalary ? salaryComponents(values) : null,
      },
      {
        onSuccess: (result) => {
          toast.success(`${name} promoted${result?.promotion?.designation ? ` to ${result.promotion.designation}` : ""}`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={`Promote ${name}`}
      description="Changes take effect together and appear as one Promotion on their career timeline."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="promote-designation" className="text-sm font-semibold text-foreground">New designation</label>
          <input id="promote-designation" maxLength={100} value={form.designation} onChange={set("designation")} placeholder={person?.designation || person?.current_designation || "e.g. Senior developer"} className={fieldClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="promote-role" className="text-sm font-semibold text-foreground">Job role <span className="font-normal text-muted-foreground">(optional)</span></label>
            <select id="promote-role" value={form.roleId} onChange={set("roleId")} disabled={lookups.isPending} className={fieldClass}>
              <option value="">Keep the current role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}{role.role_level ? ` · level ${role.role_level}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="promote-manager" className="text-sm font-semibold text-foreground">Reports to <span className="font-normal text-muted-foreground">(optional)</span></label>
            <select id="promote-manager" value={form.managerId} onChange={set("managerId")} disabled={lookups.isPending} className={fieldClass}>
              <option value="">Keep the current manager</option>
              {managers.map((employee) => <option key={employee.id} value={employee.id}>{personName(employee)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="promote-date" className="text-sm font-semibold text-foreground">Effective date</label>
            <input id="promote-date" type="date" required value={form.effectiveDate} onChange={set("effectiveDate")} className={fieldClass} />
          </div>
        </div>
        <div>
          <label htmlFor="promote-remarks" className="text-sm font-semibold text-foreground">Remarks <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="promote-remarks" rows={2} value={form.remarks} onChange={set("remarks")} className={cn(fieldClass, "py-2")} />
        </div>

        {canReviseSalary && (
          <div className="space-y-4 rounded-xl border border-border p-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
              <input type="checkbox" checked={form.withSalary} onChange={set("withSalary")} disabled={salary.isLoading} className="size-4 accent-primary" />
              Also revise their salary
            </label>
            {form.withSalary && (
              <>
                <SalaryFields idPrefix="promote" values={values} onChange={(next) => setForm((state) => ({ ...state, values: next }))} />
                <SalaryPreview values={values} currentGross={current?.gross_monthly} />
              </>
            )}
          </div>
        )}

        {nothingChosen && <p className="text-sm text-muted-foreground">Enter a new designation or pick a job role to continue.</p>}
        {noEarnings && <p className="text-sm text-destructive">Add at least one earning, such as Basic, or untick the salary step.</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={promote.isPending || nothingChosen || noEarnings} className={primaryButton}>{promote.isPending ? "Saving…" : "Promote"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}
