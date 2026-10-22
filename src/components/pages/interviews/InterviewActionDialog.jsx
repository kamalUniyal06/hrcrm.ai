import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarPlus, Check, Loader2, X } from "lucide-react";
import { Button } from "../../ui/button";
import toast from "react-hot-toast";
import { createInterview, fetchAllRecords, fetchCandidateRecord, fetchInterviewRecord, updateCandidateRecord, updateInterview, workflowUpdate, workflowValue } from "../candidates/candidatesApi";
import { findInterviewCandidate } from "../../../services/recruitmentUtils";
import { HIRED_WORKFLOW, candidateId, clean, hasOutcome, isFinalRound, localInterviewTime, nextPipelineRound, nextRoundData, passToNextRound, roundName } from "./interviewUtils";

export default function InterviewActionDialog({ record, action, targetRound = "", statusOptions = [], onClose }) {
  const client = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dateTime, setDateTime] = useState(localInterviewTime(record.interview_datetime));
  const [feedback, setFeedback] = useState(record.interview_feedback || "");
  // A drop picks the round; otherwise passing follows the pipeline (Round 1 → 2 → 3).
  const nextRound = targetRound || (action === "Pass" ? nextPipelineRound(record) : "");
  const [advancing, setAdvancing] = useState(false);
  const deciding = action === "Pass" || action === "Fail";
  const hires = action === "Pass" && !nextRound && isFinalRound(record);

  // Builds the candidate's Joining stage update before anything is written. Their status is left unchanged.
  async function hiringUpdate(interview) {
    const id = candidateId(interview) || findInterviewCandidate(interview, await client.fetchQuery({ queryKey: ["candidates", "list"], queryFn: () => fetchAllRecords("hrc_candidates") }))?.id;
    if (!id) throw new Error("This interview isn't linked to a candidate, so they can't be moved to Joining. Add the candidate before passing the final round.");
    const [candidate, stages] = await Promise.all([
      fetchCandidateRecord(id),
      client.fetchQuery({ queryKey: ["candidate-workflow", "stage"], queryFn: () => fetchAllRecords("hrc_stages"), staleTime: 300000 }),
    ]);
    return { id, data: workflowUpdate(candidate, "stage", HIRED_WORKFLOW.stage, stages.filter((item) => item.id && item.name)) };
  }
  const title = targetRound ? `Move to ${targetRound}` : deciding ? `Mark as ${action.toLowerCase()}` : clean(record.interview_datetime) ? "Reschedule interview" : "Schedule interview";

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
      if (targetRound) {
        if (hasOutcome(fresh)) throw new Error("Completed interviews cannot be moved between rounds.");
        const id = candidateId(fresh);
        if (id) {
          const candidate = await fetchCandidateRecord(id);
          if (clean(workflowValue(candidate, "status", statusOptions)).toLowerCase() === "rejected")
            throw new Error("Rejected candidates cannot be moved between rounds.");
        }
      }
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
      if (hires) {
        const hire = await hiringUpdate(fresh);
        await updateCandidateRecord(hire.id, hire.data);
        void client.invalidateQueries({ queryKey: ["candidates"] });
        void client.invalidateQueries({ queryKey: ["candidate-profile"] });
      }
      if (action === "Pass" && nextRound) {
        nextRoundData(fresh, nextRound);
        setAdvancing(true);
        await passToNextRound(fresh, feedback, nextRound, { fetchAllRecords, createInterview, updateInterview });
      } else await updateInterview(fresh.id, data);
      client.setQueryData(["interviews"], (records) => records?.map((item) => item.id === fresh.id ? { ...item, ...data } : item));
      void client.invalidateQueries({ queryKey: ["interviews"] });
      toast.success(targetRound ? `Feedback saved. Moved to ${nextRound}.` : action === "Pass" ? (nextRound ? `Passed. ${nextRound} is ready to schedule.` : hires ? `Passed ${roundName(record)}. Candidate selected and moved to the ${HIRED_WORKFLOW.stage} stage.` : "Interview marked as pass.") : deciding ? `Interview marked as ${action.toLowerCase()}.` : "Interview date saved.");
      onClose();
    } catch (err) { setError(err.message); }
    finally { lock.current = false; setBusy(false); }
  }

  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-sm" />
      <Dialog.Content onInteractOutside={(event) => event.preventDefault()} className="fixed left-1/2 top-1/2 z-999 max-h-[90dvh] w-[calc(100vw_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl outline-none sm:p-6">
        <span className="mb-4 grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground" aria-hidden="true">{action === "Pass" ? <Check size={20} /> : action === "Fail" ? <X size={20} /> : <CalendarPlus size={20} />}</span>
        <Dialog.Title className="pr-8 font-serif text-2xl tracking-tight">{title}</Dialog.Title>
        <Dialog.Description className="mt-2 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{record.name || record.email || "Candidate"} · {roundName(record)}</Dialog.Description>
        {targetRound && <p className="mt-4 rounded-lg border border-border bg-secondary px-3 py-2.5 text-xs leading-relaxed text-secondary-foreground">Add feedback to mark {roundName(record)} as passed and continue in {targetRound}. The card moves after you save.</p>}
        <Button type="button" variant="ghost" size="icon" aria-label="Close interview dialog" disabled={busy} onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={18} /></Button>
        <form onSubmit={save} className="mt-6 space-y-5">
          {deciding ? <label className="block text-xs font-medium">Interview feedback <span className="text-destructive">*</span>
            <textarea required autoFocus={Boolean(targetRound)} rows={5} disabled={busy || advancing} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Explain the outcome of this round" className="mt-2 w-full rounded-lg border border-border bg-background/40 p-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50" />
            {action === "Pass" && !targetRound && <span className="mt-2 block text-xs leading-relaxed font-normal text-muted-foreground">{nextRound ? `Saving opens ${nextRound} for this candidate, ready for you to schedule.` : hires ? `Passing ${roundName(record)} selects them and moves them to the ${HIRED_WORKFLOW.stage} stage. Their status stays the same.` : `Passing ${roundName(record)} completes their interviews.`}</span>}
          </label> : <label className="block text-xs font-medium">Interview date & time
            <input type="datetime-local" required disabled={busy} value={dateTime} onChange={(event) => setDateTime(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background/40 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50" />
            <span className="mt-2 block text-xs font-normal text-muted-foreground">Your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</span>
          </label>}
          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">{error}{advancing && " Retry to finish advancing this candidate; an existing next-round record will be reused."}</p>}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose} className="h-10 bg-card px-4 text-xs">Cancel</Button>
            <Button disabled={busy} className="h-10 gap-2 px-4 text-xs">{busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />}{busy ? "Saving..." : targetRound ? "Save feedback & move" : deciding ? `Save ${action.toLowerCase()} & feedback` : "Save interview date"}</Button>
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
