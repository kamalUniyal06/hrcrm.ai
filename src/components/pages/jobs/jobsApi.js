import { http } from "../../../services/api";

export const candidateRelationship = "hrc_candidates_hrc_job_applications_1hrc_candidates_ida";

async function fetchAll(body) {
  const records = [];
  let dropdowns = {};
  let page = 1;
  let totalPages = 1;
  do {
    const response = await http({ method: "POST", body: { ...body, page, per_page: 20 } });
    if (response?.success !== true || !Array.isArray(response.records)) {
      throw new Error(response?.message || "Could not load job records. Please retry.");
    }
    records.push(...response.records.filter(record => String(record.deleted) !== "1"));
    dropdowns = { ...dropdowns, ...response.dropdown_lists };
    totalPages = Number(response.total_pages) || Math.ceil(Number(response.total) / (Number(response.per_page) || 20)) || 1;
    page += 1;
  } while (page <= totalPages);
  return { records, dropdowns };
}

export const fetchJobPostings = () => fetchAll({ action: "fetch", module: "hrc_job_postings" });

export function fetchJobApplications(candidateId) {
  if (!candidateId) throw new Error("Save your candidate profile before applying.");
  return fetchAll({ action: "fetch_related", module: "hrc_candidates", id: candidateId, related_module: "hrc_job_applications" });
}

export async function applyToJob(candidate, jobId) {
  const email = candidate?.email1?.trim();
  if (!candidate?.id || !email || !jobId) throw new Error("A saved candidate profile and job ID are required.");
  // Recheck just before saving, including applications made in another tab.
  const existing = await fetchJobApplications(candidate.id);
  if (existing.records.some(record => String(record.jobid).trim() === jobId)) return existing.records;
  const data = { name: email, jobid: jobId, status: "applied", [candidateRelationship]: candidate.id };
  const response = await http({ method: "POST", body: { action: "create", module: "hrc_job_applications", data } });
  if (response?.success !== true) throw new Error(response?.message || "Could not submit your application. Please retry.");
  return [...existing.records, { ...data, id: response.id || response.record?.id || response.data?.id || `application-${jobId}` }];
}
