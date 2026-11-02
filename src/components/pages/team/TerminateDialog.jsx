import { useState } from "react";
import { toast } from "react-hot-toast";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLookups, useTerminateEmployee } from "../../../queries/hr.queries";
import { personName } from "../../../utils/hrOrg";
import { dayKey } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { TERMINATION_CATEGORIES as CATEGORIES } from "../employees/employeesApi";
import { ActionDialog, fieldClass, primaryButton } from "../org/orgUi";

const destructiveButton = cn(primaryButton, "bg-destructive text-destructive-foreground");

/** What the backend did: who took over, whose manager changed, who was told, and any reporting-line issues. */
function TerminationResult({ name, termination, onClose }) {
  const lookups = useLookups();
  const nameOf = (id) => {
    const employee = (lookups.data?.employees ?? []).find((item) => item.id === id);
    return employee ? personName(employee) : id;
  };
  const takenOver = termination?.taken_over_by;
  const moved = termination?.reports_moved ?? [];
  const notified = termination?.notified ?? [];
  const issues = termination?.health?.issues ?? [];

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-sm text-foreground">
        <CircleCheck size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <span>{name} is now <strong>{termination?.status || "Terminated"}</strong>.</span>
      </p>
      <dl className="space-y-3 rounded-xl border border-border p-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Taken over by</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {takenOver?.id ? `${nameOf(takenOver.id)}${takenOver.interim ? " (interim)" : ""}` : "No one"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Reports moved</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {moved.length ? (
              <ul className="space-y-0.5">
                {moved.map((item) => <li key={item.id}>{nameOf(item.id)} → {nameOf(item.now_reports_to)}</li>)}
              </ul>
            ) : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Notified</dt>
          <dd className="mt-0.5 font-medium text-foreground">{notified.length ? notified.map(nameOf).join(", ") : "No one"}</dd>
        </div>
      </dl>
      {termination?.health?.ok === false || issues.length ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="flex items-center gap-2 font-semibold"><CircleAlert size={16} aria-hidden="true" />Check the reporting lines</p>
          {issues.length > 0 && (
            <ul className="mt-1 list-disc pl-6">
              {issues.map((issue, index) => <li key={index}>{typeof issue === "string" ? issue : issue?.message || JSON.stringify(issue)}</li>)}
            </ul>
          )}
        </div>
      ) : null}
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className={primaryButton}>Done</button>
      </div>
    </div>
  );
}

/** Ends one person's employment with a reason, category and last working day, then shows what changed. */
export default function TerminateDialog({ open, onClose, person }) {
  const id = person?.id ?? person?.employee_id;
  const name = personName(person);
  const terminate = useTerminateEmployee();
  const [form, setForm] = useState({ reason: "", category: CATEGORIES[0][0], lastWorkingDay: dayKey(new Date()), confirmed: false });
  const set = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((state) => ({ ...state, [key]: value }));
  };
  const reason = form.reason.trim();

  const submit = (event) => {
    event.preventDefault();
    terminate.mutate(
      { employeeId: id, reason, category: form.category, lastWorkingDay: form.lastWorkingDay },
      {
        onSuccess: () => toast.success(`${name} has been terminated`),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={`Terminate ${name}`}
      description={terminate.isSuccess ? "Here's what changed." : "Their reports move to whoever takes over, and the people affected are notified."}
    >
      {terminate.isSuccess ? (
        <TerminationResult name={name} termination={terminate.data?.termination ?? terminate.data} onClose={onClose} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="terminate-category" className="text-sm font-semibold text-foreground">Category</label>
              <select id="terminate-category" value={form.category} onChange={set("category")} className={fieldClass}>
                {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="terminate-date" className="text-sm font-semibold text-foreground">Last working day</label>
              <input id="terminate-date" type="date" required value={form.lastWorkingDay} onChange={set("lastWorkingDay")} className={fieldClass} />
            </div>
          </div>
          <div>
            <label htmlFor="terminate-reason" className="text-sm font-semibold text-foreground">Reason</label>
            <textarea id="terminate-reason" rows={3} required value={form.reason} onChange={set("reason")} placeholder="e.g. Repeated absence without notice after two warnings" className={cn(fieldClass, "py-2")} />
            {terminate.error?.fields?.reason && <p className="mt-1 text-sm text-destructive">{terminate.error.fields.reason}</p>}
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.confirmed} onChange={set("confirmed")} className="mt-0.5 size-4 accent-primary" />
            I understand this ends {name}&apos;s employment and can't be undone from here.
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
            <button type="submit" disabled={terminate.isPending || !reason || !form.confirmed} className={destructiveButton}>
              {terminate.isPending ? "Terminating…" : "Terminate"}
            </button>
          </div>
        </form>
      )}
    </ActionDialog>
  );
}
