import { useState } from "react";
import { toast } from "react-hot-toast";
import { ArrowLeft, ArrowRight, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookAppointment } from "../../../queries/hr.queries";
import {
  APPOINTMENT_MODES,
  APPOINTMENT_TOPICS,
  formatDate,
  formatTime,
  optionLabel,
  parseDateTime,
  toIsoWithOffset,
} from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import SlotPicker from "./SlotPicker";

const STEPS = ["Topic", "Time", "Confirm"];
const fieldClass = "mt-1.5 min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const primaryButton = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto motion-reduce:transition-none";

function Choice({ name, options, value, onChange, label }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([key, text]) => (
          <label
            key={key}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3.5 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary motion-reduce:transition-none",
              value === key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/40",
            )}
          >
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} className="sr-only" />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Book HR in three steps: topic, mode and person; a time from the week grid; agenda and confirm. */
export default function BookHr({ hr, onBooked }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ topic: "general", mode: "video", hrEmployeeId: "", agenda: "" });
  const [slot, setSlot] = useState(null);
  const book = useBookAppointment();
  const update = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));
    // Open times depend on the person and the mode.
    if (key === "mode" || key === "hrEmployeeId") setSlot(null);
  };
  const hrName = slot?.hrName || hr.people.find((person) => person.id === (slot?.hrId || form.hrEmployeeId))?.name || "The first available HR person";

  const submit = (event) => {
    event.preventDefault();
    book.mutate(
      {
        topic: form.topic,
        mode: form.mode,
        hrEmployeeId: form.hrEmployeeId || slot.hrId,
        start: toIsoWithOffset(parseDateTime(slot.start)),
        agenda: form.agenda.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Booked. HR will see it in their desk.");
          setStep(0);
          setSlot(null);
          setForm((current) => ({ ...current, agenda: "" }));
          onBooked?.();
        },
        onError: (error) => {
          if (error.code === 409) {
            // Someone else took the slot; the slots refetch, so pick again.
            toast.error("That time was just taken. Pick another one.");
            setSlot(null);
            setStep(1);
          } else toast.error(error.message);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className={cn(candidateStyles.card, "p-4 sm:p-6")} data-tour="book-hr">
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Booking steps">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", index === step ? "bg-primary text-primary-foreground" : index < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}
          >
            <span className="tabular-nums">{index + 1}</span> {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-5">
          <Choice name="topic" label="What do you want to talk about?" options={APPOINTMENT_TOPICS} value={form.topic} onChange={update("topic")} />
          <Choice name="mode" label="How do you want to meet?" options={APPOINTMENT_MODES} value={form.mode} onChange={update("mode")} />
          <div className="max-w-sm">
            <label htmlFor="hr-person" className="text-sm font-semibold text-foreground">Who would you like to meet?</label>
            <select id="hr-person" value={form.hrEmployeeId} onChange={(event) => update("hrEmployeeId")(event.target.value)} className={fieldClass}>
              <option value="">Anyone in HR (first available)</option>
              {hr.people.map((person) => (
                <option key={person.id} value={person.id}>{person.title ? `${person.name} · ${person.title}` : person.name}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => setStep(1)} className={primaryButton}>
            Choose a time <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <SlotPicker timeZone={hr.timeZone} hrEmployeeId={form.hrEmployeeId} mode={form.mode} value={slot?.start} onChange={setSlot} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setStep(0)} className={candidateStyles.ghost}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
            <button type="button" onClick={() => setStep(2)} disabled={!slot} className={primaryButton}>
              Continue <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && slot && (
        <div className="space-y-5">
          <dl className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-2">
            {[
              ["When", `${formatDate(slot.start, hr.timeZone, { weekday: "long", day: "numeric", month: "long" })}, ${formatTime(slot.start, hr.timeZone)}`],
              ["With", hrName],
              ["Topic", optionLabel(APPOINTMENT_TOPICS, form.topic)],
              ["How", optionLabel(APPOINTMENT_MODES, form.mode)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <label htmlFor="hr-agenda" className="text-sm font-semibold text-foreground">Agenda <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea
              id="hr-agenda"
              rows={3}
              value={form.agenda}
              onChange={(event) => update("agenda")(event.target.value)}
              placeholder="A line or two so HR can prepare"
              className={cn(fieldClass, "py-2")}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setStep(1)} className={candidateStyles.ghost}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
            <button type="submit" disabled={book.isPending} className={primaryButton}>
              <CalendarCheck size={16} aria-hidden="true" /> {book.isPending ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
