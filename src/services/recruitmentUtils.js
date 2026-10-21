export function normalizeRecruitmentApiUrl(value) {
  const url = new URL(String(value || "").trim());
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error("Use the recruitment API URL without credentials, query parameters or a fragment.");
  if (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("The recruitment API must use HTTPS.");
  const path = url.pathname.replace(/\/+$/, "").replace(/\/admin(?:\/.*)?$/, "");
  return `${url.origin}${path || "/api"}`;
}

export const recruitmentEmail = (candidate) => (String(candidate?.email1 || "").trim() || String(candidate?.email || "").trim()).toLowerCase();
export const recruitmentName = (candidate) => [candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ") || candidate?.full_name || candidate?.name || "Unnamed candidate";

export function invitationPayload(candidate) {
  const email = recruitmentEmail(candidate);
  const reference = String(candidate?.id || "").trim();
  if (!reference || reference.length > 191) throw new Error("Select a saved CRM candidate to create a test link.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
    throw new Error("Add a valid email address to this candidate's CRM profile first.");
  const names = recruitmentName(candidate).trim().split(/\s+/);
  const firstName = String(candidate.first_name || names.shift() || "").trim();
  const lastName = String(candidate.last_name || (candidate.first_name ? "" : names.join(" "))).trim();
  if (firstName.length > 120 || lastName.length > 120) throw new Error("Candidate names must be 120 characters or fewer.");
  return { candidate_email: email, candidate_first_name: firstName, candidate_last_name: lastName, external_reference: reference };
}

const DAY = 86400000;
const isoDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;

// Years of work from CRM experience records. Overlapping roles count once; a
// missing leaving date means the role is current.
export function experienceYears(experiences, now = Date.now()) {
  const ranges = (experiences || [])
    .map((item) => [isoDay(String(item?.joining_date || "").trim()), String(item?.leaving_date || "").trim() ? isoDay(String(item.leaving_date).trim()) : now])
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((left, right) => left[0] - right[0]);
  let total = 0;
  let current = null;
  for (const [start, end] of ranges) {
    if (current && start <= current[1]) current[1] = Math.max(current[1], end);
    else { if (current) total += current[1] - current[0]; current = [start, end]; }
  }
  if (current) total += current[1] - current[0];
  return Math.min(25, Math.round((total / DAY / 365.25) * 10) / 10);
}

export function skillNames(skills) {
  const seen = new Set();
  return (skills || [])
    .map((item) => String(item?.name || item?.skill_name || item?.skill || "").trim().replace(/\s+/g, " "))
    .filter((name) => name && name.length <= 120 && !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase()));
}

const recordTime = (value) => {
  const text = String(value || "").trim();
  const date = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (date) return Date.UTC(Number(date[3]), Number(date[1]) - 1, Number(date[2]), Number(date[4] || 0), Number(date[5] || 0));
  const time = Date.parse(text);
  return Number.isFinite(time) ? time : 0;
};

// Job postings have a posting name (e.g. REACT-INT-001) and the role's job title; the title selects the test role.
export const jobPostingTitle = (job) => String(job?.job_title || job?.name || job?.title || "").trim();

// The job's requirements decide which of the test role's skills are tested.
export const jobSkillsText = (job) => [job?.required_skills, job?.preferred_skills]
  .map((value) => String(value || "").trim()).filter(Boolean).join("\n\n").slice(0, 20000);

// Interviews scheduled without a job fall back to the job the candidate most recently applied for.
export function applicationJob(applications, jobs) {
  const byId = new Map((jobs || []).filter((job) => jobPostingTitle(job)).map((job) => [String(job.id || "").trim(), job]));
  const active = (applications || []).filter((application) => String(application?.deleted) !== "1");
  const latest = active
    .filter((application) => byId.has(String(application?.jobid || "").trim()))
    .sort((left, right) => recordTime(right.date_entered) - recordTime(left.date_entered))[0];
  if (latest) return { job: byId.get(String(latest.jobid).trim()), issue: "" };
  return {
    job: null,
    issue: active.length
      ? "This candidate's job application points to a job posting HRCRM could not find. Link the interview to a job posting first. Its job title selects the test role."
      : "",
  };
}

// The recruitment backend matches the job title to its test role, so the
// candidate opens the test without registering.
export function assessmentProfilePayload({ job, skills, experiences }, now = Date.now()) {
  const title = jobPostingTitle(job).replace(/\s+/g, " ");
  const reference = String(job?.id || "").trim();
  if (!title || !reference) throw new Error("Link this interview, or the candidate's job application, to a job posting first. Its title selects the test role.");
  if (title.length > 255 || reference.length > 191) throw new Error("The job posting title must be 255 characters or fewer.");
  return {
    job_reference: reference, job_title: title, job_skills_text: jobSkillsText(job),
    candidate_skills: skillNames(skills).slice(0, 200), candidate_experience: experienceYears(experiences, now),
  };
}

export function findInterviewCandidate(record, candidates) {
  const id = String(record.candidate_id || "").trim() || String(record.hrc_candidates_hrc_interviews_1hrc_candidates_ida || "").trim();
  if (id) return candidates.find((candidate) => String(candidate.id).trim() === id) || null;
  const email = recruitmentEmail(record);
  const matches = email ? candidates.filter((candidate) => recruitmentEmail(candidate) === email) : [];
  return matches.length === 1 ? matches[0] : null;
}

export function safeInvitationUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "";
    if (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return "";
    return url.href;
  } catch { return ""; }
}

export function recruitmentDate(value) {
  if (!value) return "";
  let raw = String(value).replace(" ", "T");
  if (!/Z$|[+-]\d{2}:?\d{2}$/.test(raw)) raw += "Z";
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
}
