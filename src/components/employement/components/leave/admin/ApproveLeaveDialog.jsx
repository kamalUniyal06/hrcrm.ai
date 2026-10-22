import { useId, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, X } from "lucide-react";
import { employeeOptions } from "../../alerts/systemAlertUtils";
import { clean, employeeDisplayName, employeeFor, formatDate } from "./leaveAdminUtils";

const SUGGESTIONS = ["Leave balance is available", "Work handover is arranged", "Reason is genuine and supported"];
const MAX_LENGTH = 500;
const fieldClass = "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const errorText = "mt-1 text-xs font-medium text-destructive";

/**
 * Approving a leave asks who approves it, who covers the work and why.
 * The approver defaults to the signed-in admin.
 */
export default function ApproveLeaveDialog({ record, employees = [], employeeMap, pending, error, onCancel, onConfirm }) {
  const ids = { reason: useId(), approver: useId(), handover: useId() };
  const currentUserId = useSelector((state) => clean(state.user.userInfo?.id));
  const options = useMemo(() => employeeOptions(employees), [employees]);
  const leaveEmployeeId = clean(record?.employee_id || record?.hrc_employees_hrc_leaves_1hrc_employees_ida);
  const [approvedById, setApprovedById] = useState(() =>
    clean(record?.approved_by_id) || (options.some((option) => option.id === currentUserId) ? currentUserId : ""));
  const [handoverToId, setHandoverToId] = useState(() => clean(record?.work_handed_over_to_id));
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const trimmed = reason.trim();
  const name = record ? employeeDisplayName(record, employeeFor(record, employeeMap)) : "";
  const dates = record ? `${formatDate(record.leave_from)}${record.leave_to && record.leave_to !== record.leave_from ? ` – ${formatDate(record.leave_to)}` : ""}` : "";
  const handoverOptions = options.filter((option) => option.id !== leaveEmployeeId);

  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (trimmed && approvedById) onConfirm({ reason: trimmed, approvedById, handoverToId });
  };

  return (
    <Dialog.Root open={Boolean(record)} onOpenChange={(open) => { if (!open && !pending) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[111] flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">Approve leave</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">These details are saved with the leave and shown to the employee.</Dialog.Description>
              </div>
              <Dialog.Close disabled={pending} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50">
                <X size={18} />
              </Dialog.Close>
            </header>

            <fieldset disabled={pending} className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
              {record && (
                <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-3 text-sm">
                  <div className="col-span-2"><dt className="text-xs text-muted-foreground">Employee</dt><dd className="mt-0.5 font-semibold text-foreground">{name}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Dates</dt><dd className="mt-0.5 font-medium text-foreground">{dates}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Type · days</dt><dd className="mt-0.5 font-medium text-foreground">{record.type_of_leave || "Leave"} · {record.leave_days || "—"}</dd></div>
                  {record.description && (
                    <div className="col-span-2"><dt className="text-xs text-muted-foreground">Employee&apos;s reason</dt><dd className="mt-0.5 line-clamp-3 text-foreground/80">{record.description}</dd></div>
                  )}
                </dl>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={ids.approver} className="text-sm font-semibold text-foreground">Approved by</label>
                  <select id={ids.approver} value={approvedById} onChange={(event) => setApprovedById(event.target.value)} aria-invalid={submitted && !approvedById} className={fieldClass}>
                    <option value="">Choose an approver</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}{option.id === currentUserId ? " (you)" : ""}</option>
                    ))}
                  </select>
                  {submitted && !approvedById && <p className={errorText}>Choose who is approving.</p>}
                </div>
                <div>
                  <label htmlFor={ids.handover} className="text-sm font-semibold text-foreground">
                    Work handed over to <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <select id={ids.handover} value={handoverToId} onChange={(event) => setHandoverToId(event.target.value)} className={fieldClass}>
                    <option value="">No handover</option>
                    {handoverOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={ids.reason} className="text-sm font-semibold text-foreground">Reason for approval</label>
                <textarea
                  id={ids.reason}
                  value={reason}
                  onChange={(event) => setReason(event.target.value.slice(0, MAX_LENGTH))}
                  rows={3}
                  aria-invalid={submitted && !trimmed}
                  placeholder="e.g. Leave balance is available and the work has been handed over."
                  className={`${fieldClass} resize-y`}
                />
                <div className="mt-1 flex items-start justify-between gap-3">
                  {submitted && !trimmed ? <p className="text-xs font-medium text-destructive">Add a reason to approve this leave.</p> : <span />}
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{reason.length}/{MAX_LENGTH}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick reasons">
                  {SUGGESTIONS.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => setReason(suggestion)} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            </fieldset>

            <footer className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
              <Dialog.Close type="button" disabled={pending} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50">
                Cancel
              </Dialog.Close>
              <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">
                {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                Approve leave
              </button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
