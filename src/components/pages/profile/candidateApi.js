import { http } from "../../../services/api";

export const candidateFields = {
  first_name: "First name", last_name: "Last name", email1: "Email", phone_mobile: "Mobile phone",
  current_designation: "Current designation", department: "Department", dob: "Date of birth",
  gender: "Gender", primary_address_street: "Street address", primary_address_city: "City",
  primary_address_state: "State", primary_address_postalcode: "Postal code", primary_address_country: "Country",
  linkedin_url: "LinkedIn URL", github_url: "GitHub URL", description: "About you",
};

export function normalizeCandidate(record = {}, email) {
  const draft = Object.fromEntries(Object.keys(candidateFields).map(key => [key, typeof record[key] === "string" ? record[key].trim() : ""]));
  const names = String(record.full_name || record.name || "").trim().split(/\s+/);
  draft.first_name ||= names.length > 1 ? names.slice(0, -1).join(" ") : "";
  draft.last_name ||= names.at(-1) || "";
  draft.email1 = email;
  draft.phone_mobile ||= record.phone || record.mobile || "";
  draft.current_designation ||= record.designation || record.title || "";
  draft.description ||= record.summary || "";
  for (const key of ["linkedin_url", "github_url"]) if (/^https?:\/\/$/i.test(draft[key])) draft[key] = "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(draft.dob)) {
    const [month, day, year] = draft.dob.split("/");
    draft.dob = `${year}-${month}-${day}`;
  }
  draft.portfolio_url = /^https?:\/\/.+/i.test(record.portfolio_url || "") ? record.portfolio_url : "";
  return draft;
}

export async function findCandidate(email) {
  if (!email) throw new Error("Your login email is unavailable. Please sign in again.");
  const response = await http({ method: "POST", body: { action: "fetch", module: "hrc_candidates", filters: { email1: email }, page: 1, per_page: 20 } });
  if (response?.success !== true || !Array.isArray(response.records)) throw new Error(response?.message || "Could not load your candidate profile. Please retry.");
  const record = response.records.find(item => item.email1?.trim().toLowerCase() === email.toLowerCase());
  if (response.records.length && !record) throw new Error("The candidate lookup returned an unexpected email. Please retry.");
  if (record && !record.id) throw new Error("The candidate record is missing its ID. Please contact support.");
  return record || null;
}

export async function saveCandidate(id, draft, email) {
  const data = { ...normalizeCandidate(draft, email), candidate_source: draft.candidate_source || "career_portal" };
  const response = await http({ method: "POST", body: { action: id ? "update" : "create", module: "hrc_candidates", ...(id ? { id } : {}), data } });
  if (response?.success !== true) throw new Error(response?.message || "Could not save your profile. Please try again.");
  return { ...data, id: id || response.id || response.record?.id || response.data?.id };
}
