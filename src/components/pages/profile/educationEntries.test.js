import test from "node:test";
import assert from "node:assert/strict";
import { educationForOnboarding } from "./educationEntries.js";
import { validateRelatedEntries } from "./onboardingValidation.js";

test("linked parsed education retains its ID and takes precedence over resume content", () => {
  const records = [{ id: "education-1", qualification: "BSc", institution: "University", from_time: "2018", to_time: "2022" }];
  const description = JSON.stringify({ education: [{ name: "Duplicate BSc" }] });
  const entries = educationForOnboarding(records, description);
  assert.deepEqual(entries, [{ ...records[0], name: "BSc" }]);
  assert.equal(validateRelatedEntries("education", entries), null);
  assert.equal(records[0].name, undefined);
});

test("education embedded in parsed resume content becomes editable new records", () => {
  const education = [{ id: "parser-id", qualification: "MSc", school: "Example College", specialization: "Computing", to_time: "Present", description: "Research project" }];
  const description = JSON.stringify({ content: { candidate: { summary: "Introduction" }, education } });
  const entries = educationForOnboarding([], description);
  assert.deepEqual(entries, [{ qualification: "MSc", name: "MSc", school: "Example College", specialization: "Computing", to_time: "Present", description: "Research project" }]);
  assert.equal(validateRelatedEntries("education", entries), null);
});

test("manual education can be skipped, but each added entry needs a title", () => {
  assert.deepEqual(educationForOnboarding([], "Plain introduction"), []);
  assert.equal(validateRelatedEntries("education", []), null);
  assert.equal(validateRelatedEntries("education", [{ name: "Diploma", institution: "College" }]), null);
  const error = validateRelatedEntries("education", [{ name: " " }]);
  assert.equal(error.field, "name");
  assert.match(error.message, /education title/);
});
