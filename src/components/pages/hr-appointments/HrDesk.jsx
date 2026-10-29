import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CalendarClock, CalendarDays, Check, ExternalLink, MapPin, NotebookPen, Search, UserX } from "lucide-react";
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
import { ActionDialog, EmptyState, QueryState, fieldClass, primaryButton } from "../org/orgUi";
import SlotPicker from "./SlotPicker";

const NEEDS_CONFIRMING = new Set(["requested", "booked", "rescheduled"]);
const OPEN = new Set(["requested", "booked", "confirmed", "rescheduled"]);
const textareaClass = "mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function DeskCard({ item, timeZone, showHr, onAction, onEdit, onCancel, onReschedule, busy }) {
  const open = OPEN.has(item.status);
  const started = (parseDateTime(item.start)?.getTime() || 0) <= Date.now();
  return (
    <li className={cn(candidateStyles.card, "p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {item.employee_name || "Employee"}
            <span className="font-normal text-muted-foreground"> · {optionLabel(APPOINTMENT_TOPICS, item.topic) || "HR appointment"} · {optionLabel(APPOINTMENT_MODES, item.mode)}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
            <CalendarDays size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            {formatDate(item.start, timeZone, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}, {formatTime(item.start, timeZone)}
          </p>
          {showHr && item.hrName && <p className="mt-0.5 text-xs text-muted-foreground">With {item.hrName}</p>}
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground">{APPOINTMENT_STATUSES[item.status] || item.status}</span>
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
      {item.hr_notes && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm leading-6 text-foreground"><span className="font-semibold">HR notes: </span>{item.hr_notes}</p>}
      {item.status === "cancelled" && item.cancel_reason && <p className="mt-2 text-xs text-muted-foreground">Cancelled: {item.cancel_reason}</p>}
      <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3">
        {open && NEEDS_CONFIRMING.has(item.status) && (
          <button type="button" disabled={busy} onClick={() => onAction(item, "confirm")} className={candidateStyles.ghost}><Check size={15} aria-hidden="true" /> Confirm</button>
        )}
        {open && started && (
          <>
            <button type="button" disabled={busy} onClick={() => onAction(item, "complete")} className={candidateStyles.ghost}><Check size={15} aria-hidden="true" /> Mark done</button>
            <button type="button" disabled={busy} onClick={() => onAction(item, "no_show")} className={candidateStyles.ghost}><UserX size={15} aria-hidden="true" /> Didn't show</button>
          </>
        )}
        {open && <button type="button" onClick={() => onReschedule(item)} className={candidateStyles.ghost}><CalendarClock size={15} aria-hidden="true" /> Reschedule</button>}
        <button type="button" onClick={() => onEdit(item)} className={candidateStyles.ghost}><NotebookPen size={15} aria-hidden="true" /> {open ? "Details" : "Notes"}</button>
        {open && <button type="button" onClick={() => onCancel(item)} className={cn(candidateStyles.ghost, "text-destructive hover:bg-destructive/10")}>Cancel</button>}
      </div>
    </li>
  );
}

const DONE = { confirm: "Booking confirmed", complete: "Marked done", no_show: "Marked as missed" };

/**
 * HR's side of the bookings: `as_hr` lists the ones booked with the signed-in HR person, `all`
 * everyone's (admins and roles with "all" on HR appointments). HR confirms, closes, moves or
 * cancels them and keeps notes, a location and a meeting link on each.
 */
export default function HrDesk({ view, timeZone }) {
  const query = useAppointments(view);
  const update = useUpdateAppointment();
  const [tab, setTab] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [details, setDetails] = useState({});
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState("");
  const [moving, setMoving] = useState(null);
  const [slot, setSlot] = useState(null);
  const { upcoming, past } = useMemo(() => splitAppointments(recordsOf(query.data, ["appointments", "records", "items", "data"])), [query.data]);
  const term = search.trim().toLowerCase();
  const list = (tab === "upcoming" ? upcoming : past).filter(
    (item) => !term || `${item.employee_name ?? ""} ${item.hrName} ${optionLabel(APPOINTMENT_TOPICS, item.topic)}`.toLowerCase().includes(term),
  );
  const showHr = view === "all";

  const act = (item, operation) =>
    update.mutate({ id: item.id, operation }, { onSuccess: () => toast.success(DONE[operation]), onError: (error) => toast.error(error.message) });

  const openDetails = (item) => {
    setEditing(item);
    setDetails({ mode: item.mode || "in_person", location: item.location, meetingLink: item.meetingLink, hrNotes: item.hr_notes ?? "" });
  };
  const setDetail = (key) => (event) => setDetails((current) => ({ ...current, [key]: event.target.value }));
  const saveDetails = (event) => {
    event.preventDefault();
    update.mutate(
      { id: editing.id, operation: "update", mode: details.mode, location: details.location.trim(), meetingLink: details.meetingLink.trim(), hrNotes: details.hrNotes.trim() },
      { onSuccess: () => { toast.success("Details saved"); setEditing(null); }, onError: (error) => toast.error(error.message) },
    );
  };

  const closeCancel = () => {
    setCancelling(null);
    setReason("");
  };
  const cancel = (event) => {
    event.preventDefault();
    update.mutate(
      { id: cancelling.id, operation: "cancel", reason: reason.trim() },
      { onSuccess: () => { toast.success("Booking cancelled"); closeCancel(); }, onError: (error) => toast.error(error.message) },
    );
  };

  const closeMove = () => {
    setMoving(null);
    setSlot(null);
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
      <div className="flex flex-wrap items-center gap-3">
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
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search bookings</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={showHr ? "Search by employee, HR person or topic" : "Search by employee or topic"}
            className="min-h-11 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </label>
      </div>

      <QueryState query={query} rows={3}>
        {list.length ? (
          <ul className="space-y-3" data-tour={view === "all" ? "hr-all-bookings" : "hr-desk-list"}>
            {list.map((item) => (
              <DeskCard
                key={item.id}
                item={item}
                timeZone={timeZone}
                showHr={showHr}
                busy={update.isPending}
                onAction={act}
                onEdit={openDetails}
                onCancel={setCancelling}
                onReschedule={setMoving}
              />
            ))}
          </ul>
        ) : (
          <EmptyState icon={CalendarDays} title={term ? "No bookings match that search" : tab === "upcoming" ? "No upcoming bookings" : "No past bookings"}>
            {term ? "Try a different name or topic." : tab === "upcoming" ? "New bookings appear here as employees book time with HR." : "Finished, missed and cancelled bookings appear here."}
          </EmptyState>
        )}
      </QueryState>

      <ActionDialog open={Boolean(editing)} onClose={() => setEditing(null)} title={`Booking with ${editing?.employee_name || "employee"}`} description="Where and how you'll meet, and private notes for HR. The employee sees the place and link, not your notes.">
        {editing && (
          <form onSubmit={saveDetails} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="desk-mode" className="text-sm font-semibold text-foreground">How</label>
                <select id="desk-mode" value={details.mode} onChange={setDetail("mode")} className={fieldClass}>
                  {APPOINTMENT_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="desk-location" className="text-sm font-semibold text-foreground">Location <span className="font-normal text-muted-foreground">(optional)</span></label>
                <input id="desk-location" maxLength={255} value={details.location} onChange={setDetail("location")} placeholder="e.g. HR room, 2nd floor" className={fieldClass} />
              </div>
            </div>
            <div>
              <label htmlFor="desk-link" className="text-sm font-semibold text-foreground">Meeting link <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="desk-link" type="url" maxLength={500} value={details.meetingLink} onChange={setDetail("meetingLink")} placeholder="https://" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="desk-notes" className="text-sm font-semibold text-foreground">HR notes <span className="font-normal text-muted-foreground">(optional)</span></label>
              <textarea id="desk-notes" rows={3} value={details.hrNotes} onChange={setDetail("hrNotes")} className={textareaClass} />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditing(null)} className={candidateStyles.ghost}>Cancel</button>
              <button type="submit" disabled={update.isPending} className={primaryButton}>{update.isPending ? "Saving…" : "Save details"}</button>
            </div>
          </form>
        )}
      </ActionDialog>

      <ActionDialog open={Boolean(cancelling)} onClose={closeCancel} title="Cancel this booking?" description="The employee is told, with your reason.">
        <form onSubmit={cancel} className="space-y-4">
          <div>
            <label htmlFor="desk-cancel-reason" className="text-sm font-semibold text-foreground">Reason</label>
            <textarea id="desk-cancel-reason" required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className={textareaClass} />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeCancel} className={candidateStyles.ghost}>Keep booking</button>
            <button type="submit" disabled={!reason.trim() || update.isPending} className={cn(primaryButton, "bg-destructive text-white")}>
              {update.isPending ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        </form>
      </ActionDialog>

      <ActionDialog open={Boolean(moving)} onClose={closeMove} title="Pick a new time" description={`Times when ${moving?.hrName || "the HR person"} and ${moving?.employee_name || "the employee"} are both free.`}>
        {moving && (
          <div className="space-y-5">
            <SlotPicker timeZone={timeZone} hrEmployeeId={moving.hr_employee_id} employeeId={moving.employee_id} mode={moving.mode} value={slot?.start} onChange={setSlot} />
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
