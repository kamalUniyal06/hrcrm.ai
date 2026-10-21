export const assessmentLabel = (value, fallback = "Pending") =>
  String(value || fallback).replaceAll("_", " ");

export function assessmentScore(score, questionCount) {
  if (score === null || score === undefined || score === "" || questionCount === null || questionCount === undefined || questionCount === "") return null;
  const earned = Number(score);
  const total = Number(questionCount);
  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0 || earned < 0 || earned > total) return null;
  return { earned, total, percentage: Math.round((earned / total) * 100) };
}

export function invitationStatus(invitation, now = Date.now()) {
  if (invitation.status !== "pending") return invitation.status;
  // Match the API's UTC convention, including timestamps without a timezone.
  let timestamp = String(invitation.expires_at || "").replace(" ", "T");
  if (!/Z$|[+-]\d{2}:?\d{2}$/.test(timestamp)) timestamp += "Z";
  const expires = Date.parse(timestamp);
  return Number.isFinite(expires) && expires <= now ? "expired" : "pending";
}

// Interview cards name the test's progress, so HR sees it without opening the drawer.
const TEST_ACTIONS = {
  none: { label: "Send test", hint: "Create a test link for this candidate." },
  pending: { label: "Test sent", hint: "Test link sent. The candidate has not opened it yet." },
  in_progress: { label: "Test in progress", hint: "The candidate has started the test." },
  completed: { label: "View results", hint: "The candidate has submitted the test. Open to see the results." },
  expired: { label: "Resend test", hint: "The test link expired. Create a new one." },
  revoked: { label: "Resend test", hint: "The test link was withdrawn. Create a new one." },
};

export function testAction(status) {
  return Object.hasOwn(TEST_ACTIONS, status) ? { status, ...TEST_ACTIONS[status] } : { status: "unknown", label: "Test link", hint: "" };
}
