import test from "node:test";
import assert from "node:assert/strict";
import { applicationTone, experienceRange, isChipList, locationOf, requirementItems, salaryRange } from "./jobFormatting.js";

test("experience ranges read naturally", () => {
  assert.equal(experienceRange({ minimum_experience: "2", maximum_experience: "4" }), "2–4 years");
  assert.equal(experienceRange({ minimum_experience: "3", maximum_experience: "" }), "3+ years");
  assert.equal(experienceRange({ minimum_experience: "", maximum_experience: "1" }), "Up to 1 year");
  assert.equal(experienceRange({ minimum_experience: "0", maximum_experience: "0" }), "Freshers welcome");
  assert.equal(experienceRange({ experience_required: "Senior" }), "Senior");
  assert.equal(experienceRange({}), "");
});

test("salary ranges include currency and negotiation", () => {
  assert.equal(salaryRange({ minimum_salary: "500000", maximum_salary: "800000", salary_currency: "INR" }), "INR 5,00,000 – 8,00,000");
  assert.equal(salaryRange({ minimum_salary: "80000", maximum_salary: "100000", salary_currency: "USD", salary_negotiable: "1" }), "USD 80,000 – 100,000 (negotiable)");
  assert.equal(salaryRange({ minimum_salary: "", maximum_salary: "", salary_negotiable: "0" }), "");
  assert.equal(salaryRange({ salary_negotiable: "1" }), "Negotiable");
  assert.equal(salaryRange({ salary_currency: "usd" }, { salary_currency: { usd: "USD" } }), "");
});

test("location falls back to city, state and country", () => {
  assert.equal(locationOf({ location: "Kolkata office", city: "Kolkata" }), "Kolkata office");
  assert.equal(locationOf({ location: "", city: "Pune", state: "", country: "India" }), "Pune, India");
  assert.equal(locationOf({}), "");
});

test("short skill phrases render as chips, sentences as a list", () => {
  assert.equal(isChipList(requirementItems("- TypeScript\n- Firebase\n- CI/CD")), true);
  assert.equal(isChipList(requirementItems("- 2-4 years of hands-on experience with React Native.\n- Git")), false);
  assert.equal(isChipList([]), false);
});

test("application status tones", () => {
  assert.equal(applicationTone("accepted"), "positive");
  assert.equal(applicationTone("rejected_by_hr"), "negative");
  assert.equal(applicationTone("applied"), "pending");
  assert.equal(applicationTone(undefined), "pending");
});
