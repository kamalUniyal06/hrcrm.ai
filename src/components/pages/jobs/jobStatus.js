// A job posting is either active or inactive (`status`); postings are never deleted.
export const JOB_STATUSES = ["active", "inactive"];

export const jobStatusOf = (job) => (String(job?.status ?? "").trim().toLowerCase() === "inactive" ? "inactive" : "active");

// SmartGateway get_stats queries counting postings per status, across all owners.
export const jobStatusStatsQueries = () =>
  JOB_STATUSES.map((status) => ({ key: status, module: "hrc_job_postings", ignore_email: true, filters: { status } }));

// { active, inactive } from a get_stats response; throws if a count is missing.
export function readJobStatusCounts(response) {
  if (response?.success !== true) throw new Error(response?.message || response?.error || "Could not load job posting totals.");
  return Object.fromEntries(JOB_STATUSES.map((status) => {
    const entry = response.stats?.[status];
    const value = Number(entry?.count);
    if (!entry || entry.error || !Number.isFinite(value)) throw new Error(entry?.error || `Job posting total "${status}" is missing.`);
    return [status, value];
  }));
}
