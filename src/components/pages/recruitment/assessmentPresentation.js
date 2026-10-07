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
