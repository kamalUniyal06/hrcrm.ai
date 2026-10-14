import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { experienceDateRange, hiringProgress, nextInterview, profileStrength } from "./candidateDashboard.js";
import { candidateRelatedQueryKey, loadCandidateRelated } from "../profile/candidateRelated.js";

const states = (progress) => progress.steps.map((step) => step.state);

test("dashboard preserves already-normalized ISO calendar dates", () => {
  assert.equal(experienceDateRange({ joining_date: "2025-01-06", leaving_date: "2026-01-02" }), "06 Jan 2025 – 02 Jan 2026");
  assert.equal(experienceDateRange({ joining_date: "2026-01-02", leaving_date: "" }), "02 Jan 2026 – Present");
});

test("dashboard preserves the actual browser response's MM/DD/YYYY experience dates", async () => {
  const response = {
    success: true,
    action: "fetch_related",
    module: "hrc_candidates",
    id: "candidate-1",
    related_module: "hrc_experience",
    total: 2,
    page: 1,
    per_page: 20,
    total_pages: 1,
    records: [
      { id: "current-role", name: "OutRight Systems Pvt. Ltd.", joining_date: "02/01/2026", leaving_date: "", deleted: "0" },
      {
        id: "978f01c8-902f-50e0-65a0-6acf13078cb7",
        name: "Global Matrix Solution",
        position: "Full Stack Developer",
        date_entered: "10/14/2026 10:58",
        joining_date: "06/01/2025",
        leaving_date: "02/01/2026",
        deleted: "0",
      },
    ],
  };
  const [current, previous] = await loadCandidateRelated(async () => response, "candidate-1", "experiences");
  assert.equal(current.joining_date, "2026-02-01");
  assert.equal(previous.joining_date, "2025-06-01");
  assert.equal(previous.leaving_date, "2026-02-01");
  assert.equal(experienceDateRange(current), "01 Feb 2026 – Present");
  assert.equal(experienceDateRange(previous), "01 Jun 2025 – 01 Feb 2026");
  assert.equal(experienceDateRange(response.records[1]), experienceDateRange(previous));
  assert.equal(response.records[1].joining_date, "06/01/2025");
  assert.equal(previous.date_entered, "10/14/2026 10:58");
});

test("dashboard refetches after correcting the browser date parser instead of reusing swapped dates", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const candidateId = "candidate-1";
  // Reproduce the already-normalized values visible in the reported dashboard.
  const oldRecords = [
    { id: "current-role", joining_date: "2026-01-02", leaving_date: "" },
    { id: "previous-role", joining_date: "2025-01-06", leaving_date: "2026-01-02" },
  ];
  client.setQueryData(["candidate-related", candidateId, "experiences", "dates-dd-mm-yyyy-v1"], oldRecords);
  let requests = 0;
  try {
    const records = await client.fetchQuery({
      queryKey: candidateRelatedQueryKey(candidateId, "experiences"),
      staleTime: 60000,
      queryFn: () => loadCandidateRelated(async () => {
        requests += 1;
        return { success: true, records: [
          { id: "current-role", joining_date: "02/01/2026", leaving_date: "" },
          { id: "previous-role", joining_date: "06/01/2025", leaving_date: "02/01/2026" },
        ] };
      }, candidateId, "experiences"),
    });
    assert.equal(requests, 1);
    assert.equal(experienceDateRange(records[0]), "01 Feb 2026 – Present");
    assert.equal(experienceDateRange(records[1]), "01 Jun 2025 – 01 Feb 2026");
  } finally {
    client.clear();
  }
});

test("dashboard calendar days do not shift for timestamps or roll over invalid dates", () => {
  assert.equal(experienceDateRange({ joining_date: "2024-02-29T23:00:00-05:00", leaving_date: "2025-01-01 00:00:00" }), "29 Feb 2024 – 01 Jan 2025");
  assert.equal(experienceDateRange({ joining_date: "2024-02-30", leaving_date: "31/02/2025" }), "2024-02-30 – 31/02/2025");
  assert.equal(experienceDateRange({}), "");
  assert.equal(experienceDateRange({ leaving_date: "2026-01-02" }), "Until 02 Jan 2026");
});

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
