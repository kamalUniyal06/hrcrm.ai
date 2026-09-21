import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarPlus, Check, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { interviewKey } from "../interviews/interviewUtils";
import {
  candidateName,
  createInterview,
  updateCandidateRecord,
  workflowUpdate,
  workflowValue,
  fetchCandidateRecord,
  fetchAllRecords,
} from "./candidatesApi";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 disabled:bg-slate-50 disabled:text-slate-500";

export default function ScheduleInterviewDialog({ record, lookups, onClose }) {
  const client = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: candidateName(record),
    email: record.email1 || record.email || "",
    interview_datetime: "",
    description: "",
    job_id: String(record.job_id || ""),
  });
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
        if (existing.some((item) => interviewKey(item) === interviewKey({ ...draft, candidate_id: record.id, job_id: jobId })))
          throw new Error("An interview already exists for this job or round. Open Interviews to schedule or reschedule that record.");
        if (!draft.name.trim() || !draft.email.trim())
          throw new Error("Enter a candidate name and email.");
        if (!draft.description.trim()) throw new Error("Enter the interview round in Description.");
        const date = new Date(draft.interview_datetime);
        if (!Number.isFinite(date.getTime()) || date <= new Date())
          throw new Error("Choose an interview date and time in the future.");
        await createInterview({
          ...draft,
          name: draft.name.trim(),
          email: draft.email.trim(),
          description: draft.description.trim(),
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-999 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white shadow-2xl"
        >
          <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white sm:p-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <CalendarPlus size={25} />
            </div>
            <Dialog.Title className="text-2xl font-semibold tracking-tight">
              Make the next connection
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-indigo-100">
              Schedule an interview with {candidateName(record)} and keep their
              hiring journey moving.
            </Dialog.Description>
            <button
              type="button"
              aria-label="Close scheduling dialog"
              disabled={busy || created}
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full p-2 hover:bg-white/15 disabled:opacity-30"
            >
              <X size={20} />
            </button>
          </header>
          <form onSubmit={save} className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-xs font-medium text-indigo-600">
              <Check size={15} />
              Shortlisted
              <span className="mx-2 h-px flex-1 bg-indigo-100" />
              <CalendarPlus size={15} />
              Interview
            </div>
            {created && (
              <p
                role="status"
                className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
              >
                The interview is saved. Finish updating the candidate status
                below; retrying will not create another interview.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <fieldset disabled={busy || created} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Candidate name
                  <input
                    name="name"
                    required
                    value={draft.name}
                    onChange={change}
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    value={draft.email}
                    onChange={change}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Interview date & time
                <input
                  name="interview_datetime"
                  type="datetime-local"
                  required
                  value={draft.interview_datetime}
                  onChange={change}
                  className={inputClass}
                />
                <span className="mt-2 block text-xs font-normal text-slate-500">
                  Your local time (
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}).
                </span>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Description / round
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="Round 1, Round 2, Technical..."
                  value={draft.description}
                  onChange={change}
                  className={inputClass}
                />
                <span className="mt-2 block text-xs font-normal text-slate-500">Use a round name such as Round 1 or Technical. Interviews are grouped by this value.</span>
              </label>
            </fieldset>
            <footer className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={busy || created}
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <CalendarPlus size={17} />
                )}
                {busy
                  ? "Saving…"
                  : created
                    ? "Retry status update"
                    : "Save interview"}
              </button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
