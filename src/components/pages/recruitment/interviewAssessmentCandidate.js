import { findInterviewCandidate, recruitmentEmail } from "../../../services/recruitmentUtils.js";
import { candidateId } from "../interviews/interviewUtils.js";

export async function loadInterviewAssessmentCandidate(interview, initialCandidate, { loadById, loadByEmail }) {
  const existing = initialCandidate?.id && findInterviewCandidate(interview, [initialCandidate]);
  if (existing) return existing;

  const id = candidateId(interview);
  if (id) {
    const candidate = await loadById(id);
    if (String(candidate?.id || "").trim() !== id || String(candidate.deleted) === "1")
      throw new Error("The CRM profile linked to this interview is no longer available. Refresh the interview board.");
    return candidate;
  }

  const email = recruitmentEmail(interview);
  if (!email) throw new Error("This interview has no candidate ID or email. Update the interview's candidate details first.");
  const candidates = await loadByEmail(email);
  const candidate = findInterviewCandidate(interview, candidates.filter((item) => item.id && String(item.deleted) !== "1"));
  if (!candidate) throw new Error("A unique CRM profile could not be found for this interview's email. Add the candidate relationship to the interview, then retry.");
  return candidate;
}
