import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CalendarClock, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppointments, useUpdateAppointment } from "../../../queries/hr.queries";
import {
  APPOINTMENT_MODES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TOPICS,
  formatDate,
  formatTime,
  optionLabel,
  parseDateTime,
  recordsOf,
  splitAppointments,
  toIsoWithOffset,
} from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, EmptyState, QueryState, primaryButton } from "../org/orgUi";
import SlotPicker from "./SlotPicker";

function AppointmentCard({ item, timeZone, onCancel, onReschedule }) {
  const status = APPOINTMENT_STATUSES[item.status] || item.status;
  return (
    <li className={cn(candidateStyles.card, "p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {optionLabel(APPOINTMENT_TOPICS, item.topic) || "HR appointment"}
            <span className="font-normal text-muted-foreground"> · {optionLabel(APPOINTMENT_MODES, item.mode)}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
            <CalendarDays size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            {formatDate(item.start, timeZone, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}, {formatTime(item.start, timeZone)}
          </p>
          {item.hrName && <p className="mt-0.5 text-xs text-muted-foreground">With {item.hrName}</p>}
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground">{status}</span>
      </div>
      {item.agenda && <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.agenda}</p>}
      {(item.location || item.meetingLink) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {item.location && <span className="inline-flex items-center gap-1.5 text-foreground"><MapPin size={14} className="text-muted-foreground" aria-hidden="true" />{item.location}</span>}
          {/^https?:\/\//i.test(item.meetingLink) && (
            <a href={item.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
              Join meeting <ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
      {onCancel && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3">
          <button type="button" onClick={() => onReschedule(item)} className={candidateStyles.ghost}><CalendarClock size={15} aria-hidden="true" /> Reschedule</button>
          <button type="button" onClick={() => onCancel(item)} className={cn(candidateStyles.ghost, "text-destructive hover:bg-destructive/10")}>Cancel booking</button>
        </div>
      )}
    </li>
  );
}

/** The employee's own bookings: upcoming ones can be cancelled (with a reason) or moved. */
export default function MyAppointments({ timeZone }) {
  const query = useAppointments("mine");
  const update = useUpdateAppointment();
  const [tab, setTab] = useState("upcoming");
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState("");
  const [moving, setMoving] = useState(null);
  const [slot, setSlot] = useState(null);
  const { upcoming, past } = useMemo(() => splitAppointments(recordsOf(query.data, ["appointments", "records", "items", "data"])), [query.data]);
  const list = tab === "upcoming" ? upcoming : past;

  const closeCancel = () => {
    setCancelling(null);
    setReason("");
  };
  const closeMove = () => {
    setMoving(null);
    setSlot(null);
  };

  const cancel = (event) => {
    event.preventDefault();
    update.mutate(
      { id: cancelling.id, operation: "cancel", reason: reason.trim() },
      { onSuccess: () => { toast.success("Booking cancelled"); closeCancel(); }, onError: (error) => toast.error(error.message) },
    );
  };

  const reschedule = () => {
    update.mutate(
      { id: moving.id, operation: "reschedule", start: toIsoWithOffset(parseDateTime(slot.start)) },
      {
        onSuccess: () => { toast.success("Booking moved"); closeMove(); },
        onError: (error) => {
          toast.error(error.code === 409 ? "That time was just taken. Pick another one." : error.message);
          if (error.code === 409) setSlot(null);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Show" className="inline-flex rounded-lg bg-muted p-1">
        {[["upcoming", "Upcoming", upcoming.length], ["past", "Past", past.length]].map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={cn("min-h-9 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none", tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {label} <span className="tabular-nums text-muted-foreground">{count}</span>
          </button>
        ))}
      </div>

      <QueryState query={query} rows={3}>
        {list.length ? (
          <ul className="space-y-3">
            {list.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                timeZone={timeZone}
                onCancel={tab === "upcoming" ? setCancelling : null}
                onReschedule={setMoving}
              />
            ))}
          </ul>
        ) : (
          <EmptyState icon={CalendarDays} title={tab === "upcoming" ? "No upcoming bookings" : "No past bookings"}>
            {tab === "upcoming" ? "Book a time with HR whenever you need to talk about pay, leave, your career or anything else." : "Bookings you've had or cancelled appear here."}
          </EmptyState>
        )}
      </QueryState>

      <ActionDialog open={Boolean(cancelling)} onClose={closeCancel} title="Cancel this booking?" description="HR will be told. Let them know why so they can follow up if needed.">
        <form onSubmit={cancel} className="space-y-4">
          <div>
            <label htmlFor="cancel-reason" className="text-sm font-semibold text-foreground">Reason</label>
            <textarea
              id="cancel-reason"
              required
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeCancel} className={candidateStyles.ghost}>Keep booking</button>
            <button type="submit" disabled={!reason.trim() || update.isPending} className={cn(primaryButton, "bg-destructive text-white")}>
              {update.isPending ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        </form>
      </ActionDialog>

      <ActionDialog open={Boolean(moving)} onClose={closeMove} title="Pick a new time" description="Your topic and HR person stay the same.">
        {moving && (
          <div className="space-y-5">
            <SlotPicker timeZone={timeZone} hrEmployeeId={moving.hr_employee_id} mode={moving.mode} value={slot?.start} onChange={setSlot} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeMove} className={candidateStyles.ghost}>Keep current time</button>
              <button type="button" onClick={reschedule} disabled={!slot || update.isPending} className={primaryButton}>
                {update.isPending ? "Moving…" : "Move booking"}
              </button>
            </div>
          </div>
        )}
      </ActionDialog>
    </div>
  );
}
