import test from "node:test";
import assert from "node:assert/strict";
import { hiringProgress, nextInterview, profileStrength } from "./candidateDashboard.js";

const states = (progress) => progress.steps.map((step) => step.state);

test("hiring progress starts empty and marks the application step once applied", () => {
  assert.deepEqual(states(hiringProgress({ candidate: { status: "New" } })), ["upcoming", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(states(hiringProgress({ candidate: {}, applications: [{ status: "applied" }] })), ["current", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(states(hiringProgress({ candidate: { id: "c1", status: "New" } })), ["current", "upcoming", "upcoming", "upcoming"]);
});

test("hiring progress moves through shortlist and interview stages", () => {
  assert.deepEqual(states(hiringProgress({ candidate: { hrc_stages_id_c_name: "Shortlisted" } })), ["done", "current", "upcoming", "upcoming"]);
  const interviewing = hiringProgress({ candidate: {}, applications: [{ status: "applied" }], interviews: [{ status: "", scheduledAt: "" }] });
  assert.deepEqual(states(interviewing), ["done", "done", "current", "upcoming"]);
});

test("hiring progress shows the final outcome", () => {
  const hired = hiringProgress({ candidate: {}, applications: [{ status: "accepted" }] });
  assert.deepEqual(states(hired), ["done", "done", "done", "done"]);
  assert.equal(hired.steps[3].label, "Hired");
  const declined = hiringProgress({ candidate: {}, applications: [{ status: "applied" }], interviews: [{ status: "Fail", scheduledAt: "" }] });
  assert.deepEqual(states(declined), ["done", "done", "done", "declined"]);
  assert.equal(declined.steps[3].label, "Not selected");
});

test("profile strength averages each section and caps counts", () => {
  assert.equal(profileStrength({}, {}).score, 0);
  const full = profileStrength(
    { first_name: "A", last_name: "B", email1: "a@b.c", phone_mobile: "1", current_designation: "Dev", primary_address_city: "X", description: "Hi", profile_image: "https://x" },
    { experiences: 9, education: 3, skills: 12 },
  );
  assert.equal(full.score, 100);
  assert.deepEqual(full.items.map((item) => item.value), [8, 2, 1, 5]);
});

test("next interview picks the earliest future scheduled round", () => {
  const now = Date.parse("2030-01-01T00:00:00Z");
  const interviews = [
    { id: "past", status: "", scheduledAt: "2029-12-01 10:00:00" },
    { id: "later", status: "", scheduledAt: "2030-03-01 10:00:00" },
    { id: "soon", status: "", scheduledAt: "2030-02-01 10:00:00" },
    { id: "passed", status: "Pass", scheduledAt: "2030-01-15 10:00:00" },
  ];
  assert.equal(nextInterview(interviews, now)?.record.id, "soon");
  assert.equal(nextInterview([], now), null);
});
