import test from "node:test";
import assert from "node:assert/strict";
import { candidateProfileStartPhase, hasParsedResume, needsOnboarding, rememberOnboardingComplete, rememberOnboardingStarted, rememberResumeParsed } from "./onboardingState.js";

test("parsed resumes restart at the form across reloads and intermediate saves until completion", () => {
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  try {
    const candidate = { id: "parsed-candidate", stage: "New Candidate -> LinkedIn", description: "Parsed introduction" };
    rememberResumeParsed(candidate);
    assert.equal(needsOnboarding(candidate), true);
    assert.equal(hasParsedResume({ ...candidate }), true);
    assert.equal(candidateProfileStartPhase({ ...candidate }), "builder");
    assert.equal(candidateProfileStartPhase(candidate, "job-1"), "builder");
    rememberOnboardingStarted(candidate);
    assert.equal(candidateProfileStartPhase(candidate), "builder");
    assert.equal(hasParsedResume({ id: "other-candidate" }), false);
    rememberOnboardingComplete(candidate);
    assert.equal(candidateProfileStartPhase(candidate), "view");
    assert.equal(candidateProfileStartPhase(candidate, "job-1"), "upload");
    assert.equal(hasParsedResume(candidate), false);
  } finally { delete globalThis.localStorage; }
});

test("existing pending parsed resumes resume at the form, while manual registration keeps its options", () => {
  const candidate = { id: "existing-parsed", description: JSON.stringify({ content: { candidate: { summary: "Parsed introduction" }, education: [] } }) };
  assert.equal(candidateProfileStartPhase(candidate), "builder");
  assert.equal(candidateProfileStartPhase(null), "welcome");
  assert.equal(candidateProfileStartPhase({ id: "manual", description: "Manual introduction" }), "welcome");
  assert.doesNotThrow(() => rememberResumeParsed(candidate));
});

test("onboarding remains pending across intermediate CRM updates and ends only after completion", () => {
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  try {
    assert.equal(needsOnboarding(null), true);
    const candidate = { id: "candidate-1", stage: "  ", status: null };
    assert.equal(needsOnboarding(candidate), true);
    rememberOnboardingStarted(candidate);
    assert.equal(needsOnboarding({ ...candidate, stage: "New Candidate -> Direct" }), true);
    rememberOnboardingComplete(candidate);
    assert.equal(needsOnboarding(candidate), false);
    assert.equal(needsOnboarding({ ...candidate, id: "another-candidate" }), true);
    assert.equal(needsOnboarding({ id: "existing", status: "Active" }), false);
  } finally { delete globalThis.localStorage; }
});

test("unavailable browser storage falls back to CRM without crashing", () => {
  assert.equal(needsOnboarding({ id: "candidate", stage: "Joining" }), false);
  assert.equal(needsOnboarding({ id: "candidate", status: " " }), true);
  assert.doesNotThrow(() => rememberOnboardingComplete({ id: "candidate" }));
});
