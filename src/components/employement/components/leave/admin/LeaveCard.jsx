import { Draggable } from "@hello-pangea/dnd";
import { Eye, Loader2 } from "lucide-react";
import { employeeDisplayName, employeeFor, formatDate, statusOf } from "./leaveAdminUtils";

export default function LeaveCard({ record, employeeMap, index, onOpen, updatingId }) {
  const employee = employeeFor(record, employeeMap);
  const name = employeeDisplayName(record, employee);
  const avatar = employee?.photo_url || employee?.photo || employee?.picture || employee?.image_url || employee?.avatar_url;
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const isPending = statusOf(record) === "Applied";

  return (
    <Draggable draggableId={String(record.id)} index={index} isDragDisabled={!isPending || updatingId === record.id}>
      {(provided, snapshot) => (
        <article ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`group rounded-2xl border bg-card p-4 shadow-sm transition ${snapshot.isDragging ? "rotate-1 border-primary shadow-xl" : "border-border hover:-translate-y-0.5 hover:shadow-md"} ${isPending ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10 text-xs font-bold text-primary">{avatar ? <img src={avatar} alt={name} className="h-full w-full object-cover" /> : initials}</div>
            <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{name}</h3><p className="mt-0.5 truncate text-xs text-muted-foreground">{record.type_of_leave || "Leave request"}</p></div>
            {updatingId === record.id ? <Loader2 size={16} className="animate-spin text-primary" /> : <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onOpen(record)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={`View ${name}'s request`}><Eye size={16} /></button>}
          </div>
          <div className="mt-4 rounded-xl bg-muted/60 px-3 py-2.5"><p className="text-xs font-semibold">{formatDate(record.leave_from)}{record.leave_to ? ` – ${formatDate(record.leave_to)}` : ""}</p><p className="mt-1 text-[11px] text-muted-foreground">{record.leave_days || "—"} day{String(record.leave_days) === "1" ? "" : "s"} · Applied {formatDate(record.date_entered)}</p></div>
          {isPending && <p className="mt-3 text-[11px] font-medium text-muted-foreground">Drag to Approved or Rejected</p>}
        </article>
      )}
    </Draggable>
  );
}
