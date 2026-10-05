import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, FileText, Loader2, X } from "lucide-react";
import { getLeaveDocuments } from "../../../api/leaves.api";
import { approvalDate, clean, employeeDisplayName, employeeFor, formatDate, statusOf } from "./leaveAdminUtils";

function LeaveDocuments({ leaveId }) {
  const documents = useQuery({ queryKey: ["leaves", "documents", leaveId], queryFn: () => getLeaveDocuments(leaveId), enabled: Boolean(leaveId) });
  if (documents.isPending) return <p className="text-xs text-muted-foreground">Loading attachments…</p>;
  if (documents.isError) return <p className="text-xs text-destructive">Could not load attachments.</p>;
  if (!documents.data?.length) return <p className="text-xs text-muted-foreground">No attachments provided.</p>;
  return <div className="space-y-2">{documents.data.map((document) => { const url = clean(document.image_url || document.file_url); return <a key={document.id} href={url || undefined} target={url ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-muted/70 p-3 text-sm font-medium transition hover:bg-muted"><FileText size={16} className="text-primary" /><span className="min-w-0 flex-1 truncate">{clean(document.filename || document.name) || "Leave document"}</span>{url && <span className="text-xs text-primary">Open</span>}</a>; })}</div>;
}

export default function LeaveDetailPanel({ record, employeeMap, mutation, onClose }) {
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
  const decide = (status) => mutation.mutate({ id: record.id, status }, { onSuccess: onClose });
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/35 backdrop-blur-[2px]" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="leave-detail-title" className="flex h-full w-full max-w-lg flex-col bg-background shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between border-b border-border bg-background p-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Leave request</p><h2 id="leave-detail-title" className="mt-1 text-xl font-semibold tracking-tight">{name}</h2><p className="mt-1 text-sm text-muted-foreground">{employee?.email1 || "Email not provided"}</p></div>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onClose(); }} className="relative z-10 rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close request details"><X size={20} /></button>
        </header>
        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <section className="grid grid-cols-2 gap-3">{[["Leave type", record.type_of_leave || "Leave"], ["Duration", `${record.leave_days || "—"} days`], ["Applied", formatDate(record.date_entered)], ["Decision date", record.status === "Applied" ? "Pending" : formatDate(approvalDate(record))]].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</section>
          <section><p className="text-xs font-semibold text-muted-foreground">Requested leave dates</p><p className="mt-2 text-base font-semibold">{formatDate(record.leave_from)}{record.leave_to ? ` – ${formatDate(record.leave_to)}` : ""}</p></section>
          <section><p className="text-xs font-semibold text-muted-foreground">Reason</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/80">{record.description || "No reason was provided."}</p></section>
          <section><p className="mb-2 text-xs font-semibold text-muted-foreground">Attachments</p><LeaveDocuments leaveId={record.id} /></section>
        </div>
        {statusOf(record) === "Applied" && <footer className="flex shrink-0 gap-3 border-t border-border bg-background p-5"><button type="button" disabled={pending} onClick={() => decide("Rejected")} className="flex-1 rounded-xl border border-destructive/25 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50">Reject</button><button type="button" disabled={pending} onClick={() => decide("Accepted")} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">{pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}Approve</button></footer>}
      </aside>
    </div>
  );
}
