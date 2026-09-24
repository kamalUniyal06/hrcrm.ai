import test from "node:test";
import assert from "node:assert/strict";
import { needsOnboarding, rememberOnboardingComplete, rememberOnboardingStarted } from "./onboardingState.js";

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
