import test from "node:test";
import assert from "node:assert/strict";
import { candidateInterviewStatus, loadCandidateInterviews } from "./candidateInterviewData.js";

const candidate = { id: "candidate-one", email1: "candidate@example.com" };
const options = { candidate, email: "candidate@example.com", uiModuleId: "allowed-interview-module" };
const owned = {
  id: "interview-one", candidate_id: candidate.id, email: candidate.email1,
  description: "Round 1", interview_datetime: "2026-10-15 10:00:00", interview_status: "Pass",
  interview_feedback: "Internal recruiter notes", assigned_user_id: "recruiter-one",
  job_name: "Developer", interview_location: "Office", meeting_url: "https://example.com/meeting",
};

test("candidate interviews are requested through the verified profile and expose only candidate-facing details", async () => {
  const calls = [];
  const records = await loadCandidateInterviews(async (body) => {
    calls.push(body);
    return { success: true, records: [owned], total: 1, total_pages: 1 };
  }, options);

  assert.deepEqual(calls, [{
    action: "fetch_related", module: "hrc_candidates", id: candidate.id,
    related_module: "hrc_interviews", ui_module_id: options.uiModuleId, page: 1, per_page: 20,
  }]);
  assert.deepEqual(records, [{
    id: owned.id, round: "Round 1", scheduledAt: owned.interview_datetime,
    status: "Pass", jobTitle: "Developer", location: "Office", meetingUrl: owned.meeting_url,
  }]);
  assert.equal(Object.hasOwn(records[0], "interview_feedback"), false);
  assert.equal(Object.hasOwn(records[0], "assigned_user_id"), false);
});

test("missing or mismatched signed-in identity cannot make an interview request", async () => {
  let requests = 0;
  const request = async () => { requests += 1; return { success: true, records: [] }; };
  for (const identity of [undefined, {}, { candidate, email: "" }, { candidate: { email1: candidate.email1 }, email: candidate.email1 }, { candidate, email: "other@example.com" }]) {
    await assert.rejects(loadCandidateInterviews(request, identity), /verified/);
  }
  assert.equal(requests, 0);
});

test("another candidate's ID is rejected even when their interview email matches", async () => {
  await assert.rejects(loadCandidateInterviews(async () => ({
    success: true, records: [{ ...owned, candidate_id: "candidate-other" }],
  }), options), /did not match your profile/);
});

test("older interview records use a bound relationship ID or a matching email", async () => {
  for (const identity of [
    { candidate_id: "", hrc_candidates_hrc_interviews_1hrc_candidates_ida: candidate.id },
    { candidate_id: "", email: " CANDIDATE@example.com " },
  ]) {
    const records = await loadCandidateInterviews(async () => ({ success: true, records: [{ ...owned, ...identity }] }), options);
    assert.equal(records.length, 1);
  }
  await assert.rejects(loadCandidateInterviews(async () => ({
    success: true, records: [{ ...owned, candidate_id: "", email: "someone-else@example.com" }],
  }), options), /did not match your profile/);
});

test("all owned rounds are loaded, including passed history, while deleted records stay hidden", async () => {
  const pages = [];
  const records = await loadCandidateInterviews(async (body) => {
    pages.push(body);
    return {
      success: true, total_pages: 2,
      records: body.page === 1 ? [owned, { ...owned, id: "deleted", deleted: "1" }]
        : [{ ...owned, id: "round-two", description: "Round 2", interview_status: "" }],
    };
  }, options);
  assert.deepEqual(pages.map((body) => body.page), [1, 2]);
  assert.ok(pages.every((body) => body.action === "fetch_related" && body.id === candidate.id));
  assert.deepEqual(records.map((record) => record.round), ["Round 1", "Round 2"]);
  assert.equal(records[0].status, "Pass");
});

test("a failed or mismatched later page never returns partial interview details", async () => {
  for (const nextPage of [
    { success: false, error: "Cannot load interviews" },
    { success: true, records: [{ ...owned, id: "other", candidate_id: "candidate-other" }] },
    { success: true, records: null },
  ]) {
    await assert.rejects(loadCandidateInterviews(async (body) => body.page === 1
      ? { success: true, records: [owned], total_pages: 2 } : nextPage, options));
  }
});

test("meeting links accept web URLs and reject executable or malformed values", async () => {
  for (const meeting_url of ["javascript:alert(1)", "data:text/html,example", "invalid-link"]) {
    const records = await loadCandidateInterviews(async () => ({ success: true, records: [{ ...owned, meeting_url }] }), options);
    assert.equal(records[0].meetingUrl, "");
  }
});

test("candidate status distinguishes outcomes, future schedules, pending updates and unscheduled rounds", () => {
  const now = Date.parse("2026-10-06T10:00:00Z");
  assert.equal(candidateInterviewStatus({ interview_status: "Passed" }, now).label, "Passed");
  assert.equal(candidateInterviewStatus({ interview_status: "Fail" }, now).label, "Not selected");
  assert.equal(candidateInterviewStatus({ interview_status: "Cancelled" }, now).label, "Cancelled");
  assert.equal(candidateInterviewStatus({ interview_datetime: "2026-10-15 10:00:00" }, now).label, "Scheduled");
  assert.equal(candidateInterviewStatus({ interview_datetime: "2026-10-05 10:00:00" }, now).label, "Awaiting an update");
  assert.equal(candidateInterviewStatus({}, now).label, "Date to be confirmed");
});
