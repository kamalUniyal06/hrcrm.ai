import test from "node:test";
import assert from "node:assert/strict";
import { applicationJob, assessmentProfilePayload, experienceYears, findInterviewCandidate, invitationPayload, normalizeRecruitmentApiUrl, recruitmentDate, safeInvitationUrl, skillNames } from "./recruitmentUtils.js";

test("API configuration accepts an API root or the supplied dashboard URL", () => {
  assert.equal(normalizeRecruitmentApiUrl("https://recruitment.example/api/admin/dashboard"), "https://recruitment.example/api");
  assert.equal(normalizeRecruitmentApiUrl("http://localhost:3001/api/"), "http://localhost:3001/api");
  for (const value of ["https://user:password@example.com/api", "http://example.com/api", "https://example.com/api?token=secret", "javascript:alert(1)"])
    assert.throws(() => normalizeRecruitmentApiUrl(value));
});

test("invitations bind the CRM identity and normalized email", () => {
  assert.deepEqual(invitationPayload({ id: "crm-123", first_name: " Astha ", last_name: "Gupta", email1: " ASTHA@Example.com " }), {
    external_reference: "crm-123", candidate_email: "astha@example.com", candidate_first_name: "Astha", candidate_last_name: "Gupta",
  });
  assert.equal(invitationPayload({ id: "crm-124", name: "Jake Ryan", email: "jake@example.com" }).candidate_last_name, "Ryan");
  assert.throws(() => invitationPayload({ email1: "valid@example.com" }), /saved CRM candidate/);
  assert.throws(() => invitationPayload({ id: "crm-123", email1: "invalid" }), /valid email/);
  assert.throws(() => invitationPayload({ id: "crm-123", email1: "valid@example.com", first_name: "x".repeat(121) }), /120 characters/);
});

test("interviews use their linked candidate and never fall back from a mismatched ID", () => {
  const candidates = [{ id: "one", email1: "same@example.com" }, { id: "two", email1: "same@example.com" }, { id: "three", email1: "unique@example.com" }];
  assert.equal(findInterviewCandidate({ candidate_id: "two", email: "unique@example.com" }, candidates).id, "two");
  assert.equal(findInterviewCandidate({ candidate_id: "missing", email: "unique@example.com" }, candidates), null);
  assert.equal(findInterviewCandidate({ email: "same@example.com" }, candidates), null);
  assert.equal(findInterviewCandidate({ email: " UNIQUE@Example.com " }, candidates).id, "three");
  assert.equal(findInterviewCandidate({ hrc_candidates_hrc_interviews_1hrc_candidates_ida: "one" }, candidates).id, "one");
});

test("blank interview fields do not hide a linked CRM candidate", () => {
  const candidate = { id: " crm-123 ", email1: " ", email: " CRM@Example.com " };
  assert.equal(findInterviewCandidate({ candidate_id: " ", hrc_candidates_hrc_interviews_1hrc_candidates_ida: " crm-123 " }, [candidate]), candidate);
  assert.equal(findInterviewCandidate({ email1: " ", email: "crm@example.com" }, [candidate]), candidate);
  assert.equal(invitationPayload(candidate).candidate_email, "crm@example.com");
  assert.equal(invitationPayload(candidate).external_reference, "crm-123");
});

test("generated links reject executable schemes, credentials and insecure public URLs", () => {
  assert.equal(safeInvitationUrl("https://candidate.example/invite/random-token"), "https://candidate.example/invite/random-token");
  assert.equal(safeInvitationUrl("http://localhost:5173/invite/random-token"), "http://localhost:5173/invite/random-token");
  for (const value of ["javascript:alert(1)", "data:text/html,test", "https://user:secret@example.com/invite/token", "http://candidate.example/invite/token", "invalid"])
    assert.equal(safeInvitationUrl(value), "");
});

test("recruitment dates accept server UTC timestamps and reject malformed dates", () => {
  assert.equal(recruitmentDate("2026-10-05 12:00:00"), recruitmentDate("2026-10-05T12:00:00Z"));
  assert.equal(recruitmentDate("bad date"), "");
});

test("CRM experience counts overlapping and current roles once", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  assert.equal(experienceYears([
    { joining_date: "2020-01-01", leaving_date: "2022-01-01" },
    { joining_date: "2021-01-01", leaving_date: "2023-01-01" },
    { joining_date: "2024-01-01", leaving_date: "" },
  ], now), 5);
  assert.equal(experienceYears([{ joining_date: "02/01/2020", leaving_date: "" }, { joining_date: "2025-01-01", leaving_date: "2024-01-01" }], now), 0);
  assert.equal(experienceYears([{ joining_date: "1990-01-01", leaving_date: "" }], now), 25);
  assert.equal(experienceYears(undefined, now), 0);
});

test("CRM skill names are trimmed and de-duplicated", () => {
  assert.deepEqual(skillNames([{ name: " React " }, { skill_name: "react" }, { skill: "Node.js" }, { name: "" }, null]), ["React", "Node.js"]);
});

test("assessment profiles send the job posting and its requirements", () => {
  const job = { id: " react-job ", job_title: " React  Developer ", job_code: "REACT-INT-001", required_skills: "- React.js\n- CSS3", preferred_skills: "- TypeScript" };
  assert.deepEqual(assessmentProfilePayload({ job, skills: [{ name: "React" }], experiences: [] }), {
    job_reference: "react-job", job_title: "React Developer", job_skills_text: "- React.js\n- CSS3\n\n- TypeScript",
    candidate_skills: ["React"], candidate_experience: 0,
  });
  assert.equal(assessmentProfilePayload({ job: { id: "j", name: "QA" } }).job_skills_text, "");
  assert.throws(() => assessmentProfilePayload({ job: { id: "j", job_title: " " } }), /job posting/);
  assert.throws(() => assessmentProfilePayload({ job: { job_title: "QA" } }), /job posting/);
  assert.throws(() => assessmentProfilePayload({}), /job posting/);
});

test("interviews without a job use the candidate's latest job application", () => {
  const jobs = [{ id: "react", name: "React Developer" }, { id: "qa", title: "QA" }];
  assert.equal(applicationJob([{ jobid: " react ", date_entered: "10/21/2026 11:50" }], jobs).job, jobs[0]);
  assert.equal(applicationJob([
    { jobid: "react", date_entered: "10/01/2026 09:00" },
    { jobid: "qa", date_entered: "10/21/2026 11:50" },
    { jobid: "missing", date_entered: "10/22/2026 11:50" },
    { jobid: "react", date_entered: "10/23/2026 11:50", deleted: "1" },
  ], jobs).job.id, "qa");
  assert.deepEqual(applicationJob([], jobs), { job: null, issue: "" });
  assert.match(applicationJob([{ jobid: "missing" }], jobs).issue, /could not find/);
  assert.equal(applicationJob([{ jobid: "untitled" }], [{ id: "untitled" }]).job, null);
});
