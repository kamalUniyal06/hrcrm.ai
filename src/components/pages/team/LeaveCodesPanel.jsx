import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle2, Copy, KeyRound, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIssueLeaveToken, useLeaveTokens, usePeople, useRejectLeaveToken, useRevokeLeaveToken } from "../../../queries/hr.queries";
import { personName } from "../../../utils/hrOrg";
import { LEAVE_TOKEN_STATUSES, formatDate, normalizeLeaveToken, recordsOf, tokenDates } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, EmptyState, QueryState, fieldClass, primaryButton } from "../org/orgUi";

const when = (value) => formatDate(value, undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Gives a code: for an open request (`request`), or directly to someone in the team. Shows the code once given. */
function GiveCodeDialog({ request, onClose }) {
  const issue = useIssueLeaveToken();
  const people = usePeople(undefined, { enabled: !request });
  const [form, setForm] = useState({ employeeId: "", leaveFrom: request?.leaveFrom ?? "", leaveTo: request?.leaveTo ?? "", remarks: "" });
  const [given, setGiven] = useState(null);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const choices = useMemo(() => recordsOf(people.data, ["people", "records", "data"]).filter((person) => person.id), [people.data]);
  const badDates = Boolean(form.leaveFrom && form.leaveTo && form.leaveTo < form.leaveFrom);
  const name = request?.employeeName || personName(choices.find((person) => person.id === form.employeeId)) || "them";

  const submit = (event) => {
    event.preventDefault();
    issue.mutate(
      { requestId: request?.id, employeeId: form.employeeId, leaveFrom: form.leaveFrom, leaveTo: form.leaveTo, remarks: form.remarks.trim() },
      { onSuccess: (data) => setGiven(normalizeLeaveToken(data?.token)), onError: (error) => toast.error(error.message) },
    );
  };
  const copy = () => navigator.clipboard?.writeText(given.code).then(() => toast.success("Code copied"), () => {});

  if (given) {
    return (
      <ActionDialog open onClose={onClose} title={`Code sent to ${name}`} description="They got it as a notification too. It works once, for this person only.">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="font-mono text-2xl font-semibold tracking-[0.3em] text-foreground">{given.code}</span>
            <button type="button" onClick={copy} className={candidateStyles.ghost}><Copy size={15} aria-hidden="true" /> Copy</button>
          </div>
          <p className="text-sm text-muted-foreground">
            {tokenDates(given) ? `Only for leave on ${tokenDates(given)}. ` : "For any leave dates. "}
            {given.expiresAt && `Valid until ${when(given.expiresAt)}.`}
          </p>
          <div className="flex justify-end"><button type="button" onClick={onClose} className={primaryButton}>Done</button></div>
        </div>
      </ActionDialog>
    );
  }

  return (
    <ActionDialog
      open
      onClose={onClose}
      title={request ? `Give ${request.employeeName} a leave code` : "Give a leave code"}
      description="They need this one-time code to apply for leave. Fix the dates to make it work only for that leave."
    >
      <form onSubmit={submit} className="space-y-4">
        {request ? (
          request.reason && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"><span className="font-semibold">Their reason: </span>{request.reason}</p>
        ) : (
          <div>
            <label htmlFor="give-person" className="text-sm font-semibold text-foreground">Who</label>
            <select id="give-person" required value={form.employeeId} onChange={set("employeeId")} disabled={people.isPending} className={fieldClass}>
              <option value="">{people.isPending ? "Loading your team…" : "Choose a person"}</option>
              {choices.map((person) => <option key={person.id} value={person.id}>{personName(person)}</option>)}
            </select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="give-from" className="text-sm font-semibold text-foreground">Leave from <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="give-from" type="date" value={form.leaveFrom} onChange={set("leaveFrom")} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="give-to" className="text-sm font-semibold text-foreground">Leave until <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="give-to" type="date" min={form.leaveFrom || undefined} value={form.leaveTo} onChange={set("leaveTo")} aria-invalid={badDates} className={fieldClass} />
          </div>
        </div>
        {badDates && <p className="text-sm text-destructive">The last day can't be before the first.</p>}
        <div>
          <label htmlFor="give-remarks" className="text-sm font-semibold text-foreground">Note to them <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input id="give-remarks" maxLength={255} value={form.remarks} onChange={set("remarks")} className={fieldClass} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={issue.isPending || badDates || (!request && !form.employeeId)} className={primaryButton}>
            <KeyRound size={15} aria-hidden="true" /> {issue.isPending ? "Giving…" : "Give code"}
          </button>
        </div>
      </form>
    </ActionDialog>
  );
}

function RefuseDialog({ request, onClose }) {
  const reject = useRejectLeaveToken();
  const [remarks, setRemarks] = useState("");
  const submit = (event) => {
    event.preventDefault();
    reject.mutate(
      { requestId: request.id, remarks: remarks.trim() },
      { onSuccess: () => { toast.success(`${request.employeeName} has been told`); onClose(); }, onError: (error) => toast.error(error.message) },
    );
  };
  return (
    <ActionDialog open onClose={onClose} title={`Refuse ${request.employeeName}'s request?`} description="They're told, with your reason, and can ask again for other dates.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="refuse-remarks" className="text-sm font-semibold text-foreground">Reason</label>
          <textarea id="refuse-remarks" required rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} className={cn(fieldClass, "py-2")} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={reject.isPending || !remarks.trim()} className={cn(primaryButton, "bg-destructive text-white")}>{reject.isPending ? "Refusing…" : "Refuse"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}

/**
 * Team leads and managers: open requests for leave codes (give or refuse) and the codes they've
 * given (cancel an unused one). Someone needs a code from a person above them to apply for leave.
 */
export default function LeaveCodesPanel() {
  const query = useLeaveTokens("to_issue");
  const revoke = useRevokeLeaveToken();
  const [giving, setGiving] = useState(null);
  const [refusing, setRefusing] = useState(null);
  const requests = useMemo(() => recordsOf(query.data, ["requests"]).map(normalizeLeaveToken), [query.data]);
  const given = useMemo(() => recordsOf(query.data, ["given"]).map(normalizeLeaveToken), [query.data]);
  const canIssue = query.data?.can_issue !== false;

  const cancel = (token) =>
    revoke.mutate(token.id, { onSuccess: () => toast.success(`Code ${token.code} cancelled`), onError: (error) => toast.error(error.message) });

  return (
    <QueryState query={query} rows={4}>
      {!canIssue && !requests.length && !given.length ? (
        <EmptyState icon={KeyRound} title="No one reports to you yet">People who report to you, or are in a team or department you lead, ask you for leave codes here.</EmptyState>
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="code-requests" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="code-requests" className={candidateStyles.sectionTitle}>Requests</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">People who need a code before they can apply for leave.</p>
              </div>
              <button type="button" onClick={() => setGiving({})} className={candidateStyles.ghost} data-tour="give-leave-code"><Plus size={16} aria-hidden="true" /> Give a code</button>
            </div>
            {requests.length ? (
              <ul className="space-y-3">
                {requests.map((request) => (
                  <li key={request.id} className={cn(candidateStyles.card, "p-4")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{request.employeeName}</p>
                        <p className="mt-0.5 text-sm text-foreground">
                          {tokenDates(request) || "No dates given"}{request.leaveType && <span className="text-muted-foreground"> · {request.leaveType}</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Asked {when(request.askedAt)}{request.requestedFromId ? " · to you" : " · to everyone who can approve"}</p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setGiving(request)} className={primaryButton}><KeyRound size={15} aria-hidden="true" /> Give code</button>
                        <button type="button" onClick={() => setRefusing(request)} className={cn(candidateStyles.ghost, "text-destructive hover:bg-destructive/10")}>Refuse</button>
                      </div>
                    </div>
                    {request.reason && <p className="mt-3 text-sm leading-6 text-muted-foreground">{request.reason}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn(candidateStyles.card, "flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground")}>
                <CheckCircle2 size={16} className="text-primary" aria-hidden="true" /> No one is waiting for a code.
              </p>
            )}
          </section>

          <section aria-labelledby="codes-given" className="space-y-3">
            <h2 id="codes-given" className={candidateStyles.sectionTitle}>Codes you've given</h2>
            {given.length ? (
              <ul className={cn(candidateStyles.card, "divide-y divide-border")}>
                {given.map((token) => (
                  <li key={token.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                    <span className="font-mono text-sm font-semibold tracking-widest text-foreground">{token.code || "——"}</span>
                    <span className="min-w-0 flex-1 text-sm text-foreground">
                      {token.employeeName}
                      <span className="text-muted-foreground"> · {tokenDates(token) || "any dates"}{token.status === "issued" && token.expiresAt ? ` · until ${when(token.expiresAt)}` : ""}</span>
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", token.status === "issued" ? "bg-primary/10 text-primary" : "bg-muted text-foreground")}>
                      {LEAVE_TOKEN_STATUSES[token.status] || token.status}
                    </span>
                    {token.status === "issued" && (
                      <button type="button" onClick={() => cancel(token)} disabled={revoke.isPending} className={cn(candidateStyles.ghost, "text-destructive hover:bg-destructive/10")}>Cancel code</button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn(candidateStyles.card, "px-4 py-4 text-sm text-muted-foreground")}>Codes you give appear here until they're used or expire.</p>
            )}
          </section>
        </div>
      )}

      {giving && <GiveCodeDialog request={giving.id ? giving : null} onClose={() => setGiving(null)} />}
      {refusing && <RefuseDialog request={refusing} onClose={() => setRefusing(null)} />}
    </QueryState>
  );
}
