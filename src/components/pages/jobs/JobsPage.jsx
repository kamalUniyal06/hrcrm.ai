import { createElement, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { NavLink, Link, Navigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  BriefcaseBusiness,
  FileCheck2,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "../profile/onboardingStyles";
import { findCandidate } from "../profile/candidateApi";
import { applyToJob, fetchJobApplications, fetchJobPostings } from "./jobsApi";
import JobList, { JobListSkeleton } from "./JobList";
import JobDetailsDrawer from "./JobDetailsDrawer";
import CreateJobDialog from "./CreateJobDialog";
import DeleteJobDialog from "./DeleteJobDialog";
import { applicationTone, fieldLabel, plainText, readable, titleOf, valueOf } from "./jobFormatting";

export default function JobsPage({ applicationsOnly = false }) {
  const email = useSelector((state) => state.user.user?.email)?.trim() || "";
  const isAdmin = useSelector(
    (state) => state.user.userInfo?.status === "admin",
  );
  if (isAdmin && applicationsOnly)
    return <Navigate to="/job-posting" replace />;
  return (
    <CandidateJobs
      key={`${email}-${isAdmin}`}
      email={email}
      isAdmin={isAdmin}
      applicationsOnly={applicationsOnly}
    />
  );
}

function CandidateJobs({ email, applicationsOnly, isAdmin }) {
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [dropdowns, setDropdowns] = useState({});
  const [jobDropdowns, setJobDropdowns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyError, setApplyError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const locked = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    let active = true;
    alive.current = true;
    setLoading(true);
    setError("");
    async function load() {
      const [postings, profile] = await Promise.all([
        fetchJobPostings(),
        isAdmin ? Promise.resolve(null) : findCandidate(email),
      ]);
      const related = profile
        ? await fetchJobApplications(profile.id)
        : { records: [], dropdowns: {} };
      if (!active) return;
      setJobs(postings.records);
      setJobDropdowns(postings.dropdowns);
      setCandidate(profile);
      setApplications(related.records);
      setDropdowns(related.dropdowns);
    }
    load()
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      alive.current = false;
    };
  }, [email, retry, isAdmin]);

  async function apply(jobId) {
    if (locked.current || isAdmin) return;
    locked.current = true;
    setPending(jobId);
    setApplyError("");
    setNotice("");
    try {
      const records = await applyToJob(candidate, jobId);
      if (alive.current) {
        setApplications(records);
        toast.success(
          "Your application is saved. Follow its status in My applications.",
        );
      }
    } catch (err) {
      if (alive.current) {
        setApplyError(err.message);
        toast.error(err.message);
      }
    } finally {
      locked.current = false;
      if (alive.current) setPending("");
    }
  }

  const appliedIds = new Set(
    applications.map((record) => String(record.jobid).trim()),
  );
  const jobsById = new Map(jobs.map((job) => [String(job.id).trim(), job]));
  const cards = applicationsOnly
    ? applications.map((application) => ({
        application,
        job: jobsById.get(String(application.jobid).trim()),
      }))
    : jobs.map((job) => ({ job }));
  const query = search.trim().toLowerCase();
  const rows = cards
    .filter(({ job, application }) =>
      [
        job ? titleOf(job) : "Job posting unavailable",
        valueOf(job, ["job_code", "department", "company_name", "company"]),
        valueOf(job, ["job_location", "location", "city", "country"]),
        valueOf(job, ["required_skills", "skills"]),
        valueOf(job, ["preferred_skills"]),
        application?.jobid,
      ].some((value) => plainText(value).toLowerCase().includes(query)),
    )
    .map(({ job, application }, index) => {
      const applied = job && appliedIds.has(String(job.id).trim());
      const statusValue = application?.status?.trim();
      const postingStatus = isAdmin && fieldLabel(job, ["job_status"], jobDropdowns, true);
      return {
        key: String(application?.id || job?.id || index),
        job,
        application,
        applied,
        status: application
          ? {
              label: statusValue ? dropdowns.status?.[statusValue] || readable(statusValue) : "Applied",
              tone: applicationTone(statusValue),
            }
          : applied
            ? { label: "Applied", tone: "positive" }
            : postingStatus
              ? { label: postingStatus, tone: "neutral" }
              : null,
      };
    });
  const selectedIndex = rows.findIndex((row) => row.key === selectedKey);
  const selected = rows[selectedIndex];
  const openRow = (key) => {
    setApplyError("");
    setSelectedKey(key);
  };

  return (
    <main className="min-h-full bg-background p-3 text-foreground sm:p-6">
      <div className="mx-auto w-full space-y-6">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary px-6 py-7 text-white sm:px-9 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-32 size-96 rounded-full border-[50px] border-white/5"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-highlight/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
                {isAdmin
                  ? "Recruitment workspace"
                  : "Your career, moving forward"}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {isAdmin
                  ? "Build your next great team."
                  : applicationsOnly
                    ? "Every application. One place."
                    : "Make your next move."}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/70">
                {isAdmin
                  ? "Create job postings and share the roles your team is hiring for."
                  : applicationsOnly
                    ? "Stay close to your next opportunity. Follow each application as it progresses."
                    : "Find a role that fits your skills. Open any role for the full details, then apply with your candidate profile."}
              </p>
            </div>
            {!loading && !error && (
              <dl className="flex gap-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
                <div>
                  <dd className="text-2xl font-semibold tabular-nums">{jobs.length}</dd>
                  <dt className="mt-1 text-xs text-white/70">Job postings</dt>
                </div>
                {!isAdmin && (
                  <div className="border-l border-white/15 pl-6">
                    <dd className="text-2xl font-semibold tabular-nums">
                      {applications.length}
                    </dd>
                    <dt className="mt-1 text-xs text-white/70">
                      Applications sent
                    </dt>
                  </div>
                )}
              </dl>
            )}
          </div>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Jobs"
            className="flex gap-1 rounded-xl border border-border bg-card p-1 shadow-sm"
          >
            {[
              ["/job-posting", "Job postings", BriefcaseBusiness],
              ["/job-application", "My applications", FileCheck2],
            ]
              .filter(([to]) => !isAdmin || to !== "/job-application")
              .map(([to, label, icon]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors sm:px-4 motion-reduce:transition-none",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )
                  }
                >
                  {createElement(icon, { size: 16, "aria-hidden": true })}
                  {label}
                </NavLink>
              ))}
          </nav>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3.5 shadow-sm transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 sm:w-80 sm:flex-none">
              <Search size={17} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search jobs by title, skill or location"
                placeholder="Search title, skill or location"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={cn(styles.primary, "shrink-0 rounded-xl px-4")}
              >
                <Plus size={17} aria-hidden="true" />
                <span className="hidden sm:inline">New posting</span>
                <span className="sr-only sm:hidden">New job posting</span>
              </button>
            )}
          </div>
        </div>
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
            <button
              type="button"
              disabled={!!pending}
              onClick={() => setRetry((value) => value + 1)}
              className="font-semibold underline underline-offset-4"
            >
              Reload
            </button>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary"
          >
            {notice}
          </p>
        )}
        {loading ? (
          <JobListSkeleton />
        ) : (
          <>
            {!isAdmin && !candidate && !error && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <UserRound size={18} aria-hidden="true" />
                </span>
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  <span className="block font-semibold text-foreground">Your profile isn't ready yet</span>
                  Complete your candidate profile to apply for jobs.
                </p>
                <Link to="/profile" className={cn(styles.secondary, "w-full sm:w-auto")}>
                  Complete profile
                </Link>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <span className="font-semibold text-foreground">
                  {rows.length}
                </span>{" "}
                {isAdmin
                  ? "job postings"
                  : applicationsOnly
                    ? "applications"
                    : "opportunities to explore"}
              </p>
              <button
                type="button"
                disabled={!!pending}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-accent disabled:opacity-50"
                onClick={() => setRetry((value) => value + 1)}
              >
                <RefreshCw size={14} aria-hidden="true" />
                Refresh
              </button>
            </div>
            {!rows.length && !error ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <span className={cn(styles.icon, "mx-auto")}>
                  <BriefcaseBusiness size={23} aria-hidden="true" />
                </span>
                <p className="mt-4 font-semibold">
                  {query
                    ? "No matches yet"
                    : applicationsOnly
                      ? "No applications yet"
                      : "No job postings yet"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  {query
                    ? "Try another title, skill or location."
                    : applicationsOnly
                      ? "When you apply for a role, you can follow its progress here."
                      : "New roles will appear here as soon as they're posted."}
                </p>
                {applicationsOnly && !query && (
                  <Link to="/job-posting" className={cn(styles.primary, "mt-5")}>
                    Browse job postings
                  </Link>
                )}
              </div>
            ) : (
              rows.length > 0 && (
                <JobList
                  rows={rows}
                  selectedKey={selectedKey}
                  applicationsOnly={applicationsOnly}
                  jobDropdowns={jobDropdowns}
                  onOpen={openRow}
                />
              )
            )}
          </>
        )}
        {selected && (
          <JobDetailsDrawer
            row={selected}
            index={selectedIndex}
            total={rows.length}
            onNavigate={(step) => openRow(rows[selectedIndex + step]?.key ?? selectedKey)}
            onClose={() => setSelectedKey(null)}
            applicationsOnly={applicationsOnly}
            isAdmin={isAdmin}
            jobDropdowns={jobDropdowns}
            applied={selected.applied}
            canApply={!isAdmin && !!candidate && !error}
            hasProfile={!!candidate}
            pending={pending}
            applyError={applyError}
            onApply={apply}
            onDelete={(job) => {
              if (!isAdmin) return;
              setSelectedKey(null);
              setDeleting(job);
            }}
          />
        )}
        {isAdmin && deleting && (
          <DeleteJobDialog
            job={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={id => {
              setJobs(previous => previous.filter(job => job.id !== id));
              setDeleting(null);
              setNotice("Job posting deleted successfully.");
            }}
          />
        )}
        {isAdmin && creating && (
          <CreateJobDialog
            dropdowns={jobDropdowns}
            jobs={jobs}
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              setNotice("Job posting created successfully.");
              setRetry((value) => value + 1);
            }}
          />
        )}
      </div>
    </main>
  );
}
