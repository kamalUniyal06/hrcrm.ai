// Pure helpers behind the candidate-facing screens. One vocabulary of tones is
// shared by jobs, applications and interviews so every chip reads the same way:
// neutral = nothing to do, progress = moving, attention = the candidate must act,
// success = hired or offered, closed = rejected or withdrawn.

export const applicationStages = ["Applied", "Review", "Interview", "Decision"];

const lower = (value) => String(value ?? "").trim().toLowerCase();

/** Where an application sits in the four fixed stages, read from its CRM status. */
export function applicationStage(status) {
  const value = lower(status);
  if (/^(accepted|hired|selected|joined|offer)/.test(value)) {
    return { index: 3, tone: "success", closed: true, next: "HR will share the next steps with you." };
  }
  if (/^(rejected|withdrawn|declined|not[_ ]selected)/.test(value)) {
    return { index: 3, tone: "closed", closed: true, next: "No further steps." };
  }
  if (/interview/.test(value)) {
    return { index: 2, tone: "progress", closed: false, next: "Check My interviews for your schedule." };
  }
  if (/shortlist/.test(value)) {
    return { index: 2, tone: "progress", closed: false, next: "Your interview will be scheduled soon." };
  }
  if (/review|screen/.test(value)) {
    return { index: 1, tone: "progress", closed: false, next: "A recruiter is reviewing your profile." };
  }
  return { index: 1, tone: "progress", closed: false, next: "Waiting for recruiter review." };
}

/** One entry per stage, so a list row and a drawer timeline draw the same bars. */
export function applicationSteps(status) {
  const stage = applicationStage(status);
  return applicationStages.map((label, index) => ({
    label,
    state: index < stage.index || (stage.closed && index === stage.index) ? "done"
      : index === stage.index ? "current" : "upcoming",
    tone: index === stage.index ? stage.tone : "progress",
  }));
}

const normalize = (value) => lower(value).replace(/[^a-z0-9+#.]+/g, " ").trim();
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordIn = (needle, haystack) => new RegExp(`(^|\\s)${escape(needle)}(\\s|$)`).test(haystack);

/** Mark which required skills already appear on the candidate's profile. */
export function skillMatches(items = [], skills = []) {
  const known = [...new Set(skills.map(normalize).filter((skill) => skill.length > 1))];
  const entries = items.map((item) => {
    const text = normalize(item);
    return { item, matched: known.some((skill) => text === skill || wordIn(skill, text) || (text.length > 2 && wordIn(text, skill))) };
  });
  return { items: entries, count: entries.filter((entry) => entry.matched).length };
}

/** Group interview rounds the way the candidate thinks about them. */
export function groupRounds(rounds = []) {
  const upcoming = rounds.filter((round) => round.status.key === "scheduled").sort((left, right) => left.date - right.date);
  const unscheduled = rounds.filter((round) => round.status.key === "pending" && !round.date);
  const past = rounds.filter((round) => !upcoming.includes(round) && !unscheduled.includes(round))
    .sort((left, right) => (right.date?.getTime() || 0) - (left.date?.getTime() || 0));
  return { upcoming, unscheduled, past };
}
