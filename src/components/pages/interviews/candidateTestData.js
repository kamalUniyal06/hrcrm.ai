import { safeInvitationUrl } from "../../../services/recruitmentUtils.js";
import { clean } from "./interviewUtils.js";

export async function loadCandidateTestInvitation(request, { candidate, email, signal } = {}, now = Date.now()) {
  const reference = clean(candidate?.id);
  const loginEmail = clean(email).toLowerCase();
  if (!reference || !loginEmail || clean(candidate?.email1).toLowerCase() !== loginEmail) {
    throw new Error("Your candidate profile could not be verified. Refresh your profile and try again.");
  }
  const response = await request({ external_reference: reference }, signal);
  if (response?.success !== true) {
    throw new Error(response?.error || response?.message || "Your test invitation could not be loaded.");
  }
  const invitation = response.invitation;
  if (invitation === null) return { status: "not_created", url: "", expiresAt: "" };
  if (!invitation?.id || clean(invitation.external_reference) !== reference || clean(invitation.intended_email).toLowerCase() !== loginEmail) {
    throw new Error("The test invitation did not match your profile. Please refresh and try again.");
  }
  const expiresAt = clean(invitation.expires_at);
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires) || !["pending", "accepted", "expired", "revoked"].includes(invitation.status)) {
    throw new Error("Your test invitation returned an invalid status. Please contact HR.");
  }
  if (invitation.status !== "pending") return { status: invitation.status, url: "", expiresAt };
  if (expires <= now) return { status: "expired", url: "", expiresAt };
  if (invitation.link_unavailable === true) return { status: "unavailable", url: "", expiresAt };
  const url = safeInvitationUrl(response.invitation_url);
  if (!url) throw new Error("Your test link could not be loaded. Please contact HR.");
  return { status: "pending", url, expiresAt };
}

export function createCandidateTestLoader({ getToken, clearToken, request }) {
  let refreshOnNextRead = false;
  return (options) => loadCandidateTestInvitation(async (params, signal) => {
    if (refreshOnNextRead) {
      clearToken();
      refreshOnNextRead = false;
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = await getToken();
      try {
        return await request("/integrations/hrcrm/my-invitation", { token, params, signal });
      } catch (error) {
        if (error.code === "HRCRM_CANDIDATE_EMAIL_REQUIRED") {
          refreshOnNextRead = true;
          throw error;
        }
        if (error.status !== 401 || attempt === 1 || signal?.aborted) throw error;
        clearToken();
      }
    }
  }, options);
}
