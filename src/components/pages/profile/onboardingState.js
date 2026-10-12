import { readResumeSections } from "./resumeSections.js";

// This is a UI preference, never an authorization or CRM workflow status.
export function needsOnboarding(candidate) {
  if (!candidate?.id) return true;
  try {
    const progress = localStorage.getItem(`candidate-onboarding:${candidate.id}`);
    if (progress === "complete") return false;
    if (progress === "pending" || progress === "resume-pending") return true;
  } catch { /* Fall back to the CRM state. */ }
  return !String(candidate.stage || "").trim() && !String(candidate.status || "").trim();
}

export function hasParsedResume(candidate) {
  if (!candidate?.id) return false;
  try {
    const progress = localStorage.getItem(`candidate-onboarding:${candidate.id}`);
    if (progress === "resume-pending") return true;
    if (progress === "complete") return false;
  } catch { /* Existing parsed resume content can still identify the review flow. */ }
  return !!readResumeSections(candidate.description || "").parsedResume;
}

export function candidateProfileStartPhase(candidate, jobId = "") {
  if (needsOnboarding(candidate)) return hasParsedResume(candidate) ? "builder" : "welcome";
  return jobId ? "upload" : "view";
}

export function rememberResumeParsed(candidate) {
  if (!candidate?.id) return;
  try { localStorage.setItem(`candidate-onboarding:${candidate.id}`, "resume-pending"); }
  catch { /* The active profile also keeps this state in memory. */ }
}

export function rememberOnboardingStarted(candidate) {
  if (!candidate?.id) return;
  try { localStorage.setItem(`candidate-onboarding:${candidate.id}`, hasParsedResume(candidate) ? "resume-pending" : "pending"); }
  catch { /* The active layout still keeps intermediate saves inside onboarding. */ }
}

export function rememberOnboardingComplete(candidate) {
  if (!candidate?.id) return;
  try { localStorage.setItem(`candidate-onboarding:${candidate.id}`, "complete"); }
  catch { /* Completion still works for the current session when storage is unavailable. */ }
}
