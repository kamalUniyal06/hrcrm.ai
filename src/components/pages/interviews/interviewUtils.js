export const clean = (value) => String(value ?? "").trim();
export const roundName = (record) => clean(record.description).replace(/\s+/g, " ") || "Unspecified round";
export const isFirstRound = (record) => Boolean(record && /^round\s*1$/i.test(roundName(record)));
export const hasOutcome = (record) => ["pass", "passed", "fail", "failed"].includes(clean(record.interview_status).toLowerCase());
export const candidateId = (record) => clean(record.candidate_id) || clean(record.hrc_candidates_hrc_interviews_1hrc_candidates_ida);
export const isPassed = (record) => /^(pass|passed)$/i.test(clean(record.interview_status));
export const candidateIdentity = (record) => candidateId(record) || clean(record.email).toLowerCase();
export const interviewKey = (record) => JSON.stringify([candidateIdentity(record) || clean(record.id), clean(record.job_id), roundName(record).toLowerCase()]);
export function nextRoundName(record) {
  const match = roundName(record).match(/^round\s+(\d+)$/i);
  return match ? `Round ${Number(match[1]) + 1}` : "";
}

export function nextRoundData(record, description) {
  if (!candidateIdentity(record)) throw new Error("A candidate ID or email is required to create the next round.");
  if (!clean(description) || roundName({ description }).toLowerCase() === roundName(record).toLowerCase())
    throw new Error("Enter a different name for the next round.");
  return {
    name: record.name || "",
    email: record.email || "",
    candidate_id: candidateId(record),
    job_id: clean(record.job_id),
    assigned_user_id: clean(record.assigned_user_id),
    description: roundName({ description }),
    interview_datetime: "",
    interview_status: "",
    interview_feedback: "",
  };
}

// Create first so a failed creation never hides the current round. On retry,
// reuse the next round if creation succeeded but updating the current round failed.
export async function passToNextRound(record, feedback, description, api) {
  if (!clean(feedback)) throw new Error("Interview feedback is required.");
  const data = nextRoundData(record, description);
  const existing = await api.fetchAllRecords("hrc_interviews");
  const target = uniqueInterviews(existing).find((item) => interviewKey(item) === interviewKey(data));
  if (target && hasOutcome(target))
    throw new Error(`This candidate has already completed ${data.description}. Choose another round.`);
  if (!target)
    await api.createInterview(data);
  await api.updateInterview(record.id, { interview_status: "Pass", interview_feedback: clean(feedback) });
}

// The gateway's raw datetime is UTC; formatted display fields are not used for writes.
export function interviewDate(value) {
  const raw = clean(value);
  if (!raw) return null;
  let iso = raw.replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(iso)) {
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}(?::\d{2})?)$/);
    if (!match) return null;
    iso = `${match[3]}-${match[1]}-${match[2]}T${match[4]}`;
  }
  const date = new Date(iso + (/Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? "" : "Z"));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function localInterviewTime(value) {
  const date = interviewDate(value);
  return date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
}

export function displayInterviewTime(record) {
  const date = interviewDate(record.interview_datetime);
  return date ? date.toLocaleString() : clean(record.interview_datetime_uni_format) || clean(record.interview_datetime) || "Not scheduled";
}

export function uniqueInterviews(records) {
  const unique = new Map();
  for (const record of records) {
    if (String(record.deleted) === "1") continue;
    const key = candidateIdentity(record) ? interviewKey(record) : `record:${record.id}`;
    const previous = unique.get(key);
    const modified = (item) => interviewDate(item.date_modified)?.getTime() || interviewDate(item.date_entered)?.getTime() || 0;
    if (!previous || modified(record) > modified(previous) || (modified(record) === modified(previous) && clean(record.id).localeCompare(clean(previous.id)) > 0))
      unique.set(key, record);
  }
  return [...unique.values()];
}

// Passed rounds leave the board, except the final round, which stays to show who was selected.
export function groupInterviews(records) {
  const groups = new Map();
  for (const record of uniqueInterviews(records)) {
    if (isPassed(record) && !isFinalRound(record)) continue;
    const name = roundName(record);
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { key, name, records: [] });
    groups.get(key).records.push(record);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

// Board states, most urgent first. Only a passed final round stays on the board ("selected"),
// so "decided" means failed.
export const BOARD_STATES = ["due", "upcoming", "unscheduled", "selected", "decided"];

export function boardState(record, now = Date.now()) {
  if (isSelected(record)) return "selected";
  if (hasOutcome(record)) return "decided";
  const date = interviewDate(record.interview_datetime);
  if (!date) return "unscheduled";
  return date.getTime() < now ? "due" : "upcoming";
}

// Interviews waiting on a decision first, then the calendar in date order.
export function sortForBoard(records, now = Date.now()) {
  const time = (record) => interviewDate(record.interview_datetime)?.getTime() ?? 0;
  const rank = (record) => BOARD_STATES.indexOf(boardState(record, now));
  return [...records].sort((a, b) => rank(a) - rank(b) || time(a) - time(b));
}

// Calendar-day distance in local time: "Today", "Tomorrow", "In 3 days", "5 days ago".
export function relativeDay(date, now = new Date()) {
  const day = (value) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const text = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round((day(date) - day(now)) / 86400000), "day");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// The standard rounds always show, so the board keeps its shape and each one is a drop target.
// They come first in pipeline order; any custom rounds follow by name.
export const PIPELINE_ROUNDS = ["Round 1", "Round 2", "Round 3"];

export function withPipelineRounds(groups) {
  const keys = new Set(groups.map((group) => group.key));
  const missing = PIPELINE_ROUNDS.filter((name) => !keys.has(name.toLowerCase())).map((name) => ({ key: name.toLowerCase(), name, records: [] }));
  const rank = (group) => {
    const index = PIPELINE_ROUNDS.findIndex((name) => name.toLowerCase() === group.key);
    return index < 0 ? PIPELINE_ROUNDS.length : index;
  };
  return [...groups, ...missing].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

// Passing a pipeline round opens the next one; the last pipeline round and custom rounds end there.
export function nextPipelineRound(record) {
  const next = nextRoundName(record);
  return PIPELINE_ROUNDS.find((name) => name.toLowerCase() === next.toLowerCase()) || "";
}

// Passing the last pipeline round selects the candidate: only their stage moves, their status stays as it is.
export const HIRED_WORKFLOW = { stage: "Joining" };
export const isFinalRound = (record) => roundName(record).toLowerCase() === PIPELINE_ROUNDS[PIPELINE_ROUNDS.length - 1].toLowerCase();
export const isSelected = (record) => Boolean(record) && isPassed(record) && isFinalRound(record);
