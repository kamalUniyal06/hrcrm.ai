import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, RefreshCw, Search } from "lucide-react";
import { fetchAllRecords, workflowValue } from "./candidates/candidatesApi";
import InterviewActionDialog from "./interviews/InterviewActionDialog";
import { candidateId, clean, displayInterviewTime, groupInterviews, hasOutcome } from "./interviews/interviewUtils";

const actionClass = "rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-40";

export default function Interview() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const interviews = useQuery({ queryKey: ["interviews"], queryFn: () => fetchAllRecords("hrc_interviews") });
  const candidates = useQuery({ queryKey: ["candidates", "list"], queryFn: () => fetchAllRecords("hrc_candidates") });
  const statuses = useQuery({ queryKey: ["candidate-workflow", "status"], queryFn: () => fetchAllRecords("hrc_status"), staleTime: 300000 });
  const candidateMap = useMemo(() => new Map((candidates.data || []).map((record) => [String(record.id), record])), [candidates.data]);
  const groups = useMemo(() => groupInterviews(interviews.data || []), [interviews.data]);
  const visible = groups.map((group) => ({ ...group, records: group.records.filter((record) => [record.name, record.email, record.job_id, group.name].some((value) => clean(value).toLowerCase().includes(search.trim().toLowerCase()))) })).filter((group) => group.records.length);
  const count = groups.reduce((total, group) => total + group.records.length, 0);
  function refresh() { [interviews, candidates, statuses].forEach((query) => { void query.refetch(); }); }

  return <main className="min-h-full space-y-6 rounded-2xl bg-slate-50 p-3 sm:p-6">
    <header className="rounded-3xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary p-6 text-white sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Talent workspace</p>
      <h1 className="mt-3 text-3xl font-semibold">Interviews</h1>
      <p className="mt-3 text-sm text-slate-300">Manage interview dates, outcomes, and feedback by round.</p>
      <div className="mt-5 flex flex-wrap items-center gap-5 text-sm"><span>{count} interviews · {groups.length} rounds</span><Link to="/shortlisted" className="underline">Shortlisted candidates</Link></div>
    </header>
    <div className="flex flex-wrap gap-3">
      <label className="flex min-w-52 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Search size={18} className="text-slate-400" /><input type="search" aria-label="Search interviews" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, job or round" className="w-full py-3 text-sm outline-none" /></label>
      <button onClick={refresh} disabled={interviews.isFetching} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-50"><RefreshCw size={16} className={interviews.isFetching ? "animate-spin" : ""} />Refresh</button>
    </div>
    {(candidates.isError || statuses.isError) && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Candidate eligibility could not be loaded. Scheduling is unavailable until you <button onClick={refresh} className="underline">retry</button>.</p>}
    {interviews.isPending ? <p role="status" className="p-10 text-center text-slate-500">Loading interviews...</p> : interviews.isError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{interviews.error.message} <button onClick={refresh} className="underline">Retry</button></p> : !visible.length ? <div className="rounded-2xl bg-white p-12 text-center text-slate-500"><CalendarClock size={32} className="mx-auto mb-3 text-slate-300" />{search ? "No matching interviews." : "No interviews yet."}</div> : <div className="grid items-start gap-6 xl:grid-cols-2">
      {visible.map((group) => <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-indigo-50/60 p-5"><h2 className="break-words font-semibold text-slate-900">{group.name}</h2><span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">{group.records.length}</span></header>
        <div className="divide-y divide-slate-100">{group.records.map((record) => {
          const candidate = candidateMap.get(candidateId(record));
          const rejected = candidate && clean(workflowValue(candidate, "status", statuses.data)).toLowerCase() === "rejected";
          const outcome = clean(record.interview_status);
          const completed = hasOutcome(record);
          return <article key={record.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{record.name || "Unnamed candidate"}</h3><p className="mt-1 break-all text-sm text-slate-500">{record.email || "No email"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${/^pass(ed)?$/i.test(outcome) ? "bg-emerald-50 text-emerald-700" : /^fail(ed)?$/i.test(outcome) ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{outcome || "Pending"}</span></div>
            <div className="space-y-1 text-xs text-slate-500"><p className="flex items-center gap-2"><CalendarClock size={14} />{displayInterviewTime(record)}</p><p className="break-all">Job: {clean(record.job_id) || "Not assigned"}</p></div>
            {record.interview_feedback && <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><span className="font-medium">Feedback: </span>{record.interview_feedback}</p>}
            <div className="flex flex-wrap gap-2">
              {!completed && !rejected && <button disabled={!record.id || !candidates.isSuccess || !statuses.isSuccess} onClick={() => setSelected({ record, action: "schedule" })} className={`${actionClass} border-indigo-200 text-indigo-700 hover:bg-indigo-50`}>{clean(record.interview_datetime) ? "Reschedule interview" : "Schedule interview"}</button>}
              {["Pass", "Fail"].map((action) => <button key={action} disabled={!record.id} onClick={() => setSelected({ record, action })} className={`${actionClass} ${action === "Pass" ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-red-200 text-red-700 hover:bg-red-50"}`}>{action}</button>)}
            </div>
            {rejected && <p className="text-xs text-red-700">Candidate rejected; scheduling unavailable.</p>}
          </article>;
        })}</div>
      </section>)}
    </div>}
    {selected && <InterviewActionDialog {...selected} statusOptions={statuses.data} onClose={() => setSelected(null)} />}
  </main>;
}
