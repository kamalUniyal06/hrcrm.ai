import test from "node:test";
import assert from "node:assert/strict";
import { FEATURE_TOURS, readSeenTours, rememberTourSeen, tourForPage, tourStorageKey } from "./featureTours.js";

const admin = { isAdmin: true, isCandidate: false };
const employee = { isAdmin: false, isCandidate: false };
const candidate = { isAdmin: false, isCandidate: true };

test("every tour has a unique id and at least one step", () => {
  assert.equal(new Set(FEATURE_TOURS.map((tour) => tour.id)).size, FEATURE_TOURS.length);
  assert.ok(FEATURE_TOURS.every((tour) => tour.steps.length && tour.steps.every((step) => step.title && step.body)));
});

test("tours match their page and audience", () => {
  assert.equal(tourForPage("/policies?policy=1", employee).id, "policies-2026-10");
  assert.equal(tourForPage("/job-posting", admin).id, "job-status-2026-10");
  assert.equal(tourForPage("/job-posting", employee), null);
  assert.equal(tourForPage("/employees/abc-123", admin).id, "employee-profile-2026-10");
  assert.equal(tourForPage("/employees", admin), null);
  assert.equal(tourForPage("/", employee).id, "policies-footer-2026-10");
  assert.equal(tourForPage("/", candidate), null);
  assert.equal(tourForPage("/", admin, new Set(["policies-footer-2026-10", "hr-self-service-2026-10"])).id, "quotation-alerts-home-2026-10");
  assert.equal(tourForPage("/quotations?status=unpaid", admin).id, "quotations-2026-10");
  assert.equal(tourForPage("/quotations", employee), null);
});

test("admin-only steps are left out for employees", () => {
  const forEmployee = tourForPage("/policies", employee).steps.map((step) => step.target);
  const forAdmin = tourForPage("/policies", admin).steps.map((step) => step.target);
  assert.equal(forAdmin.length, forEmployee.length + 1);
  assert.ok(!forEmployee.includes("policy-admin-actions"));
});

test("a seen tour never comes back, and seen tours are kept per user", () => {
  const data = {};
  const storage = { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
  rememberTourSeen(storage, "user-1", "policies-2026-10");
  rememberTourSeen(storage, "user-1", "policies-2026-10");
  assert.deepEqual(JSON.parse(data[tourStorageKey("user-1")]), ["policies-2026-10"]);
  assert.equal(tourForPage("/policies", employee, readSeenTours(storage, "user-1")), null);
  assert.equal(tourForPage("/policies", employee, readSeenTours(storage, "user-2")).id, "policies-2026-10");
  data[tourStorageKey("user-3")] = "not json";
  assert.equal(readSeenTours(storage, "user-3").size, 0);
});
