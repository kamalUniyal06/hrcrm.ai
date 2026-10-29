import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CalendarHeart, Milestone, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddTimelineEvent, useDeleteTimelineEvent, useMe, useTimeline } from "../../../queries/hr.queries";
import { formatTenure } from "../../../utils/hrOrg";
import { formatDate, timelineSummary, timelineTypes } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, EmptyState, QueryState, fieldClass, primaryButton } from "../org/orgUi";

const chip = "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none";
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function AddEventDialog({ open, onClose, employeeId, eventTypes }) {
  const add = useAddTimelineEvent();
  const [form, setForm] = useState({ eventType: "award", eventDate: today(), title: "", description: "" });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const close = () => {
    setForm({ eventType: "award", eventDate: today(), title: "", description: "" });
    onClose();
  };
  const submit = (event) => {
    event.preventDefault();
    add.mutate(
      { employeeId, ...form, title: form.title.trim(), description: form.description.trim() },
      { onSuccess: () => { toast.success("Event added to the timeline"); close(); }, onError: (error) => toast.error(error.message) },
    );
  };

  return (
    <ActionDialog open={open} onClose={close} title="Add a career event" description="Use this for things the system doesn't log by itself, such as awards, training or notes.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="event-type" className="text-sm font-semibold text-foreground">Type</label>
            <select id="event-type" value={form.eventType} onChange={update("eventType")} className={fieldClass}>
              {eventTypes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="event-date" className="text-sm font-semibold text-foreground">Date</label>
            <input id="event-date" type="date" required value={form.eventDate} onChange={update("eventDate")} className={fieldClass} />
          </div>
        </div>
        <div>
          <label htmlFor="event-title" className="text-sm font-semibold text-foreground">Headline <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input id="event-title" maxLength={255} value={form.title} onChange={update("title")} placeholder="e.g. Employee of the quarter" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="event-description" className="text-sm font-semibold text-foreground">Details <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="event-description" rows={3} value={form.description} onChange={update("description")} className={cn(fieldClass, "py-2")} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={add.isPending} className={primaryButton}>{add.isPending ? "Adding…" : "Add event"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}

/**
 * A career timeline, newest first, with tenure and the next work anniversary on top. Without
 * `employeeId` it is the signed-in employee's own; `canEdit` adds and removes manual events.
 */
export default function CareerTimeline({ employeeId, canEdit = false }) {
  const [majorOnly, setMajorOnly] = useState(false);
  const [type, setType] = useState("all");
  const [adding, setAdding] = useState(false);
  const query = useTimeline({ employeeId, majorOnly });
  const remove = useDeleteTimelineEvent();
  const me = useMe();
  const self = !employeeId;
  const summary = useMemo(() => timelineSummary(query.data), [query.data]);
  const types = useMemo(() => timelineTypes(summary.events), [summary.events]);
  // A type picked before switching to major events may no longer be there.
  const activeType = types.some((item) => item.type === type) ? type : "all";
  const events = activeType === "all" ? summary.events : summary.events.filter((event) => event.type === activeType);
  const tenure = formatTenure(summary.tenure ?? (self ? me.data?.tenure : null));
  const anniversary = summary.nextAnniversary ?? (self ? me.data?.tenure?.next_anniversary?.date : null);

  const deleteEvent = (event) => {
    if (!window.confirm(`Remove "${event.title}" from the timeline?`)) return;
    remove.mutate(event.id, { onSuccess: () => toast.success("Event removed"), onError: (error) => toast.error(error.message) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <CalendarHeart size={16} className="text-primary" aria-hidden="true" />
          {tenure ? <>With the company for <span className="font-semibold">{tenure}</span></> : self ? "Your time with the company" : "Time with the company"}
          {anniversary && <span className="text-muted-foreground"> · next anniversary {formatDate(anniversary)}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={majorOnly} onChange={(event) => setMajorOnly(event.target.checked)} className="size-4 accent-primary" />
            Major events only
          </label>
          {canEdit && employeeId && summary.eventTypes.length > 0 && (
            <button type="button" onClick={() => setAdding(true)} className={candidateStyles.ghost} data-tour="timeline-add">
              <Plus size={15} aria-hidden="true" /> Add event
            </button>
          )}
        </div>
      </div>

      {types.length > 1 && (
        <div role="group" aria-label="Show event type" className="flex flex-wrap gap-2">
          {[{ type: "all", label: "All", count: summary.events.length }, ...types].map((item) => (
            <button
              key={item.type}
              type="button"
              aria-pressed={activeType === item.type}
              onClick={() => setType(item.type)}
              className={cn(chip, activeType === item.type ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/40")}
            >
              {item.label} <span className="tabular-nums text-muted-foreground">{item.count}</span>
            </button>
          ))}
        </div>
      )}

      <QueryState query={query} rows={3}>
        {events.length ? (
          <ol className="relative space-y-4 border-l border-border pl-5">
            {events.map((event) => (
              <li key={event.id} className="relative">
                <span
                  className={cn("absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-card", event.major ? "bg-primary" : "bg-muted-foreground")}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground">{event.typeLabel || "Event"}</span>
                  {event.major && <span className="text-[11px] font-semibold text-primary">Major</span>}
                  <time className="text-xs text-muted-foreground">{formatDate(event.date)}</time>
                  {canEdit && event.manual && event.id && (
                    <button
                      type="button"
                      onClick={() => deleteEvent(event)}
                      disabled={remove.isPending}
                      aria-label={`Remove ${event.title}`}
                      className="ml-auto grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 motion-reduce:transition-none"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{event.title}</p>
                {event.description && <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{event.description}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={Milestone} title={majorOnly ? "No major events yet" : self ? "Your timeline is empty" : "No events yet"}>
            Joining, promotions, role and team changes and salary revisions appear here as they happen.
          </EmptyState>
        )}
      </QueryState>

      {canEdit && employeeId && (
        <AddEventDialog open={adding} onClose={() => setAdding(false)} employeeId={employeeId} eventTypes={summary.eventTypes} />
      )}
    </div>
  );
}
