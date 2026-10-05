import test from "node:test";
import assert from "node:assert/strict";
import { candidateId, groupInterviews, hasOutcome, interviewDate, isFirstRound, localInterviewTime, uniqueInterviews, nextRoundName, nextRoundData, passToNextRound } from "./interviewUtils.js";

test("test-link generation only accepts the Round 1 label", () => {
  for (const description of ["Round 1", " round  1 ", "ROUND1", "Round\t1"])
    assert.equal(isFirstRound({ description }), true);
  for (const description of ["Round 2", "Round 3", "Round 10", "Round 11", "Technical", "", " "])
    assert.equal(isFirstRound({ description }), false);
  assert.equal(isFirstRound(null), false);
  assert.equal(isFirstRound({}), false);
});

test("groups arbitrary descriptions without imposing predefined rounds", () => {
  const groups = groupInterviews([
    { id: "a", description: " Round  2 " },
    { id: "b", description: "round 2" },
    { id: "c", description: "Round 10" },
    { id: "d", description: "Round 1" },
    { id: "e", description: "Culture discussion" },
    { id: "f", description: " " },
  ]);
  assert.deepEqual(groups.map((group) => group.name), ["Culture discussion", "Round 1", "Round 2", "Round 10", "Unspecified round"]);
  assert.equal(groups.find((group) => group.key === "round 2").records.length, 2);
});

test("keeps only the most recently modified interview per candidate, job and round", () => {
  const older = { id: "old", candidate_id: "person", job_id: "job1", description: "Round 2", date_modified: "09/18/2026 15:54" };
  const newer = { id: "new", candidate_id: "person", job_id: " job1 ", description: "Round 2", date_modified: "09/18/2026 17:46" };
  assert.deepEqual(uniqueInterviews([newer, older]), [newer]);
  assert.deepEqual(uniqueInterviews([older, newer]), [newer]);
  assert.equal(groupInterviews([older, newer])[0].name, "Round 2");
});

test("passed rounds disappear while next rounds and other candidates remain", () => {
  const groups = groupInterviews([
    { id: "a", candidate_id: "one", job_id: "job", description: "Round 1", interview_status: "Pass" },
    { id: "b", candidate_id: "one", job_id: "job", description: "Round 2" },
    { id: "c", candidate_id: "two", job_id: "job", description: "Round 1" },
  ]);
  assert.deepEqual(groups.map((group) => group.records.map((record) => record.id)), [["c"], ["b"]]);
});

test("next round preserves candidate and job but clears previous scheduling and result", () => {
  const record = { id: "old", candidate_id: "person", name: "Harry", email: "harry@example.com", job_id: "job", description: "Round 1", interview_status: "Pass", interview_datetime: "2026-09-18 17:46:00", interview_feedback: "Good" };
  const next = nextRoundData(record, nextRoundName(record));
  assert.equal(next.description, "Round 2");
  assert.equal(next.candidate_id, record.candidate_id);
  assert.equal(next.job_id, record.job_id);
  assert.equal(next.name, record.name);
  assert.equal(next.email, record.email);
  assert.equal(next.interview_datetime, "");
  assert.equal(next.interview_status, "");
  assert.equal(next.interview_feedback, "");
  assert.equal(next.id, undefined);
  assert.equal(nextRoundName({ description: "Technical" }), "");
  assert.throws(() => nextRoundData(record, "Round 1"));
});

test("retry after a partial save reuses the next-round record", async () => {
  const records = [];
  let creates = 0;
  let updates = 0;
  const api = {
    fetchAllRecords: async () => records,
    createInterview: async (data) => { creates++; records.push({ ...data, id: "new" }); },
    updateInterview: async () => { if (++updates === 1) throw new Error("Temporary failure"); },
  };
  const record = { id: "old", candidate_id: "person", job_id: "job", description: "Round 1" };
  await assert.rejects(passToNextRound(record, "Good", "Round 2", api));
  await passToNextRound(record, "Good", "Round 2", api);
  assert.equal(creates, 1);
  assert.equal(updates, 2);
});

test("creation failure leaves current round unpassed and feedback is mandatory", async () => {
  let updated = false;
  const api = { fetchAllRecords: async () => [], createInterview: async () => { throw new Error("Unavailable"); }, updateInterview: async () => { updated = true; } };
  const record = { id: "old", candidate_id: "person", description: "Round 1" };
  await assert.rejects(passToNextRound(record, "Good", "Round 2", api));
  await assert.rejects(passToNextRound(record, " ", "Round 2", api));
  assert.equal(updated, false);
});

test("moving into a completed destination does not modify either interview", async () => {
  const record = { id: "source", candidate_id: "person", job_id: "job", description: "Round 2" };
  for (const interview_status of ["Pass", "Fail"]) {
    const api = {
      fetchAllRecords: async () => [{ ...record, id: "completed", description: "Round 1", interview_status }],
      createInterview: async () => assert.fail("Must not replace a completed round"),
      updateInterview: async () => assert.fail("Must not pass the source round"),
    };
    await assert.rejects(passToNextRound(record, "Good", "Round 1", api), /already completed Round 1/);
  }
});

test("moving into an existing pending round preserves its schedule and avoids a duplicate", async () => {
  const record = { id: "source", candidate_id: "person", job_id: "job", description: "Round 1" };
  const target = Object.freeze({ ...record, id: "target", description: "Round 2", interview_datetime: "2026-10-15 10:00:00", interview_status: "Pending" });
  const updates = [];
  const api = {
    fetchAllRecords: async () => [target],
    createInterview: async () => assert.fail("Must reuse the pending interview"),
    updateInterview: async (...args) => updates.push(args),
  };
  await passToNextRound(record, "  Ready for technical interview  ", "Round 2", api);
  assert.deepEqual(updates, [["source", { interview_status: "Pass", interview_feedback: "Ready for technical interview" }]]);
  assert.equal(target.interview_datetime, "2026-10-15 10:00:00");
});

test("destination checks use the latest active interview and ignore deleted duplicates", async () => {
  const record = { id: "source", candidate_id: "person", job_id: "job", description: "Round 1" };
  const older = { ...record, id: "old", description: "Round 2", interview_status: "Pass", date_modified: "2026-10-01 12:00:00" };
  const latest = { ...older, id: "latest", interview_status: "", date_modified: "2026-10-02 12:00:00" };
  const deleted = { ...older, id: "deleted", deleted: "1", date_modified: "2026-10-03 12:00:00" };
  let updates = 0;
  const api = {
    fetchAllRecords: async () => [latest, deleted, older],
    createInterview: async () => assert.fail("Must reuse the latest active interview"),
    updateInterview: async () => { updates++; },
  };
  await passToNextRound(record, "Good", "Round 2", api);
  assert.equal(updates, 1);
  latest.interview_status = "Fail";
  await assert.rejects(passToNextRound(record, "Good", "Round 2", api), /already completed/);
  assert.equal(updates, 1);
});

test("blank job IDs stay separate, repeated record IDs and deleted records do not", () => {
  const records = [{ id: "a", job_id: "" }, { id: "b", job_id: " " }, { id: "c" }, { id: "a", job_id: "" }, { id: "deleted", deleted: "1" }];
  assert.deepEqual(uniqueInterviews(records).map((item) => item.id), ["a", "b", "c"]);
});

test("date conversion supports gateway values and local scheduling", () => {
  assert.equal(interviewDate("2026-09-18 17:46:00").toISOString(), "2026-09-18T17:46:00.000Z");
  assert.equal(interviewDate("09/18/2026 17:46").toISOString(), "2026-09-18T17:46:00.000Z");
  assert.equal(interviewDate("2026-09-18T17:46:00+05:30").toISOString(), "2026-09-18T12:16:00.000Z");
  assert.equal(new Date(localInterviewTime("2026-09-18 17:46:00")).toISOString(), "2026-09-18T17:46:00.000Z");
  assert.equal(interviewDate(""), null);
  assert.equal(interviewDate("invalid"), null);
});

test("recognizes completed outcomes and candidate relationship fallback", () => {
  for (const interview_status of ["Pass", " Fail ", "passed", "Failed"]) assert.equal(hasOutcome({ interview_status }), true);
  assert.equal(hasOutcome({ interview_status: "Scheduled" }), false);
  assert.equal(candidateId({ candidate_id: " ", hrc_candidates_hrc_interviews_1hrc_candidates_ida: " candidate-1 " }), "candidate-1");
});
