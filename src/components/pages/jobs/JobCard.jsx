import { createElement, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3, Loader2, MapPin, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { fieldLabel, plainText, readable, requirementItems, titleOf, valueOf } from "./jobFormatting";

export default function JobCard({ job, application, applied, applicationsOnly, dropdowns, jobDropdowns, pending, canApply, onApply }) {
  const [expanded, setExpanded] = useState(false);
  const title = job ? titleOf(job) : "Job posting unavailable";
  const company = fieldLabel(job, ["company_name", "company", "hrc_clients_hrc_job_postings_1_name"], jobDropdowns);
  const employment = fieldLabel(job, ["employment_type", "job_type"], jobDropdowns, true);
  const workMode = fieldLabel(job, ["work_mode", "workplace_type"], jobDropdowns, true);
  const description = plainText(job?.description);
  const requirements = requirementItems(valueOf(job, ["required_skills", "skills"]));
  const status = application?.status?.trim();
  const statusColor = status === "accepted" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : status?.startsWith("rejected") ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-indigo-50 text-indigo-700 ring-indigo-200";
  const facts = [
    { label: "Location", icon: MapPin, keys: ["job_location", "location", "city"] },
    { label: "Experience", icon: Clock3, keys: ["experience_required", "experience", "experience_level"] },
    { label: "Salary", icon: Wallet, keys: ["salary_range", "salary", "ctc"] },
    { label: "Apply by", icon: CalendarDays, keys: ["application_deadline", "closing_date", "last_date"] },
  ].map(fact => ({ ...fact, value: fieldLabel(job, fact.keys, jobDropdowns) })).filter(fact => fact.value);
  const expandable = requirements.length > 3 || requirements.some(item => item.length > 160) || description.length > 200;
  const submitting = pending && pending === String(job?.id).trim();

  return <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/40">
    <div className={`h-1 ${applied || application ? "bg-emerald-500" : "bg-indigo-500"}`} />
    <div className="flex-1 p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><BriefcaseBusiness size={24} strokeWidth={1.7} /></div>
        <div className="min-w-0 flex-1"><h2 className="break-words text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
          {company && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><Building2 size={14} className="shrink-0" />{company}</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[employment, workMode].filter(Boolean).map((label, index) => <span key={`${label}-${index}`} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{label}</span>)}
        {(applied || application) && <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${application ? statusColor : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}><CheckCircle2 size={13} />{application ? dropdowns.status?.[status] || readable(status) : "Application sent"}</span>}
      </div>
      {facts.length > 0 && <dl className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{facts.map(({ label, icon, value }) => <div key={label} className="flex min-w-0 gap-2.5">{createElement(icon, { size: 17, className: "mt-0.5 shrink-0 text-slate-500" })}<div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</dd></div></div>)}</dl>}
      {description && <section className="mt-6"><h3 className="text-sm font-semibold text-slate-900">About the role</h3><p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-slate-600">{expanded || description.length <= 200 ? description : `${description.slice(0, 200).replace(/\s+\S*$/, "")}…`}</p></section>}
      {requirements.length > 0 && <section className="mt-5"><h3 className="text-sm font-semibold text-slate-900">What you’ll bring</h3><ul className="mt-3 space-y-2.5">{(expanded ? requirements : requirements.slice(0, 3)).map((item, index) => <li key={index} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600"><Check size={15} className="mt-1 shrink-0 text-indigo-500" /><span className="min-w-0 break-words">{expanded || item.length <= 160 ? item : `${item.slice(0, 160).replace(/\s+\S*$/, "")}…`}</span></li>)}</ul></section>}
      {expandable && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="mt-4 inline-flex items-center gap-1.5 rounded-md py-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500">{expanded ? "Show less" : "View full details"}{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>}
      {!job && <p className="mt-5 text-sm leading-6 text-slate-600">This posting is no longer available. You can still follow your application status here.</p>}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
      {applicationsOnly ? <div className="space-y-1"><p className="flex items-center gap-2 text-xs font-medium text-slate-600"><CalendarDays size={14} />{application.date_entered ? `Applied ${application.date_entered_uni_format || application.date_entered}` : "Application submitted"}</p><p className="break-all text-[11px] text-slate-500">Reference: {application.jobid}</p></div> : <>
        <div className="text-xs leading-5 text-slate-500">{applied ? <Link to="/job-application" className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline">Track application<ArrowUpRight size={14} /></Link> : <>Your next chapter<span className="block font-medium text-slate-700">Apply with your profile</span></>}</div>
        <button type="button" disabled={applied || !!pending || !canApply || !job?.id} onClick={() => onApply(String(job.id).trim())} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed ${applied ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-gradient-to-r from-search-primary to-search-secondary text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"}`}>{applied ? <><CheckCircle2 size={16} />Already applied</> : submitting ? <><Loader2 size={16} className="animate-spin" />Applying…</> : <>Apply now<ArrowUpRight size={16} /></>}</button>
      </>}
    </footer>
  </article>;
}
