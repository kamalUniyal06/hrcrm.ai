import { PartyPopper, RefreshCw, Sparkles, Trophy } from "lucide-react";

export function SetupStep({ title, label, status }) {
  const statusStyles = {
    active: "border-cyan-200 bg-cyan-50 text-cyan-700",
    complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
    skipped: "border-amber-200 bg-amber-50 text-amber-700",
    locked: "border-slate-200 bg-slate-50 text-slate-400",
  };

  const statusLabels = {
    active: "Active",
    complete: "Done",
    skipped: "Skipped",
    locked: "Locked",
  };

  return (
    <div className={`rounded-xl border p-3 ${statusStyles[status]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest">{title}</p>
        <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
          {statusLabels[status]}
        </span>
      </div>
      <p className="mt-2 text-sm font-black text-slate-900">{label}</p>
    </div>
  );
}

export function SetupSteps({ step3Done, templateDone }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <SetupStep
          title="Step 3"
          label="Website Added"
          status={step3Done ? "complete" : "active"}
        />
        <SetupStep
          title="Step 4"
          label="Template Generation"
          status={templateDone ? "complete" : step3Done ? "active" : "locked"}
        />
        <SetupStep
          title="Step 5"
          label="First Sync"
          status={templateDone ? "active" : "locked"}
        />
      </div>
    </section>
  );
}

export function SetupCompleteBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 via-cyan-50 to-indigo-50 p-6 shadow-sm">
      <div className="absolute right-6 top-4 text-emerald-200">
        <Sparkles size={72} />
      </div>
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
            <Trophy size={30} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-emerald-600">
              Setup Complete
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              You are ready to use GuestPostCRM
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Websites are added, templates are ready, inbox sync is done, and
              your workspace is ready for action.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-700 shadow-sm">
            <PartyPopper size={18} />
            100% completed
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
          >
            <RefreshCw size={16} />
            Refresh Page
          </button>
        </div>
      </div>
    </section>
  );
}
