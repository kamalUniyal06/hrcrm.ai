import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { createInterview, fetchAllRecords, fetchCandidateRecord, fetchInterviewRecord, updateInterview, workflowValue } from "../candidates/candidatesApi";
import { candidateId, clean, hasOutcome, localInterviewTime, nextRoundData, nextRoundName, passToNextRound, roundName } from "./interviewUtils";

export default function InterviewActionDialog({ record, action, statusOptions = [], onClose }) {
  const client = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dateTime, setDateTime] = useState(localInterviewTime(record.interview_datetime));
  const [feedback, setFeedback] = useState(record.interview_feedback || "");
  const [nextRound, setNextRound] = useState(nextRoundName(record));
  const [advancing, setAdvancing] = useState(false);
  const deciding = action === "Pass" || action === "Fail";
  const title = deciding ? `Mark as ${action.toLowerCase()}` : clean(record.interview_datetime) ? "Reschedule interview" : "Schedule interview";

  async function save(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const fresh = await fetchInterviewRecord(record.id);
      if (["date_modified", "interview_status", "interview_datetime", "interview_feedback", "description", "job_id", "candidate_id"].some((field) => clean(fresh[field]) !== clean(record[field])))
        throw new Error("This interview changed since you opened it. Close this dialog and refresh before saving.");
      let data;
      if (deciding) {
        if (!feedback.trim()) throw new Error("Interview feedback is required for both pass and fail.");
        data = { interview_status: action, interview_feedback: feedback.trim() };
      } else {
        if (hasOutcome(fresh)) throw new Error("A completed interview cannot be rescheduled.");
        const id = candidateId(fresh);
        if (id) {
          const candidate = await fetchCandidateRecord(id);
          if (clean(workflowValue(candidate, "status", statusOptions)).toLowerCase() === "rejected")
            throw new Error("Rejected candidates cannot be scheduled or rescheduled.");
        }
        const date = new Date(dateTime);
        if (!Number.isFinite(date.getTime()) || date <= new Date()) throw new Error("Choose a date and time in the future.");
        data = { interview_datetime: date.toISOString().slice(0, 19).replace("T", " ") };
      }
      if (action === "Pass") {
        nextRoundData(fresh, nextRound);
        setAdvancing(true);
        await passToNextRound(fresh, feedback, nextRound, { fetchAllRecords, createInterview, updateInterview });
      } else await updateInterview(fresh.id, data);
      client.setQueryData(["interviews"], (records) => records?.map((item) => item.id === fresh.id ? { ...item, ...data } : item));
      void client.invalidateQueries({ queryKey: ["interviews"] });
      toast.success(action === "Pass" ? `Passed. ${nextRound.trim()} is ready to schedule.` : deciding ? `Interview marked as ${action.toLowerCase()}.` : "Interview date saved.");
      onClose();
    } catch (err) { setError(err.message); }
    finally { lock.current = false; setBusy(false); }
  }

  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
      <Dialog.Content onInteractOutside={(event) => event.preventDefault()} className="fixed left-1/2 top-1/2 z-999 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <Dialog.Title className="pr-8 text-xl font-semibold text-slate-900">{title}</Dialog.Title>
        <Dialog.Description className="mt-2 break-words text-sm text-slate-500">{record.name || record.email || "Candidate"} · {roundName(record)}</Dialog.Description>
        <button type="button" aria-label="Close interview dialog" disabled={busy} onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 disabled:opacity-40"><X size={18} /></button>
        <form onSubmit={save} className="mt-6 space-y-5">
          {deciding ? <label className="block text-sm font-medium text-slate-700">Interview feedback <span className="text-red-600">*</span>
            <textarea required rows={5} disabled={busy || advancing} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Explain the outcome of this round" className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-indigo-500" />
          </label> : <label className="block text-sm font-medium text-slate-700">Interview date & time
            <input type="datetime-local" required disabled={busy} value={dateTime} onChange={(event) => setDateTime(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-indigo-500" />
            <span className="mt-2 block text-xs font-normal text-slate-500">Your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</span>
          </label>}
          {action === "Pass" && <label className="block text-sm font-medium text-slate-700">Next round
            <input required disabled={busy || advancing} value={nextRound} onChange={(event) => setNextRound(event.target.value)} placeholder="For example, Round 2 or Technical" className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
            <span className="mt-2 block text-xs font-normal text-slate-500">Creates an unscheduled interview for the same candidate and job. The passed round is kept in the CRM and removed from the round cards.</span>
          </label>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}{advancing && " Retry to finish advancing this candidate; an existing next-round record will be reused."}</p>}
          <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}{busy ? "Saving..." : deciding ? `Save ${action.toLowerCase()} & feedback` : "Save interview date"}</button>
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
