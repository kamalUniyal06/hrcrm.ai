import test from "node:test";
import assert from "node:assert/strict";
import { loadInterviewAssessmentCandidate } from "./interviewAssessmentCandidate.js";

const candidate = { id: "crm-123", first_name: "Gagan", last_name: "Kumar", email1: "gagan@example.com", stage: "Interviewing" };
const noLookup = () => assert.fail("The supplied CRM candidate must not require another lookup or shortlist selection.");

test("a card's existing candidate is usable even after moving beyond the shortlist", async () => {
  const result = await loadInterviewAssessmentCandidate({ candidate_id: candidate.id }, candidate, { loadById: noLookup, loadByEmail: noLookup });
  assert.equal(result, candidate);
});

test("email-linked cards also use the supplied profile immediately", async () => {
  const result = await loadInterviewAssessmentCandidate({ email: " GAGAN@example.com " }, candidate, { loadById: noLookup, loadByEmail: noLookup });
  assert.equal(result, candidate);
});

test("a missing profile is loaded automatically by the card's candidate relationship", async () => {
  const result = await loadInterviewAssessmentCandidate({ hrc_candidates_hrc_interviews_1hrc_candidates_ida: candidate.id }, null, {
    loadById: async (id) => { assert.equal(id, candidate.id); return candidate; },
    loadByEmail: noLookup,
  });
  assert.equal(result, candidate);
});

test("a wrong or missing linked ID cannot fall back to another profile with the same email", async () => {
  await assert.rejects(loadInterviewAssessmentCandidate({ candidate_id: "missing", email: candidate.email1 }, candidate, {
    loadById: async () => null,
    loadByEmail: noLookup,
  }), /no longer available/);
});

test("cards without a relationship resolve only a unique exact email automatically", async () => {
  const interview = { email: " GAGAN@example.com " };
  const result = await loadInterviewAssessmentCandidate(interview, null, {
    loadById: noLookup,
    loadByEmail: async (email) => {
      assert.equal(email, "gagan@example.com");
      return [candidate, { id: "other", email1: "other@example.com" }];
    },
  });
  assert.equal(result, candidate);
  for (const matches of [[], [candidate, { ...candidate, id: "duplicate" }], [{ ...candidate, deleted: "1" }]]) {
    await assert.rejects(loadInterviewAssessmentCandidate(interview, null, { loadById: noLookup, loadByEmail: async () => matches }), /unique CRM profile/);
  }
});

test("an interview record ID is never used as the candidate reference", async () => {
  await assert.rejects(loadInterviewAssessmentCandidate({ id: "interview-123", name: "Gagan Kumar" }, null, { loadById: noLookup, loadByEmail: noLookup }), /no candidate ID or email/);
});
