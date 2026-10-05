import test from "node:test";
import assert from "node:assert/strict";
import { findInterviewCandidate, invitationPayload, normalizeRecruitmentApiUrl, recruitmentDate, safeInvitationUrl } from "./recruitmentUtils.js";

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
