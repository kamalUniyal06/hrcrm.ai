import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "react-router-dom";
import { candidateName, fetchAllRecords } from "../candidates/candidatesApi";
import { candidateId, displayInterviewTime, hasOutcome, roundName, uniqueInterviews } from "./interviewUtils";
import InterviewActionDialog from "./InterviewActionDialog";

export default function CandidateInterviewsDialog({ candidate, statusOptions, onClose }) {
  const [selected, setSelected] = useState(null);
  const interviews = useQuery({ queryKey: ["interviews"], queryFn: () => fetchAllRecords("hrc_interviews") });
  const records = uniqueInterviews(interviews.data || []).filter((item) => candidateId(item) === String(candidate.id) && !hasOutcome(item));
  if (selected) return <InterviewActionDialog record={selected} action="schedule" statusOptions={statusOptions} onClose={onClose} />;
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-999 max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <Dialog.Title className="text-xl font-semibold">Reschedule interview</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-slate-500">Select the interview for {candidateName(candidate)}.</Dialog.Description>
        <div className="my-5 space-y-3">
          {interviews.isPending ? <p role="status">Loading interviews...</p> : interviews.isError ? <p role="alert" className="text-red-700">{interviews.error.message} <button onClick={() => interviews.refetch()} className="underline">Retry</button></p> : records.length ? records.map((record) => <button key={record.id} onClick={() => setSelected(record)} className="block w-full rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-400"><span className="block break-words font-medium">{roundName(record)}</span><span className="mt-1 block text-sm text-slate-500">{displayInterviewTime(record)}</span>{record.job_id && <span className="mt-1 block break-all text-xs text-slate-500">Job: {record.job_id}</span>}</button>) : <p className="text-sm text-slate-500">No pending interviews are available to reschedule. <Link to="/interviews" className="text-indigo-600 underline">View interviews</Link></p>}
        </div>
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Close</button>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
