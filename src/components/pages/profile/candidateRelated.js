import { normalizeResumeItems } from "./resumeSections.js";

export const candidateRelatedModules = {
  skills: "hrc_skills",
  experiences: "hrc_experience",
  education: "hrc_education",
};

export async function loadCandidateRelated(request, id, section) {
  const related_module = candidateRelatedModules[section];
  if (!id || !related_module) throw new Error("A saved candidate is required to load this section.");
  const records = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await request({
      action: "fetch_related", module: "hrc_candidates", id, related_module, page, per_page: 20,
    });
    if (response?.success !== true || !Array.isArray(response.records)) {
      throw new Error(response?.error || response?.message || "Could not load this section. Please retry.");
    }
    records.push(...response.records.filter((record) => record && String(record.deleted) !== "1"));
    const pagination = response.pagination || {};
    totalPages = Number(response.total_pages ?? pagination.total_pages)
      || Math.ceil(Number(response.total ?? pagination.total) / (Number(response.per_page ?? pagination.per_page) || 20)) || 1;
    page += 1;
  } while (page <= totalPages);
  return normalizeResumeItems(records);
}
