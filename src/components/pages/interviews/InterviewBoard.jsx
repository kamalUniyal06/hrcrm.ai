import { useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { BriefcaseBusiness, CalendarCheck2, CalendarClock, CalendarPlus, Check, CheckCircle2, ChevronDown, CircleAlert, Clock3, GripVertical, Link2, MessageSquareText, X } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import { workflowValue } from "../candidates/candidatesApi";
import { findInterviewCandidate } from "../../../services/recruitmentUtils";
import { candidateIdentity, clean, displayInterviewTime, hasOutcome, interviewDate, isFirstRound } from "./interviewUtils";
import { roundDropAction, roundKeyboardCoordinates } from "./interviewDrag";

const laneAccents = ["bg-chart-2", "bg-chart-3", "bg-chart-1", "bg-chart-4"];
const avatarAccents = ["bg-chart-2/10", "bg-chart-3/10", "bg-chart-1/10", "bg-chart-4/15"];
const gridClasses = "grid grid-cols-1 items-start gap-5 min-[701px]:auto-cols-[minmax(290px,1fr)] min-[701px]:grid-flow-col min-[701px]:grid-cols-none";
const roundCollisionDetection = (args) => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);
const announcements = {
  onDragStart: ({ active }) => `Picked up ${active.data.current?.record.name || "candidate"} from ${active.data.current?.group.name}.`,
  onDragOver: ({ over }) => over ? `Over ${over.data.current?.group.name}. Drop to open the feedback form.` : "Outside the interview rounds. Release to cancel.",
  onDragEnd: ({ active, over }) => over && over.data.current?.group.key !== active.data.current?.group.key ? `Dropped in ${over.data.current?.group.name}. Complete feedback to save the move.` : "Move cancelled. The interview stays in its original round.",
  onDragCancel: () => "Move cancelled. The interview stays in its original round.",
};

export default function InterviewBoard({ groups, candidates, statusOptions, jobMap, canSchedule, canAssess, onAction, onAssessment }) {
  const [dragging, setDragging] = useState(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: roundKeyboardCoordinates, scrollBehavior: "auto" }),
  );
  function finishDrag({ active, over }) {
    setDragging(null);
    if (!canSchedule || !over || over.data.current?.type !== "interview-round") return;
    const source = groups.find((group) => group.key === active.data.current?.group.key);
    const record = source?.records.find((item) => String(item.id) === String(active.data.current?.record.id));
    const destination = groups.find((group) => group.key === over.data.current?.group.key);
    if (!record || !destination) return;
    const candidate = findInterviewCandidate(record, candidates);
    if (candidate && clean(workflowValue(candidate, "status", statusOptions)).toLowerCase() === "rejected") return;
    const action = roundDropAction(record, destination.name);
    if (action) onAction(action);
  }
  return <DndContext id="interview-rounds" sensors={sensors} collisionDetection={roundCollisionDetection} onDragStart={({ active }) => setDragging(active.data.current)} onDragCancel={() => setDragging(null)} onDragEnd={finishDrag} accessibility={{ announcements, restoreFocus: false, screenReaderInstructions: { draggable: "To move an interview, press Space or Enter on its drag handle. Use the arrow keys to choose another round. Press Space or Enter to open its feedback form, or Escape to cancel." } }}>
    <section id="interview-round-board" className="custom-scrollbar min-w-0 overflow-x-auto rounded-xl px-px pt-px pb-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/50" aria-label="Interview rounds" tabIndex={0}>
      <div className={gridClasses}>{groups.map((group) => <InterviewLane key={group.key} group={group} candidates={candidates} statusOptions={statusOptions} jobMap={jobMap} canSchedule={canSchedule} canAssess={canAssess} canMove={canSchedule && groups.length > 1} onAction={onAction} onAssessment={onAssessment} />)}</div>
    </section>
    <DragOverlay dropAnimation={null}>{dragging && <div className="pointer-events-none rounded-xl border border-primary/30 bg-card p-4 text-card-foreground shadow-lg shadow-foreground/10 ring-2 ring-primary/20" aria-hidden="true"><div className="flex items-center gap-3"><GripVertical size={18} className="shrink-0 text-primary" /><div className="min-w-0"><p className="text-sm font-semibold [overflow-wrap:anywhere]">{dragging.record.name || "Unnamed candidate"}</p><p className="mt-1 text-xs text-muted-foreground">{dragging.group.name}</p></div></div><p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">Drop in another round to add feedback</p></div>}</DragOverlay>
  </DndContext>;
}

function InterviewLane({ group, candidates, statusOptions, jobMap, canSchedule, canAssess, canMove, onAction, onAssessment }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: `round:${group.key}`, data: { type: "interview-round", group }, disabled: !canMove });
  const accepting = isOver && active?.data.current?.group.key !== group.key;
  const scheduled = group.records.filter((record) => interviewDate(record.interview_datetime) && !hasOutcome(record)).length;
  const unscheduled = group.records.filter((record) => !interviewDate(record.interview_datetime) && !hasOutcome(record)).length;
  return <section ref={setNodeRef} className={cn("min-w-0 rounded-xl border px-2.5 pb-2.5 transition-colors motion-reduce:transition-none", accepting ? "border-primary/50 bg-primary/5 ring-2 ring-primary/30" : "border-border/60 bg-muted/45")} aria-labelledby={`interview-round-${group.index}`}>
    <header className="px-2 pt-4 pb-4">
      <div className="flex items-center gap-2.5"><span className={cn("size-2 shrink-0 rounded-full", laneAccents[group.index % laneAccents.length])} aria-hidden="true" /><h3 id={`interview-round-${group.index}`} className="min-w-0 text-sm font-semibold tracking-tight [overflow-wrap:anywhere]">{group.name}</h3><span className="ml-auto grid h-6 min-w-6 shrink-0 place-items-center rounded-md border border-border/60 bg-card px-1.5 text-[11px] font-semibold text-foreground tabular-nums" aria-label={`${group.records.length} interviews`}>{group.records.length}</span></div>
      <p className={cn("mt-1.5 ml-4.5 text-[10px] leading-relaxed", accepting ? "font-medium text-primary" : "text-muted-foreground")}>{accepting ? "Drop here to add feedback" : group.records.length ? `${scheduled} scheduled · ${unscheduled} to schedule` : "No matching interviews"}</p>
    </header>
    <div className="flex flex-col gap-3">
      {group.records.map((record) => <InterviewCard key={record.id} record={record} group={group} candidates={candidates} statusOptions={statusOptions} jobMap={jobMap} canSchedule={canSchedule} canAssess={canAssess} canMove={canMove} onAction={onAction} onAssessment={onAssessment} />)}
      {!group.records.length && <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-5 py-6 text-center text-muted-foreground"><CalendarClock size={22} strokeWidth={1.5} aria-hidden="true" /><p className="max-w-48 text-xs leading-relaxed">{accepting ? "Drop this interview here, then save your feedback." : "Nothing in this round matches your filters."}</p></div>}
    </div>
  </section>;
}

function InterviewCard({ record, group, candidates, statusOptions, jobMap, canSchedule, canAssess, canMove, onAction, onAssessment }) {
  const candidate = findInterviewCandidate(record, candidates);
  const rejected = candidate && clean(workflowValue(candidate, "status", statusOptions)).toLowerCase() === "rejected";
  const outcome = clean(record.interview_status);
  const completed = hasOutcome(record);
  const draggable = Boolean(canMove && record.id && candidateIdentity(record) && !completed && !rejected && String(record.deleted) !== "1");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: `interview:${record.id}`, data: { type: "interview-card", record, group }, disabled: !draggable });
  const date = interviewDate(record.interview_datetime);
  const name = clean(record.name) || "Unnamed candidate";
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const badge = completed ? { label: outcome, className: /^pass(ed)?$/i.test(outcome) ? "bg-chart-2/10 text-card-foreground" : "bg-destructive/10 text-destructive", Icon: /^pass(ed)?$/i.test(outcome) ? CheckCircle2 : X }
    : rejected ? { label: "Rejected", className: "bg-destructive/10 text-destructive", Icon: X }
      : date ? { label: "Scheduled", className: "bg-chart-2/10 text-card-foreground", Icon: CalendarCheck2 }
        : { label: "Needs a date", className: "bg-chart-4/15 text-card-foreground", Icon: Clock3 };
  const BadgeIcon = badge.Icon;
  const dateLabel = date ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : displayInterviewTime(record);
  const timeLabel = date?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const linkHint = !canAssess ? "Candidate data is unavailable. Refresh to try again."
    : !candidate ? `Select a CRM candidate to create a test link for ${name}` : `Assessment invitation for ${name}`;
  const dragHint = completed ? "Completed interviews cannot be moved" : rejected ? "Rejected candidates cannot be moved" : !candidateIdentity(record) ? "Add a candidate ID or email before moving this interview" : !canMove ? "Load candidate data and show multiple rounds to move an interview" : "Drag to another round to add feedback";

  return <article ref={setNodeRef} className={cn("min-w-0 rounded-xl border border-border bg-card px-4 pt-4 text-card-foreground shadow-sm shadow-foreground/[.025] transition-[border-color,box-shadow,transform] duration-150 hover:border-primary/25 hover:shadow-md hover:shadow-foreground/[.04] motion-reduce:transition-none 2xl:px-5", isDragging ? "opacity-35" : "motion-safe:hover:-translate-y-0.5")} aria-label={`${name}, ${group.name}`}>
    <div className="flex items-center gap-2.5"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-xs font-medium tracking-tight", avatarAccents[group.index % avatarAccents.length])} aria-hidden="true">{initials}</span><div className="min-w-0 flex-1"><h4 className="text-sm leading-snug font-semibold tracking-tight [overflow-wrap:anywhere] 2xl:text-[15px]">{name}</h4><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere] 2xl:text-xs">{clean(record.email) || "No email added"}</p></div><button ref={setActivatorNodeRef} {...attributes} {...listeners} id={`interview-drag-${record.id}`} type="button" disabled={!draggable} title={dragHint} aria-label={`Move ${name} from ${group.name} to another round`} className="-mr-1 grid size-9 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none"><GripVertical size={16} aria-hidden="true" /></button></div>
    <div className="mt-3.5"><span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] leading-none font-medium capitalize", badge.className)}><BadgeIcon size={12} aria-hidden="true" />{badge.label}</span></div>
    <p className="my-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground 2xl:text-xs"><BriefcaseBusiness size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">{jobMap.get(String(record.job_id)) || (record.job_id ? "Job assigned" : "No job assigned")}</span></p>
    <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-2.5"><CalendarClock size={18} strokeWidth={1.6} className={cn("shrink-0", date ? "text-primary" : "text-muted-foreground")} aria-hidden="true" /><div className="min-w-0"><span className="mb-0.5 block text-[9px] text-muted-foreground">{date ? "Interview date" : "Interview schedule"}</span>{date ? <time dateTime={date.toISOString()} className="block text-[11px] leading-relaxed font-medium 2xl:text-xs">{dateLabel}<span className="px-1.5 text-muted-foreground" aria-hidden="true">·</span>{timeLabel}</time> : <p className="text-[11px] leading-relaxed font-medium [overflow-wrap:anywhere] 2xl:text-xs">{dateLabel}</p>}</div></div>
    {((!completed && !rejected) || isFirstRound(record)) && <div className="my-3 flex items-center gap-2">
      {!completed && !rejected && <Button disabled={!record.id || !canSchedule} onClick={() => onAction({ record, action: "schedule" })} variant="secondary" className="h-10 min-w-0 flex-1 gap-1.5 px-2 text-xs min-[701px]:h-9 min-[701px]:text-[11px] 2xl:text-xs" aria-label={`${date ? "Reschedule" : "Schedule"} interview for ${name}, ${group.name}`}><CalendarPlus size={14} aria-hidden="true" />{date ? "Reschedule" : "Schedule"}</Button>}
      {isFirstRound(record) && <Button onClick={() => onAssessment(candidate, record)} disabled={!canAssess} title={linkHint} variant="outline" className="h-10 min-w-0 flex-1 gap-1.5 bg-card px-2 text-xs min-[701px]:h-9 min-[701px]:text-[11px] 2xl:text-xs" aria-label={`Create test link for ${name}, ${group.name}`}><Link2 size={14} aria-hidden="true" />Test link</Button>}
    </div>}
    <footer className="flex items-center justify-between gap-2 border-t border-border/60 py-2"><span className="text-[10px] text-muted-foreground">{completed ? "Update decision" : "Round decision"}</span><div className="flex items-center gap-1">{["Pass", "Fail"].map((action) => <Button key={action} disabled={!record.id} onClick={() => onAction({ record, action })} variant={action === "Pass" ? "ghost" : "destructive"} className={cn("h-10 gap-1 px-2.5 text-xs min-[701px]:h-8 min-[701px]:text-[11px]", action === "Fail" && "bg-transparent hover:bg-destructive/10")} aria-label={`${action} ${name}, ${group.name}`}>{action === "Pass" ? <Check size={14} className="text-chart-2" aria-hidden="true" /> : <X size={14} aria-hidden="true" />}{action}</Button>)}</div></footer>
    {record.interview_feedback && <details className="group/feedback border-t border-border/60"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 py-3 text-[11px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"><MessageSquareText size={14} aria-hidden="true" />Interview feedback<ChevronDown size={14} className="ml-auto transition-transform group-open/feedback:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary><p className="pb-4 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">{record.interview_feedback}</p></details>}
    {rejected && <p className="flex items-start gap-1.5 pb-3 text-[10px] leading-relaxed text-destructive"><CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />Scheduling is unavailable for rejected candidates.</p>}
  </article>;
}

export function InterviewBoardSkeleton() {
  return <div className="min-w-0 overflow-x-auto pb-3" role="status" aria-label="Loading interview rounds"><div className={gridClasses}>{[0, 1, 2].map((lane) => <div className="rounded-xl border border-border/60 bg-muted/45 p-3" key={lane}><div className="px-2 pt-2 pb-5"><div className="h-4 w-28 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-3 h-3 w-40 rounded bg-muted motion-safe:animate-pulse" /></div><div className="space-y-3">{[0, 1].map((card) => <div className="rounded-xl border border-border bg-card p-4" key={card}><div className="flex items-center gap-3"><div className="size-10 rounded-xl bg-muted motion-safe:animate-pulse" /><div className="min-w-0"><div className="h-4 w-28 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-3 h-3 w-36 max-w-full rounded bg-muted motion-safe:animate-pulse" /></div></div><div className="mt-5 h-5 w-24 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-5 h-14 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-5 h-9 rounded bg-muted motion-safe:animate-pulse" /></div>)}</div></div>)}</div><span className="sr-only">Loading interviews...</span></div>;
}
