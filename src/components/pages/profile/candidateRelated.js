import { normalizeResumeItems } from "./resumeSections.js";
import { experienceDateForInput } from "./experienceDates.js";

export const candidateRelatedModules = {
  skills: "hrc_skills",
  experiences: "hrc_experience",
  education: "hrc_education",
};

export function isCandidateRelatedRecordEmpty(section, item) {
  if (!item || typeof item !== "object") return true;
  if (section === "education") {
    const qual = String(item.qualification || item.name || "").trim();
    const inst = String(item.institution || item.university || item.school || item.board || "").trim();
    const spec = String(item.specialization || "").trim();
    if (!qual && !inst && !spec) return true;
    if (/^Education\s*#?\d*$/i.test(qual) && !inst && !spec) return true;
    return false;
  }
  if (section === "experiences") {
    const pos = String(item.name || item.designation || item.position || "").trim();
    const comp = String(item.company_name || item.company || "").trim();
    if (!pos && !comp) return true;
    if (/^Experience\s*#?\d*$/i.test(pos) && !comp) return true;
    return false;
  }
  if (section === "skills") {
    const sk = String(item.skill_name || item.skill || item.name || "").trim();
    if (!sk) return true;
    if (/^Skill\s*#?\d*$/i.test(sk)) return true;
    return false;
  }
  return false;
}

export async function loadCandidateRelated(request, id, section) {
  const related_module = candidateRelatedModules[section];
  if (!id || !related_module) throw new Error("A saved candidate is required to load this section.");
  const records = [];
  const ghostIds = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await request({
      action: "fetch_related", module: "hrc_candidates", id, related_module, page, per_page: 20,
    });
    if (response?.success !== true || !Array.isArray(response.records)) {
      throw new Error(response?.error || response?.message || "Could not load this section. Please retry.");
    }
    for (const record of response.records) {
      if (!record || String(record.deleted) === "1") continue;
      if (isCandidateRelatedRecordEmpty(section, record)) {
        if (record.id) ghostIds.push(record.id);
      } else {
        records.push(record);
      }
    }
    const pagination = response.pagination || {};
    totalPages = Number(response.total_pages ?? pagination.total_pages)
      || Math.ceil(Number(response.total ?? pagination.total) / (Number(response.per_page ?? pagination.per_page) || 20)) || 1;
    page += 1;
  } while (page <= totalPages);

  // Background cleanup: mark ghost records as deleted in SuiteCRM so they don't linger
  if (ghostIds.length > 0) {
    for (const ghostId of ghostIds) {
      request({
        action: "update",
        module: related_module,
        id: ghostId,
        data: { deleted: 1 },
      }).catch(() => {});
    }
  }

  const items = normalizeResumeItems(records);
  if (section !== "experiences") return items;
  return items.map((item) => ({
    ...item,
    ...Object.fromEntries(["joining_date", "leaving_date"]
      .filter((key) => Object.hasOwn(item, key))
      .map((key) => [key, experienceDateForInput(item[key])])),
  }));
}
