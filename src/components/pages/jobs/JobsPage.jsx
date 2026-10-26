import { useState } from "react";
import { useSelector } from "react-redux";
import { NavLink, Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Archive,
  BriefcaseBusiness,
  CircleCheck,
  CirclePause,
  CalendarClock,
  Eye,
  FileCheck2,
  Layers,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "../profile/onboardingStyles";
import { fetchCandidateRelated } from "../profile/candidateApi";
import { candidateRelatedQueryKey } from "../profile/candidateRelated.js";
import { relatedEntryView } from "../profile/profileDisplay";
import { useCandidateProfile } from "../../../queries/candidate.queries";
import { jobsKeys, useApplyToJob, useCandidateApplications, useJobPostings, useJobStatusCounts, useUpdateJobStatus } from "../../../queries/jobs.queries";
import { CandidatePageHeader, CandidateStats, EmptyState } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { applicationStage, applicationSteps } from "../candidate/candidateStatus";
import JobList, { JobListSkeleton } from "./JobList";
import JobDetailsDrawer from "./JobDetailsDrawer";
import CreateJobDialog from "./CreateJobDialog";
import { fieldLabel, plainText, readable, titleOf, valueOf } from "./jobFormatting";
import { jobStatusOf } from "./jobStatus.js";

const tabLink = "inline-flex min-h-11 items-center gap-2 border-b-2 px-0.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none";
// Application filters, each one also a card in the summary strip.
const applicationFilters = {
  all: { label: "All applications", icon: Layers, tone: "primary", test: () => true },
  active: { label: "Active", icon: FileCheck2, tone: "success", test: (stage) => !stage.closed },
  interviews: { label: "In interviews", icon: CalendarClock, tone: "info", test: (stage) => !stage.closed && stage.index >= 2 },
  closed: { label: "Closed", icon: Archive, tone: "neutral", test: (stage) => stage.closed },
};

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

function CandidateJobs({ applicationsOnly, isAdmin }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  // Admins filter the postings by the Active / Inactive status bars.
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState(null);

  // All three lists come from the shared query cache, so moving between the
  // dashboard, Jobs and My applications does not refetch what is already loaded.
  const profile = useCandidateProfile();
  const candidate = isAdmin ? null : profile.data || null;
  const postings = useJobPostings();
  const statusCounts = useJobStatusCounts({ enabled: isAdmin });
  const statusMutation = useUpdateJobStatus();
  const applicationsQuery = useCandidateApplications(candidate?.id, { enabled: !isAdmin });
  const jobs = postings.data?.records || [];
  const jobDropdowns = postings.data?.dropdowns || {};
  const applications = applicationsQuery.data?.records || [];
  const dropdowns = applicationsQuery.data?.dropdowns || {};
  const loading = postings.isPending || (!isAdmin && (profile.isPending || (Boolean(candidate?.id) && applicationsQuery.isPending)));
  const error = postings.error?.message || (!isAdmin && (profile.error?.message || applicationsQuery.error?.message)) || "";
  const refreshing = postings.isFetching || profile.isFetching || applicationsQuery.isFetching;
  const refresh = () => {
    void postings.refetch();
    if (isAdmin) void statusCounts.refetch();
    if (!isAdmin) {
      void profile.refetch();
      if (candidate?.id) void applicationsQuery.refetch();
    }
  };

  const applyMutation = useApplyToJob(candidate);
  const pending = applyMutation.isPending ? applyMutation.variables : "";
  const applyError = applyMutation.error?.message || "";

  // Shares the dashboard's cache, so the drawer can tick off skills already on the profile.
  const skills = useQuery({
    queryKey: candidateRelatedQueryKey(candidate?.id, "skills"),
    queryFn: () => fetchCandidateRelated(candidate.id, "skills"),
    enabled: Boolean(candidate?.id) && !isAdmin && !applicationsOnly,
    staleTime: 60000,
  });
  const profileSkills = skills.data
    ? skills.data.map((item) => relatedEntryView("skills", item).title).filter(Boolean)
    : undefined;

  function apply(jobId) {
    if (applyMutation.isPending || isAdmin) return;
    setNotice("");
    applyMutation.mutate(jobId, {
      onSuccess: () => toast.success("Your application is saved. Follow its status in My applications."),
      onError: (err) => toast.error(err.message),
    });
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
    : jobs.filter((job) => !statusFilter || jobStatusOf(job) === statusFilter).map((job) => ({ job }));
  const query = search.trim().toLowerCase();
  const rows = cards
    .filter(({ application }) => !applicationsOnly || applicationFilters[filter].test(applicationStage(application.status)))
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
      const postingStatus = isAdmin && fieldLabel(job, ["status"], jobDropdowns, true);
      const stage = application ? applicationStage(statusValue) : null;
      return {
        key: String(application?.id || job?.id || index),
        job,
        application,
        applied,
        stage,
        steps: application ? applicationSteps(statusValue) : null,
        status: application
          ? {
              label: statusValue ? dropdowns.status?.[statusValue] || readable(statusValue) : "Applied",
              tone: stage.tone,
            }
          : applied
            ? { label: "Applied", tone: "progress" }
            : postingStatus
              ? { label: postingStatus, tone: "neutral" }
              : null,
      };
    });
  const selectedIndex = rows.findIndex((row) => row.key === selectedKey);
  const selected = rows[selectedIndex];
  const openRow = (key) => {
    applyMutation.reset();
    statusMutation.reset();
    setSelectedKey(key);
  };
  const candidateName = candidate
    ? [candidate.first_name, candidate.last_name].filter(Boolean).join(" ").trim() || candidate.full_name || candidate.name || ""
    : "";
  const stages = applications.map((record) => applicationStage(record.status));
  const countOf = (key) => stages.filter(applicationFilters[key].test).length;
  const activeCount = countOf("active");
  const interviewing = countOf("interviews");
  const pickFilter = (key) => {
    setFilter((current) => (current === key ? "all" : key));
    setSelectedKey(null);
  };
  const pickStatus = (status) => {
    setStatusFilter((current) => (current === status ? "" : status));
    setSelectedKey(null);
  };
  const countText = (status) => (statusCounts.isPending ? "…" : statusCounts.isError ? "—" : statusCounts.data[status]);
  const stats = isAdmin
    ? [
        { label: "Active jobs", value: countText("active"), hint: "open to candidates", icon: CircleCheck, tone: "success", active: statusFilter === "active", onClick: () => pickStatus("active") },
        { label: "Inactive jobs", value: countText("inactive"), hint: "paused", icon: CirclePause, tone: "neutral", active: statusFilter === "inactive", onClick: () => pickStatus("inactive") },
        { label: "Matching your search", value: rows.length, icon: Search, tone: "info" },
      ]
    : applicationsOnly
      ? Object.entries(applicationFilters).map(([key, entry]) => ({
          label: entry.label,
          value: countOf(key),
          icon: entry.icon,
          tone: entry.tone,
          active: filter === key && key !== "all",
          onClick: () => pickFilter(key),
        }))
      : [
          { label: "Open roles", value: jobs.length, icon: BriefcaseBusiness, tone: "primary", onClick: () => setSearch("") },
          { label: "Your applications", value: applications.length, hint: applications.length ? `${activeCount} active` : "", icon: FileCheck2, tone: "success", to: "/job-application" },
          { label: "In interviews", value: interviewing, icon: CalendarClock, tone: "info", to: "/interviews" },
          candidate
            ? { label: "Profile", value: "Ready", hint: "to apply", icon: UserRound, tone: "primary", to: "/profile" }
            : { label: "Profile", value: "Not ready", hint: "complete it to apply", icon: UserRound, tone: "attention", to: "/profile" },
        ];
  const filterLabel = applicationsOnly && filter !== "all" ? applicationFilters[filter].label.toLowerCase() : "";
  const countLabel = isAdmin
    ? `${rows.length} of ${jobs.length} job postings`
    : applicationsOnly
      ? `Showing ${rows.length} of ${applications.length} applications${filterLabel ? ` · ${filterLabel}` : ""}`
      : `Showing ${rows.length} of ${jobs.length} open roles`;

  return (
    <div className={candidateStyles.page}>
      <CandidatePageHeader
        icon={applicationsOnly ? FileCheck2 : BriefcaseBusiness}
        eyebrow={isAdmin ? "Recruitment" : "Career space"}
        title={isAdmin ? "Job postings" : applicationsOnly ? "My applications" : "Jobs"}
        description={
          isAdmin
            ? "Create job postings and share the roles your team is hiring for."
            : applicationsOnly
              ? "Follow every application from submission to decision."
              : "Find a role that fits your skills, then apply with your saved profile."
        }
      >
        {isAdmin ? (
          <button type="button" onClick={() => setCreating(true)} className={cn(styles.primary, "w-full sm:w-auto")}>
            <Plus size={17} aria-hidden="true" />
            New posting
          </button>
        ) : applicationsOnly ? (
          <Link to="/job-posting" className={cn(styles.secondary, "w-full sm:w-auto")}>
            <Search size={16} aria-hidden="true" />
            Browse jobs
          </Link>
        ) : (
          <Link to="/profile" className={cn(styles.secondary, "w-full sm:w-auto")}>
            <Eye size={16} aria-hidden="true" />
            Review my profile
          </Link>
        )}
      </CandidatePageHeader>

      {!loading && !error && <div data-tour={isAdmin ? "job-status-bars" : undefined}><CandidateStats items={stats} label={applicationsOnly ? "Application summary" : "Jobs summary"} /></div>}

      <div className="space-y-4">
        {/* Candidates switch between Jobs and My applications here; admins only have the one page. */}
        {!isAdmin && (
          <nav aria-label="Jobs" className="flex flex-wrap gap-x-6 border-b border-border">
            {[
              ["/job-posting", "Job postings", jobs.length],
              ["/job-application", "My applications", applications.length],
            ]
              .map(([to, label, count]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(tabLink, "-mb-px", isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {label}
                      {!loading && !error && (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
          </nav>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-card px-3.5 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 sm:w-96 motion-reduce:transition-none">
            <Search size={17} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              aria-label={applicationsOnly ? "Search your applications" : "Search jobs by title, skill or location"}
              placeholder={applicationsOnly ? "Search your applications" : "Search title, skill or location"}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          {filterLabel && (
            <button type="button" onClick={() => pickFilter("all")} className={cn(candidateStyles.ghost, "mr-auto")}>
              <X size={14} aria-hidden="true" />
              Clear filter: {filterLabel}
            </button>
          )}
          <button
            type="button"
            disabled={!!pending || refreshing}
            aria-label="Refresh"
            title="Refresh"
            className={cn(candidateStyles.iconButton, "border border-border bg-card")}
            onClick={refresh}
          >
            <RefreshCw size={16} className={cn(refreshing && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
            <button
              type="button"
              disabled={!!pending || refreshing}
              onClick={refresh}
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
              <div className={cn(candidateStyles.card, "flex flex-wrap items-center gap-3 p-4")}>
                <span className={candidateStyles.tile}>
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
            {!rows.length && !error ? (
              <EmptyState
                icon={applicationsOnly ? FileCheck2 : BriefcaseBusiness}
                title={
                  query
                    ? `No matches for “${search.trim()}”`
                    : filterLabel
                      ? `No ${filterLabel === "in interviews" ? "applications in interviews" : `${filterLabel} applications`}`
                      : applicationsOnly
                        ? "No applications yet"
                        : "No job postings yet"
                }
                description={
                  query
                    ? "Try another title, skill or location, or clear the search."
                    : filterLabel
                      ? "Clear the filter to see every application."
                      : applicationsOnly
                        ? "When you apply for a role, you can follow its progress here."
                        : "New roles will appear here as soon as they're posted."
                }
              >
                {query ? (
                  <button type="button" onClick={() => setSearch("")} className={styles.secondary}>Clear search</button>
                ) : filterLabel ? (
                  <button type="button" onClick={() => pickFilter("all")} className={styles.secondary}>Clear filter</button>
                ) : applicationsOnly ? (
                  <Link to="/job-posting" className={styles.primary}>Browse job postings</Link>
                ) : null}
              </EmptyState>
            ) : (
              rows.length > 0 && (
                <JobList
                  rows={rows}
                  selectedKey={selectedKey}
                  applicationsOnly={applicationsOnly}
                  jobDropdowns={jobDropdowns}
                  onOpen={openRow}
                  footer={countLabel}
                />
              )
            )}
          </>
        )}
      </div>

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
          candidateName={candidateName}
          profileSkills={profileSkills}
          pending={pending}
          applyError={applyError}
          onApply={apply}
          statusPending={statusMutation.isPending}
          statusError={statusMutation.error?.message || ""}
          onToggleStatus={(job, status) => {
            if (!isAdmin) return;
            statusMutation.mutate({ id: job.id, status }, {
              onSuccess: () => setNotice(`Job posting marked ${status}.`),
            });
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
            void queryClient.invalidateQueries({ queryKey: jobsKeys.postings });
          }}
        />
      )}
    </div>
  );
}
