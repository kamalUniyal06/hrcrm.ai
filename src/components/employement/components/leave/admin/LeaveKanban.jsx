import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import LeaveCard from "./LeaveCard";
import { statusOf } from "./leaveAdminUtils";

const COLUMNS = [
  { id: "Applied", label: "Awaiting review", hint: "Drag a request to make a decision", surface: "border-amber-200 bg-amber-50/70", dot: "bg-amber-500", count: "text-amber-800 ring-amber-200" },
  { id: "Accepted", label: "Approved", hint: "Approved leave requests", surface: "border-emerald-200 bg-emerald-50/70", dot: "bg-emerald-500", count: "text-emerald-800 ring-emerald-200" },
  { id: "Rejected", label: "Rejected", hint: "Declined leave requests", surface: "border-rose-200 bg-rose-50/70", dot: "bg-rose-500", count: "text-rose-800 ring-rose-200" },
];

export default function LeaveKanban({ records, employeeMap, mutation, onOpen }) {
  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination || destination.droppableId === source.droppableId || destination.droppableId === "Applied") return;
    mutation.mutate({ id: draggableId, status: destination.droppableId });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnRecords = records.filter((record) => statusOf(record) === column.id);
          return (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <section className={`flex h-[min(34rem,62vh)] min-h-80 flex-col overflow-hidden rounded-2xl border p-3 transition ${snapshot.isDraggingOver ? "border-primary bg-primary/10 ring-2 ring-primary/20" : column.surface}`}>
                  <header className="flex shrink-0 items-start justify-between px-1 pb-3"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />{column.label}</h2><p className="mt-1 text-[11px] text-muted-foreground">{column.hint}</p></div><span className={`rounded-lg bg-background px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm ring-1 ${column.count}`}>{columnRecords.length}</span></header>
                  <div ref={provided.innerRef} {...provided.droppableProps} className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-0.5 pb-2 pr-1">
                    {columnRecords.map((record, index) => <LeaveCard key={record.id} record={record} employeeMap={employeeMap} index={index} onOpen={onOpen} updatingId={mutation.isPending ? mutation.variables?.id : null} />)}
                    {provided.placeholder}
                    {!columnRecords.length && <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-border bg-background/50 px-5 text-center text-xs text-muted-foreground">No {column.label.toLowerCase()} requests match these filters.</div>}
                  </div>
                </section>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
