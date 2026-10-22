import { useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { BadgeCheck, BriefcaseBusiness, CalendarCheck2, CalendarClock, CalendarPlus, Check, ChevronDown, CircleAlert, ClipboardCheck, Clock3, GripVertical, Hourglass, Link2, MessageSquareText, RotateCcw, Send, X } from "lucide-react";
import { testAction } from "../recruitment/assessmentPresentation";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import { workflowValue } from "../candidates/candidatesApi";
import { findInterviewCandidate } from "../../../services/recruitmentUtils";
import { BOARD_STATES, boardState, candidateId, candidateIdentity, clean, displayInterviewTime, interviewDate, isFirstRound, relativeDay } from "./interviewUtils";
import { roundDropAction, roundKeyboardCoordinates } from "./interviewDrag";

const laneAccents = ["bg-chart-2", "bg-chart-3", "bg-chart-1", "bg-chart-4"];
const avatarAccents = ["bg-chart-2/10", "bg-chart-3/10", "bg-chart-1/10", "bg-chart-4/15"];
const laneSummary = { due: "to decide", upcoming: "upcoming", unscheduled: "to schedule", selected: "selected", decided: "failed" };
const attentionTone = "border-[var(--candidate-attention)]/25 bg-[var(--candidate-attention-soft)] text-[var(--candidate-attention)]";
const stateStyles = {
  due: { label: "Needs a decision", Icon: CircleAlert, className: attentionTone },
  upcoming: { label: "Upcoming", Icon: CalendarCheck2, className: "border-primary/20 bg-primary/10 text-primary" },
  unscheduled: { label: "Needs a date", Icon: Clock3, className: "border-border bg-muted text-muted-foreground" },
  selected: { label: "Selected", Icon: BadgeCheck, className: "border-highlight/60 bg-highlight/30 text-foreground" },
  decided: { label: "Failed", Icon: X, className: "border-destructive/20 bg-destructive/10 text-destructive" },
};
// Lanes share the width when there are three or more; fewer lanes keep a readable card width.
const gridClasses = (lanes = 3) => cn("grid grid-cols-1 items-start gap-5 min-[701px]:grid-flow-col min-[701px]:grid-cols-none", lanes >= 3 ? "min-[701px]:auto-cols-[minmax(290px,1fr)]" : "min-[701px]:auto-cols-[minmax(290px,400px)]");
const roundCollisionDetection = (args) => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);
const announcements = {
  onDragStart: ({ active }) => `Picked up ${active.data.current?.record.name || "candidate"} from ${active.data.current?.group.name}.`,
  onDragOver: ({ over }) => over ? `Over ${over.data.current?.group.name}. Drop to open the feedback form.` : "Outside the interview rounds. Release to cancel.",
  onDragEnd: ({ active, over }) => over && over.data.current?.group.key !== active.data.current?.group.key ? `Dropped in ${over.data.current?.group.name}. Complete feedback to save the move.` : "Move cancelled. The interview stays in its original round.",
  onDragCancel: () => "Move cancelled. The interview stays in its original round.",
};

const testIcons = { none: Link2, pending: Send, in_progress: Hourglass, completed: ClipboardCheck, expired: RotateCcw, revoked: RotateCcw, unknown: Link2 };

export default function InterviewBoard({ groups, filtered, now,candidates, statusOptions, jobMap, canSchedule, canAssess, testStatuses, onAction, onAssessment, onOpen }) {
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
      <div className={gridClasses(groups.length)}>{groups.map((group) => <InterviewLane key={group.key} group={group} filtered={filtered} previous={groups[groups.indexOf(group) - 1]?.name} now={now} candidates={candidates} statusOptions={statusOptions} jobMap={jobMap} canSchedule={canSchedule} canAssess={canAssess} testStatuses={testStatuses} canMove={canSchedule && groups.length > 1} onAction={onAction} onAssessment={onAssessment} onOpen={onOpen} />)}</div>
    </section>
    <DragOverlay dropAnimation={null}>{dragging && <div className="pointer-events-none rounded-xl border border-primary/30 bg-card p-4 text-card-foreground shadow-lg shadow-foreground/10 ring-2 ring-primary/20" aria-hidden="true"><div className="flex items-center gap-3"><GripVertical size={18} className="shrink-0 text-primary" /><div className="min-w-0"><p className="text-sm font-semibold [overflow-wrap:anywhere]">{dragging.record.name || "Unnamed candidate"}</p><p className="mt-1 text-xs text-muted-foreground">{dragging.group.name}</p></div></div><p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">Drop in another round to add feedback</p></div>}</DragOverlay>
  </DndContext>;
}

function InterviewLane({ group, filtered, previous, now, ...cardProps }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: `round:${group.key}`, data: { type: "interview-round", group }, disabled: !cardProps.canMove });
  const accepting = isOver && active?.data.current?.group.key !== group.key;
  const counts = BOARD_STATES.map((state) => [state, group.records.filter((record) => boardState(record, now) === state).length]).filter(([, count]) => count);
  return <section ref={setNodeRef} className={cn("min-w-0 rounded-xl border px-2.5 pb-2.5 transition-colors motion-reduce:transition-none", accepting ? "border-primary/50 bg-primary/5 ring-2 ring-primary/30" : "border-border/60 bg-muted/45")} aria-labelledby={`interview-round-${group.index}`}>
    <header className="px-2 pt-4 pb-3.5">
      <div className="flex items-center gap-2.5"><span className={cn("size-2 shrink-0 rounded-full", laneAccents[group.index % laneAccents.length])} aria-hidden="true" /><h3 id={`interview-round-${group.index}`} className="min-w-0 text-sm font-semibold tracking-tight [overflow-wrap:anywhere]">{group.name}</h3><span className="ml-auto grid h-6 min-w-6 shrink-0 place-items-center rounded-full border border-border/60 bg-card px-1.5 text-[11px] font-semibold text-foreground tabular-nums" aria-label={`${group.records.length} interviews`}>{group.records.length}</span></div>
      <p className="mt-1.5 ml-4.5 text-[11px] leading-relaxed text-muted-foreground">{accepting ? <span className="font-medium text-primary">Drop here to add feedback</span>
        : counts.length ? counts.map(([state, count], index) => <span key={state} className={state === "due" ? "font-medium text-[var(--candidate-attention)]" : undefined}>{index > 0 && ", "}{count} {laneSummary[state]}</span>)
          : filtered ? "No matching interviews" : "No candidates yet"}</p>
    </header>
    <div className="flex flex-col gap-3">
      {group.records.map((record) => <InterviewCard key={record.id} record={record} group={group} now={now} {...cardProps} />)}
      {!group.records.length && <div className={cn("flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-5 py-6 text-center transition-colors motion-reduce:transition-none", accepting ? "border-primary/50 text-primary" : "border-border text-muted-foreground")}>
        <CalendarClock size={22} strokeWidth={1.5} aria-hidden="true" />
        <p className="max-w-56 text-xs leading-relaxed">{accepting ? "Drop this interview here, then save your feedback."
          : filtered ? "Nothing in this round matches your filters."
            : previous && cardProps.canMove ? `Candidates land here when they pass ${previous}. Drag a card in to record that feedback.`
              : previous ? `Candidates land here when they pass ${previous}.`
                : "Schedule an interview from a candidate's profile to start this round."}</p>
      </div>}
    </div>
  </section>;
}

function InterviewCard({ record, group, now, candidates, statusOptions, jobMap, canSchedule, canAssess, testStatuses, canMove, onAction, onAssessment, onOpen }) {
  const candidate = findInterviewCandidate(record, candidates);
  const rejected = candidate && clean(workflowValue(candidate, "status", statusOptions)).toLowerCase() === "rejected";
  const state = boardState(record, now);
  const selected = state === "selected";
  const completed = state === "decided" || selected;
  const due = state === "due" && !rejected;
  const draggable = Boolean(canMove && record.id && candidateIdentity(record) && !completed && !rejected && String(record.deleted) !== "1");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: `interview:${record.id}`, data: { type: "interview-card", record, group }, disabled: !draggable });
  const date = interviewDate(record.interview_datetime);
  const today = new Date(now);
  const name = clean(record.name) || "Unnamed candidate";
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  // The whole card opens the candidate's profile; buttons inside sit above the stretched link.
  const profileId = candidate?.id || candidateId(record);
  const openable = Boolean(onOpen && profileId);
  const job = jobMap.get(String(record.job_id)) || (record.job_id ? "Job assigned" : "");
  const chip = rejected ? { label: "Rejected", Icon: X, className: "border-destructive/20 bg-destructive/10 text-destructive" } : stateStyles[state];
  const ChipIcon = chip.Icon;
  const fallbackTime = displayInterviewTime(record);
  const test = testAction(testStatuses?.[String(candidate?.id || "").trim()]);
  const TestIcon = testIcons[test.status];
  const linkHint = !canAssess ? "Candidate data is unavailable. Refresh to try again."
    : !candidate ? `Select a CRM candidate to create a test link for ${name}` : test.hint || `Assessment invitation for ${name}`;
  const dragHint = completed ? "Completed interviews cannot be moved" : rejected ? "Rejected candidates cannot be moved" : !candidateIdentity(record) ? "Add a candidate ID or email before moving this interview" : !canMove ? "Load candidate data and show multiple rounds to move an interview" : "Drag to another round to add feedback";

  return <article ref={setNodeRef} className={cn("group/card relative min-w-0 overflow-hidden rounded-xl border bg-card pt-4 text-card-foreground shadow-sm shadow-foreground/[.025] transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none", due ? "border-[var(--candidate-attention)]/30" : "border-border", openable && "hover:border-primary/30 hover:shadow-md hover:shadow-foreground/[.05]", isDragging && "opacity-35")} aria-label={`${name}, ${group.name}`}>
    <div className="flex items-start gap-3 px-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold tracking-tight text-foreground", avatarAccents[group.index % avatarAccents.length])} aria-hidden="true">{initials}</span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h4 className="text-sm leading-snug font-semibold tracking-tight [overflow-wrap:anywhere] 2xl:text-[15px]">{openable
          ? <button type="button" onClick={() => onOpen(profileId)} aria-label={`Open ${name}'s profile and interview history`} className="cursor-pointer text-left decoration-primary/40 underline-offset-4 outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset group-hover/card:text-primary group-hover/card:underline">{name}</button>
          : name}</h4>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere] 2xl:text-xs">{clean(record.email) || "No email added"}</p>
      </div>
      <button ref={setActivatorNodeRef} {...attributes} {...listeners} id={`interview-drag-${record.id}`} type="button" disabled={!draggable} title={dragHint} aria-label={`Move ${name} from ${group.name} to another round`} className="relative z-10 -mt-1 -mr-1.5 grid size-9 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none"><GripVertical size={16} aria-hidden="true" /></button>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-4">
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] leading-none font-medium", chip.className)}><ChipIcon size={12} aria-hidden="true" />{chip.label}</span>
      {job && <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"><BriefcaseBusiness size={13} className="shrink-0" aria-hidden="true" /><span className="min-w-0 truncate">{job}</span></span>}
    </div>

    <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg bg-muted/50 p-2">
      {date ? <>
        <span className="w-12 shrink-0 overflow-hidden rounded-md border border-border bg-card text-center leading-none" aria-hidden="true">
          <span className={cn("block py-1 text-[10px] font-semibold", completed ? "bg-muted-foreground text-card" : due ? "bg-[var(--candidate-attention)] text-[var(--candidate-attention-soft)]" : "bg-primary text-primary-foreground")}>{date.toLocaleDateString("en", { month: "short" })}</span>
          <span className="block py-1.5 text-xl font-semibold tracking-tight tabular-nums">{date.getDate()}</span>
        </span>
        <div className="min-w-0">
          <time dateTime={date.toISOString()} className="block text-xs font-medium tabular-nums">
            <span className="sr-only">{date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}, </span>
            {date.toLocaleDateString(undefined, { weekday: "short" })}, {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{date.getFullYear() !== today.getFullYear() && `, ${date.getFullYear()}`}
          </time>
          <p className={cn("mt-0.5 text-[11px]", due ? "font-medium text-[var(--candidate-attention)]" : "text-muted-foreground")}>{relativeDay(date, today)}</p>
        </div>
      </> : <>
        <span className="grid size-12 shrink-0 place-items-center rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground" aria-hidden="true"><CalendarPlus size={18} strokeWidth={1.6} /></span>
        <div className="min-w-0">
          <p className="text-xs font-medium [overflow-wrap:anywhere]">{fallbackTime === "Not scheduled" ? "No date yet" : fallbackTime}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{completed || rejected ? "This round was never scheduled" : "Pick a date and time to invite them"}</p>
        </div>
      </>}
    </div>

    {((!completed && !rejected) || isFirstRound(record)) && <div className="relative z-10 mt-3 flex items-center gap-2 px-4">
      {!completed && !rejected && <Button disabled={!record.id || !canSchedule} onClick={() => onAction({ record, action: "schedule" })} variant="secondary" className="h-10 min-w-0 flex-1 gap-1.5 px-2 text-xs min-[701px]:h-9 min-[701px]:text-[11px] 2xl:text-xs" aria-label={`${date ? "Reschedule" : "Schedule"} interview for ${name}, ${group.name}`}><CalendarPlus size={14} aria-hidden="true" />{date ? "Reschedule" : "Schedule"}</Button>}
      {isFirstRound(record) && <Button onClick={() => onAssessment(candidate, record)} disabled={!canAssess} title={linkHint} variant="outline" className="h-10 min-w-0 flex-1 gap-1.5 bg-card px-2 text-xs min-[701px]:h-9 min-[701px]:text-[11px] 2xl:text-xs" aria-label={`${test.label}: ${name}, ${group.name}`}><TestIcon size={14} aria-hidden="true" />{test.label}</Button>}
    </div>}

    {/* A selected candidate has already moved to Joining, so the decision is not reopened here. */}
    {selected ? <footer className="relative z-10 mt-3 flex min-h-11 items-center gap-1.5 border-t border-highlight/40 bg-highlight/15 px-4 py-1.5 text-[11px] font-medium text-foreground">
      <BadgeCheck size={14} className="shrink-0" aria-hidden="true" />Selected · passed the final round
    </footer> : <footer className={cn("relative z-10 mt-3 flex items-center justify-between gap-2 border-t px-4 py-1.5", due ? "border-[var(--candidate-attention)]/20 bg-[var(--candidate-attention-soft)]" : "border-border/60")}>
      <span className={cn("text-[11px]", due ? "font-medium text-[var(--candidate-attention)]" : "text-muted-foreground")}>{completed ? "Update decision" : due ? "Record a decision" : "Round decision"}</span>
      <div className="flex items-center gap-1">{["Pass", "Fail"].map((action) => <Button key={action} disabled={!record.id} onClick={() => onAction({ record, action })} variant={action === "Pass" ? "ghost" : "destructive"} className={cn("h-10 gap-1 px-2.5 text-xs min-[701px]:h-8 min-[701px]:text-[11px]", action === "Pass" ? "hover:bg-card" : "bg-transparent hover:bg-destructive/10")} aria-label={`${action} ${name}, ${group.name}`}>{action === "Pass" ? <Check size={14} className="text-chart-2" aria-hidden="true" /> : <X size={14} aria-hidden="true" />}{action}</Button>)}</div>
    </footer>}
    {record.interview_feedback && <details className="group/feedback relative z-10 border-t border-border/60 px-4"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 py-3 text-[11px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"><MessageSquareText size={14} aria-hidden="true" />{completed ? "Interview feedback" : "Interview notes"}<ChevronDown size={14} className="ml-auto transition-transform group-open/feedback:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary><p className="pb-4 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">{record.interview_feedback}</p></details>}
    {rejected && <p className="flex items-start gap-1.5 px-4 pb-3 text-[11px] leading-relaxed text-destructive"><CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />Scheduling is unavailable for rejected candidates.</p>}
  </article>;
}

export function InterviewBoardSkeleton() {
  return <div className="min-w-0 overflow-x-auto pb-3" role="status" aria-label="Loading interview rounds"><div className={gridClasses()}>{[0, 1, 2].map((lane) => <div className="rounded-xl border border-border/60 bg-muted/45 p-3" key={lane}><div className="px-2 pt-2 pb-5"><div className="h-4 w-28 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-3 h-3 w-40 rounded bg-muted motion-safe:animate-pulse" /></div><div className="space-y-3">{[0, 1].map((card) => <div className="rounded-xl border border-border bg-card p-4" key={card}><div className="flex items-center gap-3"><div className="size-10 rounded-full bg-muted motion-safe:animate-pulse" /><div className="min-w-0"><div className="h-4 w-28 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-3 h-3 w-36 max-w-full rounded bg-muted motion-safe:animate-pulse" /></div></div><div className="mt-5 h-5 w-24 rounded-full bg-muted motion-safe:animate-pulse" /><div className="mt-4 h-16 rounded-lg bg-muted motion-safe:animate-pulse" /><div className="mt-4 h-9 rounded bg-muted motion-safe:animate-pulse" /></div>)}</div></div>)}</div><span className="sr-only">Loading interviews...</span></div>;
}
