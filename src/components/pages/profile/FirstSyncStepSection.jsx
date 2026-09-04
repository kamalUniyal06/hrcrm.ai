import { motion as Motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, MailCheck, PartyPopper } from "lucide-react";

function FirstSyncStepSection({
  syncLimit,
  setSyncLimit,
  syncing,
  syncResult,
  onFirstSync,
}) {
  return (
    <section className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-600">
            <MailCheck size={20} />
            <p className="text-sm font-black uppercase tracking-widest">
              First Inbox Sync
            </p>
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Pull your first unread records
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            All onboarding templates are saved or skipped. Choose the current
            sync limit, from 1 to 100. Completed records appear below and can be
            opened directly in the timeline.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">
              Sync Limit
            </span>
            <input
              type="number"
              min="1"
              max="100"
              value={syncLimit}
              onChange={(event) => setSyncLimit(event.target.value)}
              className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15"
            />
          </label>

          <button
            onClick={onFirstSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            {syncing ? "Syncing..." : "Run First Sync"}
          </button>
        </div>
      </div>

      {syncResult && (
        <Motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-700">
                  Sync completed
                </p>
                <p className="text-xs font-semibold text-emerald-700/75">
                  {syncResult.message} Found: {syncResult.count}
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700">
              <PartyPopper size={16} />
              Ready to review
            </div>
          </div>
        </Motion.div>
      )}
    </section>
  );
}

export default FirstSyncStepSection;
