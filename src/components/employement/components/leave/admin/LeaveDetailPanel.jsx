import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Check, ExternalLink, FileText, Loader2, MessageSquareText, Paperclip, ShieldCheck, UserCheck, X } from "lucide-react";
import { getLeaveDocuments } from "../../../api/leaves.api";
import { useEmployeeLeaveTokens } from "../../../../../queries/hr.queries";
import { normalizeLeaveToken, recordsOf, tokenForLeave } from "../../../../../utils/hrRecords";
import { clean, employeeDisplayName, employeeFor, formatDate, statusOf } from "./leaveAdminUtils";
import LeaveDetails, { LeaveDetailRow } from "../LeaveDetails";
import LeaveBalanceCard from "../LeaveBalanceCard";

/** When the leave was applied for, and which team lead or manager gave permission (the leave code), with their note. */
function RequestAndPermission({ record, employeeId }) {
  const query = useEmployeeLeaveTokens(employeeId);
  const token = useMemo(() => tokenForLeave(recordsOf(query.data, ["tokens"]).map(normalizeLeaveToken), record), [query.data, record]);

  let body;
  if (query.isPending && query.fetchStatus !== "idle") body = <p className="pt-2.5 text-xs text-muted-foreground">Loading who gave permission…</p>;
  else if (query.isError) body = <p className="pt-2.5 text-xs text-muted-foreground">{query.error?.code === 403 ? "Your role can't see who gave this person permission." : "Couldn't load who gave permission."}</p>;
  else if (!token) body = <p className="pt-2.5 text-sm text-muted-foreground">No team lead or manager permission is linked to this request.</p>;
  else {
    body = (
      <dl className="divide-y divide-border">
        <div className="flex gap-3 py-2.5">
          <UserCheck size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">Permission given by</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {token.issuedByName || "Not recorded"}
              {token.issuedByRelation && <span className="font-normal text-muted-foreground"> · {token.issuedByRelation}</span>}
            </dd>
          </div>
        </div>
        <div className="flex gap-3 py-2.5">
          <MessageSquareText size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">Note from {token.issuedByName || "the team lead or manager"}</dt>
            <dd className={`mt-0.5 whitespace-pre-wrap wrap-break-word text-sm ${token.remarks ? "font-medium text-foreground" : "text-muted-foreground"}`}>{token.remarks || "No note left"}</dd>
          </div>
        </div>
        {token.reason && (
          <div className="flex gap-3 py-2.5">
            <MessageSquareText size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <dt className="text-xs text-muted-foreground">What the employee asked</dt>
              <dd className="mt-0.5 whitespace-pre-wrap wrap-break-word text-sm font-medium text-foreground">{token.reason}</dd>
            </div>
          </div>
        )}
      </dl>
    );
  }

  return (
    <section aria-labelledby="leave-request-permission" className="rounded-2xl border border-border bg-card p-4">
      <h3 id="leave-request-permission" className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck size={16} className="text-primary" aria-hidden="true" />Request &amp; permission</h3>
      <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-accent px-3 py-2.5 text-sm text-foreground">
        <CalendarClock size={18} className="shrink-0 text-primary" aria-hidden="true" />
        <span className="text-muted-foreground">Applied on</span>
        <span className="font-semibold">{formatDate(record.date_entered)}</span>
      </div>
      <div className="mt-1">{body}</div>
    </section>
  );
}

// A row in the leave card, shown only when the request has attachments (or they failed to load).
function LeaveDocuments({ leaveId }) {
  const documents = useQuery({ queryKey: ["leaves", "documents", leaveId], queryFn: () => getLeaveDocuments(leaveId), enabled: Boolean(leaveId) });
  if (documents.isError) return <LeaveDetailRow icon={Paperclip} label="Attachments" muted>Couldn&apos;t load the attachments.</LeaveDetailRow>;
  if (!documents.data?.length) return null;
  return (
    <LeaveDetailRow icon={Paperclip} label={documents.data.length === 1 ? "Attachment" : "Attachments"}>
      <span className="mt-1 flex flex-col gap-1.5">
        {documents.data.map((document) => {
          const url = clean(document.image_url || document.file_url);
          const name = clean(document.filename || document.name) || "Leave document";
          return url ? (
            <a key={document.id} href={url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 font-semibold text-primary underline-offset-2 hover:underline">
              <FileText size={15} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{name}</span>
              <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span key={document.id} className="inline-flex max-w-full items-center gap-2"><FileText size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{name}</span></span>
          );
        })}
      </span>
    </LeaveDetailRow>
  );
}

export default function LeaveDetailPanel({ record, employeeMap, mutation, onClose, onDecide }) {
  useEffect(() => {
    if (!record) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [record, onClose]);

  if (!record) return null;
  const employee = employeeFor(record, employeeMap);
  const name = employeeDisplayName(record, employee);
  const pending = mutation.isPending && mutation.variables?.id === record.id;
  const decide = (status) => onDecide(record, status);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/35 backdrop-blur-[2px]" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="leave-detail-title" className="flex h-full w-full max-w-lg flex-col bg-background shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between border-b border-border bg-background p-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Leave request</p><h2 id="leave-detail-title" className="mt-1 text-xl font-semibold tracking-tight">{name}</h2><p className="mt-1 text-sm text-muted-foreground">{employee?.email1 || "Email not provided"}</p></div>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onClose(); }} className="relative z-10 rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close request details"><X size={20} /></button>
        </header>
        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <LeaveDetails record={record}><LeaveDocuments leaveId={record.id} /></LeaveDetails>
          <RequestAndPermission record={record} employeeId={employee?.id || record.employee_id || record.hrc_employees_hrc_leaves_1hrc_employees_ida} />
          {employee?.id && <LeaveBalanceCard employeeId={employee.id} title="Leave balance" className="" />}
        </div>
        {statusOf(record) === "Applied" && <footer className="flex shrink-0 gap-3 border-t border-border bg-background p-5"><button type="button" disabled={pending} onClick={() => decide("Rejected")} className="flex-1 rounded-xl border border-destructive/25 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50">Reject</button><button type="button" disabled={pending} onClick={() => decide("Accepted")} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">{pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}Approve</button></footer>}
      </aside>
    </div>
  );
}
