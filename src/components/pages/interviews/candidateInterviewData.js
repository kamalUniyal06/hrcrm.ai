import { candidateId, clean, interviewDate, roundName, uniqueInterviews } from "./interviewUtils.js";

function meetingUrl(record) {
  const value = clean(record.meeting_url || record.meeting_link || record.interview_link);
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function candidateInterviewStatus(record, now = Date.now()) {
  const raw = clean(record.interview_status).toLowerCase();
  if (["pass", "passed"].includes(raw)) return { key: "passed", label: "Passed" };
  if (["fail", "failed"].includes(raw)) return { key: "failed", label: "Not selected" };
  if (["cancelled", "canceled"].includes(raw)) return { key: "cancelled", label: "Cancelled" };
  if (raw === "completed") return { key: "completed", label: "Completed" };
  const date = interviewDate(record.interview_datetime);
  if (date) return date.getTime() >= now
    ? { key: "scheduled", label: "Scheduled" }
    : { key: "pending", label: "Awaiting an update" };
  return { key: "pending", label: "Date to be confirmed" };
}

/** Read through the candidate's relationship, never the global interview collection. */
export async function loadCandidateInterviews(request, { candidate, email, uiModuleId } = {}) {
  const id = clean(candidate?.id);
  const loginEmail = clean(email).toLowerCase();
  if (!id || !loginEmail || clean(candidate?.email1).toLowerCase() !== loginEmail) {
    throw new Error("Your candidate profile could not be verified. Refresh your profile and try again.");
  }

  const records = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await request({
      action: "fetch_related",
      module: "hrc_candidates",
      id,
      related_module: "hrc_interviews",
      ...(uiModuleId ? { ui_module_id: uiModuleId } : {}),
      page,
      per_page: 20,
    });
    if (response?.success !== true || !Array.isArray(response.records)) {
      throw new Error(response?.error || response?.message || "Could not load your interviews. Please retry.");
    }
    const active = response.records.filter((record) => String(record.deleted) !== "1");
    for (const record of active) {
      const ownerId = candidateId(record);
      const ownerEmail = clean(record.email || record.email1).toLowerCase();
      // A supplied candidate ID is authoritative. Older related records may carry only email.
      if ((ownerId && ownerId !== id) || (!ownerId && ownerEmail && ownerEmail !== loginEmail)) {
        throw new Error("The interview response did not match your profile. Please refresh and try again.");
      }
    }
    records.push(...active);
    const pagination = response.pagination || {};
    totalPages = Number(response.total_pages ?? pagination.total_pages) ||
      Math.ceil(Number(response.total ?? pagination.total) / (Number(response.per_page ?? pagination.per_page) || 20)) || 1;
    page += 1;
  } while (page <= totalPages);

  // Keep completed rounds in the candidate's history, and cache only presentation fields.
  return uniqueInterviews(records)
    .sort((left, right) => roundName(left).localeCompare(roundName(right), undefined, { numeric: true, sensitivity: "base" }))
    .map((record) => ({
      id: record.id,
      round: roundName(record),
      scheduledAt: clean(record.interview_datetime),
      status: clean(record.interview_status),
      jobTitle: clean(record.job_name || record.job_title || record.hrc_job_postings_hrc_interviews_1_name),
      location: clean(record.interview_location || record.location),
      meetingUrl: meetingUrl(record),
    }));
}
