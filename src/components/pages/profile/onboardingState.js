// This is a UI preference, never an authorization or CRM workflow status.
export function needsOnboarding(candidate) {
  if (!candidate?.id) return true;
  try {
    const progress = localStorage.getItem(`candidate-onboarding:${candidate.id}`);
    if (progress === "complete") return false;
    if (progress === "pending") return true;
  } catch { /* Fall back to the CRM state. */ }
  return !String(candidate.stage || "").trim() && !String(candidate.status || "").trim();
}

export function rememberOnboardingStarted(candidate) {
  if (!candidate?.id) return;
  try { localStorage.setItem(`candidate-onboarding:${candidate.id}`, "pending"); }
  catch { /* The active layout still keeps intermediate saves inside onboarding. */ }
}

export function rememberOnboardingComplete(candidate) {
  if (!candidate?.id) return;
  try { localStorage.setItem(`candidate-onboarding:${candidate.id}`, "complete"); }
  catch { /* Completion still works for the current session when storage is unavailable. */ }
}
