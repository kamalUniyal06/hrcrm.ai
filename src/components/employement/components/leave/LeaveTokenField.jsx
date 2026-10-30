import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle2, Clock, KeyRound, Loader2, Send, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeaveTokenApprovers, useLeaveTokenCheck, useLeaveTokens, useRequestLeaveToken } from "../../../../queries/hr.queries";
import { formatDate, normalizeLeaveToken, normalizeTokenApprovers, recordsOf, tokenCode, tokenDates, tokenFitsDates } from "../../../../utils/hrRecords";
import { candidateStyles } from "../../../pages/candidate/candidateStyles";
import { ActionDialog, fieldClass, primaryButton } from "../../../pages/org/orgUi";

function AskForCode({ approvers, leaveFrom, leaveTo, leaveType, onClose }) {
  const request = useRequestLeaveToken();
  const [approverId, setApproverId] = useState("");
  const [reason, setReason] = useState("");
  const dates = tokenDates(normalizeLeaveToken({ leave_from: leaveFrom, leave_to: leaveTo }));

  const submit = (event) => {
    event.preventDefault();
    request.mutate(
      { approverId, leaveFrom, leaveTo, leaveType, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success("Asked. You'll get a notification with the code.");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <ActionDialog open onClose={onClose} title="Ask for a leave code" description="Your team lead or manager gets a notification and sends you a one-time code to enter here.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="code-approver" className="text-sm font-semibold text-foreground">Ask</label>
          <select id="code-approver" value={approverId} onChange={(event) => setApproverId(event.target.value)} className={fieldClass}>
            <option value="">Everyone who can approve ({approvers.length})</option>
            {approvers.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.relation}</option>)}
          </select>
        </div>
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          {dates ? <>For <span className="font-semibold">{dates}</span>{leaveType ? `, ${leaveType}` : ""}. The code will only work for these dates if they fix them.</> : "No dates picked yet, so the code can be for any dates unless they set some."}
        </p>
        <div>
          <label htmlFor="code-reason" className="text-sm font-semibold text-foreground">Reason <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="code-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className={cn(fieldClass, "py-2")} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={request.isPending || !approvers.length} className={primaryButton}>
            <Send size={15} aria-hidden="true" /> {request.isPending ? "Asking…" : "Ask for a code"}
          </button>
        </div>
      </form>
    </ActionDialog>
  );
}

/**
 * The leave code step of the apply form, shown only while the backend requires codes. Reports
 * `{ required, valid, loading }` through `onStatus` so the form can hold the submit until the code
 * checks out for the chosen dates. Codes the employee already has can be picked instead of typed.
 */
export default function LeaveTokenField({ value, onChange, leaveFrom, leaveTo, leaveType, onStatus, inputClassName }) {
  const approversQuery = useLeaveTokenApprovers();
  const settings = useMemo(() => normalizeTokenApprovers(approversQuery.data), [approversQuery.data]);
  const required = settings.required;
  const mine = useLeaveTokens("mine", { enabled: required });
  const check = useLeaveTokenCheck({ code: value, leaveFrom, leaveTo }, { enabled: required && Boolean(leaveFrom) });
  const [asking, setAsking] = useState(false);
  const tokens = useMemo(() => recordsOf(mine.data, ["tokens"]).map(normalizeLeaveToken), [mine.data]);
  const ready = tokens.filter((token) => token.status === "issued");
  const waiting = tokens.filter((token) => token.status === "requested");
  const result = check.data?.check;
  const valid = Boolean(result?.valid) && !check.isFetching;

  useEffect(() => {
    onStatus({ required, valid, loading: approversQuery.isPending });
  }, [required, valid, approversQuery.isPending, onStatus]);

  if (approversQuery.isPending || !required) return null;

  return (
    <div className="lg:col-span-2" data-tour="leave-code">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <label htmlFor="leave-code" className="text-sm font-semibold">Leave code</label>
          <p className="mt-1 text-xs text-[var(--leave-muted)]">A one-time code from your team lead or manager. You need one to apply.</p>
        </div>
        <button type="button" onClick={() => setAsking(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Send size={15} aria-hidden="true" /> Ask for a code
        </button>
      </div>

      <div className="relative">
        <KeyRound size={18} className="pointer-events-none absolute top-1/2 left-4 mt-1 -translate-y-1/2 text-primary" aria-hidden="true" />
        <input
          id="leave-code"
          value={value}
          onChange={(event) => onChange(tokenCode(event.target.value).slice(0, 6))}
          placeholder="e.g. K7P2QX"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          aria-describedby="leave-code-status"
          aria-invalid={Boolean(result && !result.valid)}
          className={cn(inputClassName, "pl-11 font-mono text-base tracking-[0.3em] uppercase placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:normal-case")}
        />
      </div>

      <div id="leave-code-status" aria-live="polite" className="mt-2 text-xs leading-5">
        {value.length > 0 && value.length < 6 && <p className="text-[var(--leave-muted)]">Codes have 6 characters.</p>}
        {value.length === 6 && !leaveFrom && <p className="text-[var(--leave-muted)]">Pick your dates to check this code.</p>}
        {value.length === 6 && leaveFrom && check.isFetching && (
          <p className="inline-flex items-center gap-1.5 text-[var(--leave-muted)]"><Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Checking the code…</p>
        )}
        {value.length === 6 && !check.isFetching && result?.valid && (
          <p className="inline-flex items-center gap-1.5 font-semibold text-[var(--leave-green)]">
            <CheckCircle2 size={14} aria-hidden="true" /> Code is valid{result.manager?.issued_by_name ? `, from ${result.manager.issued_by_name}` : ""}.
          </p>
        )}
        {value.length === 6 && !check.isFetching && result && !result.valid && (
          <ul className="space-y-0.5 text-destructive">
            {(result.errors?.length ? result.errors : ["This code can't be used."]).map((message) => (
              <li key={message} className="flex items-start gap-1.5"><XCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{message}</li>
            ))}
          </ul>
        )}
        {check.isError && <p className="text-destructive">{check.error?.message}</p>}
      </div>

      {(ready.length > 0 || waiting.length > 0) && (
        <ul className="mt-3 space-y-2">
          {ready.map((token) => {
            const fits = tokenFitsDates(token, leaveFrom, leaveTo);
            return (
              <li key={token.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-[var(--leave-page)] px-3 py-2 text-sm">
                <span className="font-mono font-semibold tracking-widest">{token.code}</span>
                <span className="min-w-0 flex-1 text-xs text-[var(--leave-muted)]">
                  From {token.issuedByName || "your manager"}{tokenDates(token) ? ` · for ${tokenDates(token)}` : " · any dates"}
                  {token.expiresAt && ` · until ${formatDate(token.expiresAt, undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`}
                </span>
                {value === token.code ? (
                  <span className="text-xs font-semibold text-primary">In use</span>
                ) : (
                  <button type="button" onClick={() => onChange(token.code)} className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-primary hover:bg-primary/10">
                    {fits ? "Use this code" : "Use (other dates)"}
                  </button>
                )}
              </li>
            );
          })}
          {waiting.map((token) => (
            <li key={token.id} className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-[var(--leave-muted)]">
              <Clock size={14} className="shrink-0" aria-hidden="true" />
              Waiting for {token.requestedFromName || "your team lead or manager"} to send a code{tokenDates(token) ? ` for ${tokenDates(token)}` : ""}.
            </li>
          ))}
        </ul>
      )}

      {asking && <AskForCode approvers={settings.approvers} leaveFrom={leaveFrom} leaveTo={leaveTo} leaveType={leaveType} onClose={() => setAsking(false)} />}
    </div>
  );
}
