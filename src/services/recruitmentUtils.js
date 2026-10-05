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
