import { motion as Motion } from "framer-motion";
import { Loader2, Trash2, UserCircle2 } from "lucide-react";
import { getUserName } from "./profileUtils";
import { useCrmUsers } from "../../../queries/users.queries";

export function MetricCard({ label, value, tone }) {
  const toneClasses = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses[tone]}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-black leading-none">{value}</p>
    </div>
  );
}

function ProfileSummary({
  user,
  profileEmail,
  currentScore,
  websitesCount,
  websitesLoading,
  onboardingLoading,
  completion,
  syncDone,
  profileDeleting,
  onDeleteProfile,
}) {
  const { data } = useCrmUsers()
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UserCircle2 size={38} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-500">
              Profile Setup
            </p>
            <h1 className="text-2xl font-black text-slate-950">
              {data?.find(u => u.description === user.email)?.name ?? user.name}
            </h1>
            <p className="text-sm text-slate-500">{profileEmail}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_auto_240px_auto] sm:items-center">
          <MetricCard
            label="AI Credits"
            value={currentScore ?? "N/A"}
            tone="indigo"
          />
          <MetricCard
            label="Websites"
            value={websitesLoading ? "..." : websitesCount}
            tone="emerald"
          />
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500">
              <span>
                {onboardingLoading ? "Checking..." : `${completion}% completed`}
              </span>
              <span>{onboardingLoading ? "Loading" : syncDone ? "Ready" : "Setup"}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white">
              <Motion.div
                initial={{ width: 0 }}
                animate={{ width: onboardingLoading ? "35%" : `${completion}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className={`h-full rounded-full transition-all ${onboardingLoading
                  ? "animate-pulse bg-slate-300"
                  : "bg-linear-to-r from-emerald-500 via-indigo-500 to-cyan-500"
                  }`}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onDeleteProfile}
            disabled={profileDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {profileDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}

          </button>
        </div>
      </div>
    </section>
  );
}

export default ProfileSummary;
