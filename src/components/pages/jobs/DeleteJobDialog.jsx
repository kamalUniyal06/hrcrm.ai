import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { deleteJobPosting } from "./jobsApi";
import { titleOf } from "./jobFormatting";

export default function DeleteJobDialog({ job, onClose, onDeleted }) {
  const isAdmin = useSelector(state => state.user.userInfo?.status === "admin");
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!isAdmin || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await deleteJobPosting(job.id);
      onDeleted(job.id);
    } catch (err) {
      setError(err.message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return <AlertDialog.Root open={isAdmin} onOpenChange={open => { if (!open && !busy) onClose(); }}><AlertDialog.Portal>
    <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
    <AlertDialog.Content className="fixed left-1/2 top-1/2 z-999 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 size={24} /></div>
      <AlertDialog.Title className="text-xl font-semibold text-slate-900">Delete job posting?</AlertDialog.Title>
      <AlertDialog.Description className="mt-3 break-words text-sm leading-6 text-slate-600">“{titleOf(job)}” will be removed from job postings. Candidates will no longer be able to apply to this posting.</AlertDialog.Description>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-7 flex justify-end gap-3">
        <AlertDialog.Cancel disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</AlertDialog.Cancel>
        <button type="button" disabled={busy || !isAdmin} onClick={remove} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}{busy ? "Deleting…" : "Delete posting"}</button>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal></AlertDialog.Root>;
}
