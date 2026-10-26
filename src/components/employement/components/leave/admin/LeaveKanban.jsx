import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Loader2 } from "lucide-react";
import LeaveCard from "./LeaveCard";

const COLUMNS = [
  { id: "Applied", label: "Awaiting review", hint: "All pending requests · drag one to decide", surface: "border-amber-200 bg-amber-50/70", dot: "bg-amber-500", count: "text-amber-800 ring-amber-200" },
  { id: "Accepted", label: "Approved", hint: "Approved leave requests", surface: "border-emerald-200 bg-emerald-50/70", dot: "bg-emerald-500", count: "text-emerald-800 ring-emerald-200" },
  { id: "Rejected", label: "Rejected", hint: "Declined leave requests", surface: "border-rose-200 bg-rose-50/70", dot: "bg-rose-500", count: "text-rose-800 ring-rose-200" },
];

// columns: records per status, already sorted by SmartGateway.
// onDecide(record, status): the board asks for an approval reason before saving.
export default function LeaveKanban({ columns, sortDirs, onToggleSort, fetching = {}, employeeMap, mutation, onOpen, onDecide }) {
  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination || destination.droppableId === source.droppableId || destination.droppableId === "Applied") return;
    onDecide((columns[source.droppableId] || []).find((record) => String(record.id) === String(draggableId)), destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnRecords = columns[column.id] || [];
          const newestFirst = sortDirs[column.id] !== "ASC";
          const SortIcon = newestFirst ? ArrowDownWideNarrow : ArrowUpNarrowWide;
          return (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <section className={`flex h-[min(34rem,62vh)] min-h-80 flex-col overflow-hidden rounded-2xl border p-3 transition ${snapshot.isDraggingOver ? "border-primary bg-primary/10 ring-2 ring-primary/20" : column.surface}`}>
                  <header className="shrink-0 px-1 pb-3">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="flex items-center gap-2 text-sm font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />{column.label}</h2><p className="mt-1 text-[11px] text-muted-foreground">{column.hint}</p></div><span className={`rounded-lg bg-background px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm ring-1 ${column.count}`}>{columnRecords.length}</span></div>
                    <button
                      type="button"
                      onClick={() => onToggleSort(column.id)}
                      aria-label={`Sort ${column.label.toLowerCase()} by applied date, currently ${newestFirst ? "newest" : "oldest"} first`}
                      className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border transition hover:text-foreground"
                    >
                      {fetching[column.id] ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <SortIcon size={13} aria-hidden="true" />}
                      Applied · {newestFirst ? "Newest first" : "Oldest first"}
                    </button>
                  </header>
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
