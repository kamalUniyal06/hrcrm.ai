import { http } from "../../../services/api";
import { readResumeSections, normalizeResumeItems } from "./resumeSections";

export const candidateRelatedModules = {
  skills: "hrc_skills",
  experiences: "hrc_experience",
  education: "hrc_education",
};

export const relatedFields = {
  education: ["name", "qualification", "institution", "university", "school", "board", "specialization", "percentage", "from_time", "to_time", "status", "description"],
  experiences: ["name", "company_name", "company", "company_location", "position", "designation", "ctc", "joining_date", "leaving_date", "description", "responsibilities"],
  skills: ["name", "skill_name", "skill", "version", "last_used", "total_years_total_months", "description"],
};

export async function saveCandidateRelated(section, item, original) {
  const module = candidateRelatedModules[section];
  if (!module || !item.id || item.id !== original?.id) throw new Error("The related record is missing its ID. Reload this section and retry.");
  const data = Object.fromEntries(relatedFields[section]
    .filter(key => Object.hasOwn(item, key) && item[key] !== original[key])
    .map(key => [key, item[key]]));
  if (!Object.keys(data).length) return;
  const response = await http({ method: "POST", body: { action: "update", module, id: item.id, data } });
  if (response?.success !== true) throw new Error(response?.message || `Could not save ${section}. Please retry. Earlier successful changes have been kept.`);
}

export async function fetchCandidateRelated(id, section) {
  const related_module = candidateRelatedModules[section];
  if (!id || !related_module) throw new Error("A saved candidate is required to load this section.");
  const records = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await http({ method: "POST", body: {
      action: "fetch_related", module: "hrc_candidates", id, related_module, page, per_page: 20,
    } });
    if (response?.success !== true || !Array.isArray(response.records)) {
      throw new Error(response?.message || "Could not load this section. Please retry.");
    }
    records.push(...response.records);
    totalPages = Number(response.total_pages) || Math.ceil(Number(response.total) / (Number(response.per_page) || 20)) || 1;
    page += 1;
  } while (page <= totalPages);
  return normalizeResumeItems(records);
}

export const candidateFields = {
  first_name: "First name", last_name: "Last name", email1: "Email", phone_mobile: "Mobile phone",
  current_designation: "Current designation", title: "Title", department: "Department", dob: "Date of birth",
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
  for (const [field, source] of Object.entries({ primary_address_street: "street", primary_address_city: "city", primary_address_state: "state", primary_address_postalcode: "postal_code", primary_address_country: "country" })) {
    draft[field] ||= typeof record[source] === "string" ? record[source] : "";
  }
  draft.current_designation ||= record.designation || record.title || "";
  draft.description ||= record.summary || "";
  const history = readResumeSections(draft.description);
  draft.description = history.about;
  for (const key of ["linkedin_url", "github_url"]) if (/^https?:\/\/$/i.test(draft[key])) draft[key] = "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(draft.dob)) {
    const [month, day, year] = draft.dob.split("/");
    draft.dob = `${year}-${month}-${day}`;
  }
  draft.profile_image = /^https?:\/\/.+/i.test(record.profile_image || "") ? record.profile_image : "";
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
