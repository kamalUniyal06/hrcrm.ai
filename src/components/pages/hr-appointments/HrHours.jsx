import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CalendarOff, Clock, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAvailability, useDeleteAvailability, useLookups, useSaveAvailability } from "../../../queries/hr.queries";
import { personName } from "../../../utils/hrOrg";
import { WEEKDAYS, formatDate, normalizeAvailability, parseDateTime, toIsoWithOffset } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, EmptyState, QueryState, fieldClass, primaryButton } from "../org/orgUi";

const SLOT_LENGTHS = [15, 20, 30, 45, 60];
const NEW_HOURS = { days: [1, 2, 3, 4, 5], start: "10:00", end: "13:00", slotMinutes: 30, validFrom: "", validTo: "" };
const blockTime = (value, timeZone) => formatDate(value, timeZone, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
// datetime-local wants "YYYY-MM-DDTHH:mm" in the browser's own time.
const localInput = (date) => toIsoWithOffset(date).slice(0, 16);

function HoursDialog({ editing, hrEmployeeId, onClose }) {
  const save = useSaveAvailability();
  const isNew = !editing.id;
  const [form, setForm] = useState(() => (isNew ? NEW_HOURS : { ...editing, days: [editing.day] }));
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggleDay = (day) =>
    setForm((current) => ({ ...current, days: current.days.includes(day) ? current.days.filter((d) => d !== day) : [...current.days, day].sort() }));
  const badTimes = form.end <= form.start;
  const badDates = Boolean(form.validFrom && form.validTo && form.validTo < form.validFrom);

  const submit = async (event) => {
    event.preventDefault();
    const rule = { rule_type: "weekly", start_time: form.start, end_time: form.end, slot_minutes: Number(form.slotMinutes), valid_from: form.validFrom, valid_to: form.validTo };
    // One rule per weekday: the backend stores each day separately.
    const results = await Promise.allSettled(form.days.map((day) => save.mutateAsync({ id: editing.id, hrEmployeeId, rule: { ...rule, day_of_week: day } })));
    const failed = form.days.filter((_, index) => results[index].status === "rejected");
    if (!failed.length) {
      toast.success(isNew ? "Hours added" : "Hours saved");
      onClose();
      return;
    }
    // Keep only the days that didn't save, so trying again doesn't add the others twice.
    toast.error(results.find((result) => result.status === "rejected").reason?.message || "These hours couldn't be saved.");
    setForm((current) => ({ ...current, days: failed }));
  };

  return (
    <ActionDialog open onClose={onClose} title={isNew ? "Add bookable hours" : "Change these hours"} description="Employees can book you in these hours, split into slots of the length you choose.">
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-semibold text-foreground">{isNew ? "Days" : "Day"}</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {WEEKDAYS.map(([day, label]) => (
              <label key={day} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm", form.days.includes(day) ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground")}>
                <input
                  type={isNew ? "checkbox" : "radio"}
                  name="hours-day"
                  checked={form.days.includes(day)}
                  onChange={() => (isNew ? toggleDay(day) : setForm((current) => ({ ...current, days: [day] })))}
                  className="size-4 accent-primary"
                />
                {label.slice(0, 3)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="hours-start" className="text-sm font-semibold text-foreground">From</label>
            <input id="hours-start" type="time" required value={form.start} onChange={set("start")} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="hours-end" className="text-sm font-semibold text-foreground">Until</label>
            <input id="hours-end" type="time" required value={form.end} onChange={set("end")} aria-invalid={badTimes} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="hours-slot" className="text-sm font-semibold text-foreground">Slot length</label>
            <select id="hours-slot" value={form.slotMinutes} onChange={set("slotMinutes")} className={fieldClass}>
              {SLOT_LENGTHS.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hours-from" className="text-sm font-semibold text-foreground">Starting <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="hours-from" type="date" value={form.validFrom} onChange={set("validFrom")} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="hours-to" className="text-sm font-semibold text-foreground">Ending <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="hours-to" type="date" value={form.validTo} min={form.validFrom || undefined} onChange={set("validTo")} aria-invalid={badDates} className={fieldClass} />
          </div>
        </div>
        {badTimes && <p className="text-sm text-destructive">The end time must be after the start time.</p>}
        {badDates && <p className="text-sm text-destructive">The end date can't be before the start date.</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={save.isPending || badTimes || badDates || !form.days.length} className={primaryButton}>{save.isPending ? "Saving…" : isNew ? "Add hours" : "Save hours"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}

function TimeOffDialog({ hrEmployeeId, onClose }) {
  const save = useSaveAvailability();
  const [form, setForm] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(18);
    return { start: localInput(start), end: localInput(end), note: "" };
  });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const bad = !form.start || !form.end || form.end <= form.start;

  const submit = (event) => {
    event.preventDefault();
    save.mutate(
      { hrEmployeeId, rule: { rule_type: "block", block_start: toIsoWithOffset(new Date(form.start)), block_end: toIsoWithOffset(new Date(form.end)), description: form.note.trim() } },
      { onSuccess: () => { toast.success("Time off added"); onClose(); }, onError: (error) => toast.error(error.message) },
    );
  };

  return (
    <ActionDialog open onClose={onClose} title="Add time off" description="No one can book you during this time. Bookings already made aren't moved.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="off-start" className="text-sm font-semibold text-foreground">From</label>
            <input id="off-start" type="datetime-local" required value={form.start} onChange={set("start")} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="off-end" className="text-sm font-semibold text-foreground">Until</label>
            <input id="off-end" type="datetime-local" required min={form.start} value={form.end} onChange={set("end")} aria-invalid={bad} className={fieldClass} />
          </div>
        </div>
        <div>
          <label htmlFor="off-note" className="text-sm font-semibold text-foreground">Note <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input id="off-note" maxLength={255} value={form.note} onChange={set("note")} placeholder="e.g. Training, travel" className={fieldClass} />
        </div>
        <p className="text-xs text-muted-foreground">Times are in your device's time zone.</p>
        {bad && form.start && form.end && <p className="text-sm text-destructive">The end must be after the start.</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={save.isPending || bad} className={primaryButton}>{save.isPending ? "Saving…" : "Add time off"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}

/**
 * An HR person's bookable hours (weekly, per weekday) and time off. `canPickHr` (admins, or "all"
 * on HR availability) lets the user manage anyone's hours; otherwise only their own.
 */
export default function HrHours({ selfId, canPickHr, timeZone }) {
  const lookups = useLookups();
  const [picked, setPicked] = useState("");
  const hrEmployeeId = picked || selfId || "";
  const query = useAvailability(hrEmployeeId, { enabled: Boolean(hrEmployeeId) });
  const save = useSaveAvailability();
  const remove = useDeleteAvailability();
  const [editing, setEditing] = useState(null);
  const [addingTimeOff, setAddingTimeOff] = useState(false);
  const [removing, setRemoving] = useState(null);
  const availability = useMemo(() => normalizeAvailability(query.data), [query.data]);
  const zone = availability.timeZone || timeZone;
  const now = Date.now();
  const timeOff = availability.blocks.filter((block) => (parseDateTime(block.end)?.getTime() || 0) >= now);
  const hasHours = availability.weekly.some((day) => day.rules.length);
  const employees = useMemo(() => (lookups.data?.employees ?? []).filter((employee) => employee.id), [lookups.data]);

  const toggle = (rule) =>
    save.mutate(
      { id: rule.id, hrEmployeeId, rule: { is_active: rule.active ? 0 : 1 } },
      { onSuccess: () => toast.success(rule.active ? "Hours paused" : "Hours back on"), onError: (error) => toast.error(error.message) },
    );
  const confirmRemove = () =>
    remove.mutate(removing.id, {
      onSuccess: () => { toast.success(removing.kind === "block" ? "Time off removed" : "Hours removed"); setRemoving(null); },
      onError: (error) => toast.error(error.message),
    });

  return (
    <div className="space-y-6">
      {canPickHr && (
        <div className="max-w-sm">
          <label htmlFor="hours-person" className="text-sm font-semibold text-foreground">Whose hours</label>
          <select id="hours-person" value={hrEmployeeId} onChange={(event) => setPicked(event.target.value)} className={fieldClass}>
            {!hrEmployeeId && <option value="">Choose an HR person</option>}
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{personName(employee)}{employee.id === selfId ? " (you)" : ""}</option>)}
          </select>
        </div>
      )}

      {!hrEmployeeId ? (
        <EmptyState icon={Clock} title="Choose whose hours to manage">Pick an HR person above to see and change when they can be booked.</EmptyState>
      ) : (
        <QueryState query={query} rows={5}>
          <section aria-labelledby="weekly-hours" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="weekly-hours" className={candidateStyles.sectionTitle}>Weekly hours</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">When employees can book{picked && picked !== selfId ? " this person" : " you"}{zone ? `, in ${zone}` : ""}.</p>
              </div>
              <button type="button" onClick={() => setEditing({})} className={primaryButton} data-tour="hr-hours-add"><Plus size={16} aria-hidden="true" /> Add hours</button>
            </div>
            {hasHours ? (
              <ul className={cn(candidateStyles.card, "divide-y divide-border")}>
                {availability.weekly.map((day) => (
                  <li key={day.day} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
                    <p className="w-28 shrink-0 pt-2 text-sm font-semibold text-foreground">{day.label}</p>
                    {day.rules.length ? (
                      <ul className="flex-1 space-y-1">
                        {day.rules.map((rule) => (
                          <li key={rule.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className={cn("text-sm tabular-nums", rule.active ? "text-foreground" : "text-muted-foreground line-through")}>{rule.start}–{rule.end}</span>
                            <span className="text-xs text-muted-foreground">{rule.slotMinutes}-minute slots</span>
                            {!rule.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">Paused</span>}
                            {(rule.validFrom || rule.validTo) && (
                              <span className="text-xs text-muted-foreground">
                                {rule.validFrom && `from ${formatDate(rule.validFrom)}`}{rule.validFrom && rule.validTo && " "}{rule.validTo && `until ${formatDate(rule.validTo)}`}
                              </span>
                            )}
                            <span className="ml-auto flex">
                              <button type="button" onClick={() => setEditing({ ...rule, day: day.day })} aria-label={`Change ${day.label} ${rule.start}–${rule.end}`} className={candidateStyles.iconButton}><Pencil size={16} aria-hidden="true" /></button>
                              <button type="button" onClick={() => toggle(rule)} disabled={save.isPending} aria-label={`${rule.active ? "Pause" : "Resume"} ${day.label} ${rule.start}–${rule.end}`} className={candidateStyles.iconButton}>
                                {rule.active ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                              </button>
                              <button type="button" onClick={() => setRemoving({ ...rule, kind: "weekly", label: `${day.label} ${rule.start}–${rule.end}` })} aria-label={`Remove ${day.label} ${rule.start}–${rule.end}`} className={cn(candidateStyles.iconButton, "hover:text-destructive")}><Trash2 size={16} aria-hidden="true" /></button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="pt-2 text-sm text-muted-foreground">Not bookable</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Clock} title="No bookable hours yet">Add the hours you're free each week. Until then, employees can't book you.</EmptyState>
            )}
          </section>

          <section aria-labelledby="time-off" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="time-off" className={candidateStyles.sectionTitle}>Time off</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Leave, training or anything else that blocks bookings.</p>
              </div>
              <button type="button" onClick={() => setAddingTimeOff(true)} className={candidateStyles.ghost}><Plus size={16} aria-hidden="true" /> Add time off</button>
            </div>
            {timeOff.length ? (
              <ul className={cn(candidateStyles.card, "divide-y divide-border")}>
                {timeOff.map((block) => (
                  <li key={block.id} className="flex items-center gap-3 px-4 py-2">
                    <CalendarOff size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{blockTime(block.start, zone)} – {blockTime(block.end, zone)}</p>
                      {block.note && <p className="truncate text-xs text-muted-foreground">{block.note}</p>}
                    </div>
                    <button type="button" onClick={() => setRemoving({ ...block, kind: "block", label: "this time off" })} aria-label={`Remove time off from ${blockTime(block.start, zone)}`} className={cn(candidateStyles.iconButton, "hover:text-destructive")}><Trash2 size={16} aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn(candidateStyles.card, "px-4 py-4 text-sm text-muted-foreground")}>No time off coming up.</p>
            )}
          </section>
        </QueryState>
      )}

      {editing && <HoursDialog editing={editing} hrEmployeeId={hrEmployeeId} onClose={() => setEditing(null)} />}
      {addingTimeOff && <TimeOffDialog hrEmployeeId={hrEmployeeId} onClose={() => setAddingTimeOff(false)} />}
      <ActionDialog open={Boolean(removing)} onClose={() => setRemoving(null)} title={`Remove ${removing?.label ?? ""}?`} description={removing?.kind === "block" ? "Employees can book these times again." : "Employees can't book these hours any more. Bookings already made stay."}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setRemoving(null)} className={candidateStyles.ghost}>Keep</button>
          <button type="button" onClick={confirmRemove} disabled={remove.isPending} className={cn(primaryButton, "bg-destructive text-white")}>{remove.isPending ? "Removing…" : "Remove"}</button>
        </div>
      </ActionDialog>
    </div>
  );
}
