import { createElement, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, CalendarClock, CalendarPlus, CircleAlert, Clock3, Loader2, Mail, NotebookPen, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import { interviewKey, localInterviewTime } from "../interviews/interviewUtils";
import {
  candidateName,
  createInterview,
  updateCandidateRecord,
  workflowUpdate,
  workflowValue,
  fetchCandidateRecord,
  fetchAllRecords,
} from "./candidatesApi";

// Interviews scheduled from a candidate always start the pipeline. The board groups by
// `description` and only Round 1 offers test links, so it's set here rather than typed.
const FIRST_ROUND = "Round 1";
const controlClass =
  "w-full rounded-lg border border-border bg-card pl-10 pr-3.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/20 disabled:bg-muted disabled:text-muted-foreground motion-reduce:transition-none";

function Field({ id, label, icon, hint, optional, multiline, children }) {
  return (
    <div className="group">
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-foreground">
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
      </label>
      <div className="relative mt-2">
        {createElement(icon, {
          size: 17,
          strokeWidth: 1.8,
          "aria-hidden": true,
          className: cn("pointer-events-none absolute left-3.5 text-muted-foreground transition-colors group-focus-within:text-primary motion-reduce:transition-none", multiline ? "top-3.5" : "top-1/2 -translate-y-1/2"),
        })}
        {children}
      </div>
      {hint && <p id={`${id}-hint`} className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function ScheduleInterviewDialog({ record, lookups, onClose }) {
  const client = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");
  const [earliest] = useState(() => localInterviewTime(new Date().toISOString()));
  const [draft, setDraft] = useState({
    name: candidateName(record),
    email: record.email1 || record.email || "",
    interview_datetime: "",
    interview_feedback: "",
    job_id: String(record.job_id || ""),
  });
  const name = candidateName(record) || "This candidate";
  const currentStatus = workflowValue(record, "status", lookups.status.data).trim();
  const showFromStatus = currentStatus && !/^(unassigned|scheduled)$/i.test(currentStatus);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const change = (event) =>
    setDraft((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  async function save(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const fresh = await fetchCandidateRecord(record.id);
      if (workflowValue(fresh, "status", lookups.status.data).trim().toLowerCase() === "rejected")
        throw new Error("Rejected candidates cannot be scheduled.");
      const status = workflowUpdate(
        fresh,
        "status",
        "Scheduled",
        lookups.status.data,
      );
      if (!created) {
        const existing = await fetchAllRecords("hrc_interviews");
        const jobId = draft.job_id.trim();
        if (existing.some((item) => interviewKey(item) === interviewKey({ ...draft, description: FIRST_ROUND, candidate_id: record.id, job_id: jobId })))
          throw new Error(`${name} already has a ${FIRST_ROUND} interview. Reschedule it from Interviews.`);
        if (!draft.name.trim() || !draft.email.trim())
          throw new Error("Enter a candidate name and email.");
        const date = new Date(draft.interview_datetime);
        if (!Number.isFinite(date.getTime()) || date <= new Date())
          throw new Error("Choose an interview date and time in the future.");
        await createInterview({
          ...draft,
          name: draft.name.trim(),
          email: draft.email.trim(),
          description: FIRST_ROUND,
          interview_feedback: draft.interview_feedback.trim(),
          job_id: jobId,
          candidate_id: record.id,
          interview_datetime: date.toISOString().slice(0, 19).replace("T", " "),
        });
        setCreated(true);
      }
      await updateCandidateRecord(record.id, status);
      client.setQueryData(["candidates", "list"], (items) =>
        items?.map((item) =>
          item.id === record.id ? { ...item, ...status } : item,
        ),
      );
      void client.invalidateQueries({ queryKey: ["candidates"] });
      void client.invalidateQueries({ queryKey: ["candidate-profile"] });
      void client.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Interview saved. Candidate marked as Scheduled.");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy && !created) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
        <Dialog.Content
          onInteractOutside={(event) => event.preventDefault()}
          className="custom-scrollbar fixed left-1/2 top-1/2 z-999 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-card text-card-foreground shadow-2xl motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95"
        >
          <header className="relative bg-linear-to-r from-sidebar-primary to-sidebar-secondary px-6 pt-6 pb-6 text-white sm:px-8 sm:pt-8">
            <span className="mb-5 grid size-12 place-items-center rounded-[14px] bg-highlight text-highlight-foreground" aria-hidden="true">
              <CalendarPlus size={24} />
            </span>
            <Dialog.Title className="pr-10 text-2xl font-semibold tracking-tight">
              Schedule an interview
            </Dialog.Title>
            <Dialog.Description className="mt-1.5 max-w-md text-sm leading-6 text-white/75">
              This sets up {FIRST_ROUND} for <span className="font-medium text-white">{name}</span>. They move to Scheduled when you save.
            </Dialog.Description>
            <p className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium" aria-hidden="true">
              {showFromStatus && <>
                <span className="rounded-full border border-white/20 px-2.5 py-1 text-white/80">{currentStatus}</span>
                <ArrowRight size={14} className="text-white/60" />
              </>}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-2.5 py-1 text-highlight-foreground"><CalendarPlus size={12} />Scheduled</span>
              <span className="ml-1 rounded-full border border-white/20 px-2.5 py-1 text-white/80">{FIRST_ROUND}</span>
            </p>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close scheduling dialog"
                disabled={busy || created}
                className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-30 motion-reduce:transition-none"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>
          <form onSubmit={save} className="px-6 pt-7 pb-6 sm:px-8 sm:pt-8 sm:pb-8">
            {created && (
              <p
                role="status"
                className="mb-6 flex items-start gap-2.5 rounded-xl border border-[var(--candidate-attention)]/25 bg-[var(--candidate-attention-soft)] p-4 text-sm leading-6 text-[var(--candidate-attention)]"
              >
                <Clock3 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                The interview is saved. Retry the status update below; it won&apos;t create another interview.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mb-6 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-destructive"
              >
                <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            <fieldset disabled={busy || created} className="space-y-6">
              <Field id="schedule-datetime" label="Date and time" icon={CalendarClock} hint={`In your local time (${timeZone}).`}>
                <input
                  id="schedule-datetime"
                  name="interview_datetime"
                  type="datetime-local"
                  required
                  min={earliest}
                  value={draft.interview_datetime}
                  onChange={change}
                  aria-describedby="schedule-datetime-hint"
                  className={cn(controlClass, "h-12 tabular-nums")}
                />
              </Field>
              <div className="grid gap-6 sm:grid-cols-2 sm:gap-5">
                <Field id="schedule-name" label="Candidate name" icon={UserRound}>
                  <input
                    id="schedule-name"
                    name="name"
                    required
                    autoComplete="off"
                    value={draft.name}
                    onChange={change}
                    className={cn(controlClass, "h-12")}
                  />
                </Field>
                <Field id="schedule-email" label="Email address" icon={Mail}>
                  <input
                    id="schedule-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    value={draft.email}
                    onChange={change}
                    className={cn(controlClass, "h-12")}
                  />
                </Field>
              </div>
              <Field id="schedule-notes" label="Interview notes" icon={NotebookPen} optional multiline hint="Shown on the interview card. You can build on these notes when you record the round's feedback.">
                <textarea
                  id="schedule-notes"
                  name="interview_feedback"
                  rows={3}
                  placeholder="Topics to cover, links, or anything the interviewer should know"
                  value={draft.interview_feedback}
                  onChange={change}
                  aria-describedby="schedule-notes-hint"
                  className={cn(controlClass, "min-h-24 resize-y py-3 leading-6")}
                />
              </Field>
            </fieldset>
            <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy || created}
                onClick={onClose}
                className="min-h-11 bg-card px-5"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="min-h-11 gap-2 px-5 font-semibold">
                {busy ? (
                  <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <CalendarPlus size={17} aria-hidden="true" />
                )}
                {busy
                  ? "Saving…"
                  : created
                    ? "Retry status update"
                    : "Save interview"}
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
