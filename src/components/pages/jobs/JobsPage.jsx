import { createElement, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { NavLink, Link } from "react-router-dom";
import { BriefcaseBusiness, FileCheck2, Loader2, RefreshCw, Search } from "lucide-react";
import { findCandidate } from "../profile/candidateApi";
import { applyToJob, fetchJobApplications, fetchJobPostings } from "./jobsApi";
import JobCard from "./JobCard";
import { plainText, titleOf, valueOf } from "./jobFormatting";

export default function JobsPage({ applicationsOnly = false }) {
  const email = useSelector(state => state.user.user?.email)?.trim() || "";
  return <CandidateJobs key={email} email={email} applicationsOnly={applicationsOnly} />;
}

function CandidateJobs({ email, applicationsOnly }) {
  const [candidate, setCandidate] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [dropdowns, setDropdowns] = useState({});
  const [jobDropdowns, setJobDropdowns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const locked = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    let active = true;
    alive.current = true;
    setLoading(true);
    setError("");
    async function load() {
      const [postings, profile] = await Promise.all([fetchJobPostings(), findCandidate(email)]);
      const related = profile ? await fetchJobApplications(profile.id) : { records: [], dropdowns: {} };
      if (!active) return;
      setJobs(postings.records);
      setJobDropdowns(postings.dropdowns);
      setCandidate(profile);
      setApplications(related.records);
      setDropdowns(related.dropdowns);
    }
    load().catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; alive.current = false; };
  }, [email, retry]);

  async function apply(jobId) {
    if (locked.current) return;
    locked.current = true;
    setPending(jobId);
    setError("");
    setNotice("");
    try {
      const records = await applyToJob(candidate, jobId);
      if (alive.current) { setApplications(records); setNotice("Your application is saved. Follow its status in My applications."); }
    } catch (err) {
      if (alive.current) setError(err.message);
    } finally {
      locked.current = false;
      if (alive.current) setPending("");
    }
  }

  const appliedIds = new Set(applications.map(record => String(record.jobid).trim()));
  const jobsById = new Map(jobs.map(job => [String(job.id).trim(), job]));
  const cards = applicationsOnly ? applications.map(application => ({ application, job: jobsById.get(String(application.jobid).trim()) })) : jobs.map(job => ({ job }));
  const visibleCards = cards.filter(({ job, application }) => [job ? titleOf(job) : "Job posting unavailable", valueOf(job, ["company_name", "company"]), valueOf(job, ["job_location", "location", "city"]), valueOf(job, ["required_skills", "skills"]), application?.jobid].some(value => plainText(value).toLowerCase().includes(search.trim().toLowerCase())));

  return <main className="min-h-full bg-slate-50 p-3 sm:p-6"><div className="mx-auto w-full space-y-6">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary p-6 text-white sm:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-32 h-96 w-96 rounded-full border-[50px] border-indigo-400/10" />
      <div className="relative flex flex-wrap items-end justify-between gap-6"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Your career, moving forward</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{applicationsOnly ? "Every application. One place." : "Make your next move."}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">{applicationsOnly ? "Stay close to your next opportunity. Follow each application as it progresses." : "Find a role that fits your skills. Explore the details and take the next step with your candidate profile."}</p></div>
      {!loading && !error && <div className="flex gap-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-4"><div><p className="text-2xl font-semibold">{jobs.length}</p><p className="mt-1 text-xs text-slate-300">Job postings</p></div><div className="border-l border-white/15 pl-6"><p className="text-2xl font-semibold">{applications.length}</p><p className="mt-1 text-xs text-slate-300">Applications sent</p></div></div>}</div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-4"><nav aria-label="Jobs" className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">{[["/job-posting", "Job postings", BriefcaseBusiness], ["/job-application", "My applications", FileCheck2]].map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${isActive ? "bg-gradient-to-r from-search-primary to-search-secondary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>{createElement(icon, { size: 16 })}{label}</NavLink>)}</nav><label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 focus-within:border-indigo-400 sm:w-80"><Search size={17} className="shrink-0 text-slate-400" /><input type="search" aria-label="Search jobs by title, skill or location" placeholder="Search title, skill or location" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" /></label></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button disabled={!!pending} onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Reload</button></div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
    {loading ? <p role="status" className="flex items-center gap-2 p-8 text-slate-500"><Loader2 className="animate-spin" size={18} />Loading jobs and applications...</p> : <>
      {!candidate && !error && <p className="rounded-xl border border-indigo-100 bg-white p-4 text-sm text-slate-600"><Link to="/profile" className="font-semibold text-indigo-600 underline">Complete your profile</Link> to apply for jobs.</p>}
      <div className="flex items-center justify-between"><p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{visibleCards.length}</span> {applicationsOnly ? "applications" : "opportunities to explore"}</p><button disabled={!!pending} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 disabled:opacity-50" onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} />Refresh</button></div>
      {!visibleCards.length && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BriefcaseBusiness size={28} className="mx-auto text-indigo-400" /><p className="mt-4 text-slate-600">{search.trim() ? "No matches yet. Try another title, skill or location." : applicationsOnly ? "You haven't applied for any jobs yet." : "No job postings are available yet."}</p></div>}
      <div className="grid items-start gap-6 xl:grid-cols-2">{visibleCards.map(({ job, application }, index) => <JobCard key={application?.id || job?.id || index} job={job} application={application} applied={job && appliedIds.has(String(job.id).trim())} applicationsOnly={applicationsOnly} dropdowns={dropdowns} jobDropdowns={jobDropdowns} pending={pending} canApply={!!candidate && !error} onApply={apply} />)}</div>
    </>}
  </div></main>;
}
