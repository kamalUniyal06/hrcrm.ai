import { createElement, useMemo } from "react";
import he from "he";
import { CalendarDays, CheckCircle2, Clock3, Handshake, MessageSquareText, UserCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployeesDirectory } from "../home/homeDashboard.queries";
import { clean, formatDate, leaveApproval, statusOf } from "./admin/leaveAdminUtils";

const STATUS = {
  Applied: { label: "Awaiting review", icon: Clock3, tone: "border-[var(--attendance-late)]/30 bg-[var(--attendance-late)]/10 text-[var(--attendance-late)]" },
  Accepted: { label: "Approved", icon: CheckCircle2, tone: "border-[var(--attendance-present)]/30 bg-[var(--attendance-present)]/10 text-[var(--attendance-present)]" },
  Rejected: { label: "Rejected", icon: XCircle, tone: "border-[var(--attendance-absent)]/30 bg-[var(--attendance-absent)]/10 text-[var(--attendance-absent)]" },
};

const employeeName = (employee) =>
  clean(employee.name) || [employee.first_name, employee.last_name].map(clean).filter(Boolean).join(" ");

export function LeaveDetailRow({ icon, label, children, muted = false }) {
  return (
    <div className="flex gap-3 py-2.5">
      {createElement(icon, { size: 16, className: "mt-0.5 shrink-0 text-muted-foreground", "aria-hidden": true })}
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={cn("mt-0.5 whitespace-pre-wrap break-words text-sm", muted ? "text-muted-foreground" : "font-medium text-foreground")}>{children}</dd>
      </div>
    </div>
  );
}

/**
 * Everything about one leave: dates, the employee's reason, and the decision
 * (who approved it, why, and who covers the work). Used by HR and by employees.
 * `children` adds rows (LeaveDetailRow) after the employee's reason.
 */
export default function LeaveDetails({ record, className, children }) {
  const employees = useEmployeesDirectory();
  const nameById = useMemo(
    () => new Map((employees.data || []).map((employee) => [clean(employee.id), employeeName(employee)])),
    [employees.data],
  );
  if (!record) return null;
  const status = STATUS[statusOf(record)];
  const approval = leaveApproval(record, nameById);
  const decided = statusOf(record) !== "Applied";
  const accepted = statusOf(record) === "Accepted";
  const dates = `${formatDate(record.leave_from)}${clean(record.leave_to) && record.leave_to !== record.leave_from ? ` – ${formatDate(record.leave_to)}` : ""}`;
  const days = clean(record.leave_days);
  const pending = (id) => (employees.isPending && id ? "Loading…" : "Not recorded");

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Leave</p>
          <p className="mt-0.5 font-semibold text-foreground">{he.decode(clean(record.type_of_leave || record.leave_type)) || "Leave"}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", status.tone)}>
          <status.icon size={13} aria-hidden="true" /> {status.label}
        </span>
      </div>

      <dl className="mt-2 divide-y divide-border">
        <LeaveDetailRow icon={CalendarDays} label="Dates">
          {dates}{days && <span className="font-normal text-muted-foreground"> · {days} day{days === "1" ? "" : "s"}</span>}
        </LeaveDetailRow>
        <LeaveDetailRow icon={MessageSquareText} label="Employee's reason" muted={!clean(record.description)}>
          {clean(record.description) || "No reason given"}
        </LeaveDetailRow>
        {children}
        {decided && (
          <LeaveDetailRow icon={UserCheck} label={accepted ? "Approved by" : "Decided by"} muted={!approval.approvedBy}>
            {approval.approvedBy || pending(approval.approvedById)}
            {approval.decidedOn && <span className="font-normal text-muted-foreground"> · {formatDate(approval.decidedOn)}</span>}
          </LeaveDetailRow>
        )}
        {decided && (
          <LeaveDetailRow icon={MessageSquareText} label={accepted ? "Reason for approval" : "Admin's note"} muted={!approval.reason}>
            {approval.reason || "No reason recorded"}
          </LeaveDetailRow>
        )}
        {(accepted || approval.handoverTo) && (
          <LeaveDetailRow icon={Handshake} label="Work handed over to" muted={!approval.handoverTo}>
            {approval.handoverTo || (approval.handoverId ? pending(approval.handoverId) : "No handover")}
          </LeaveDetailRow>
        )}
      </dl>
    </div>
  );
}
