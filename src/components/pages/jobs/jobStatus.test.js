import test from "node:test";
import assert from "node:assert/strict";
import { jobStatusOf, jobStatusStatsQueries, readJobStatusCounts } from "./jobStatus.js";

test("counts are asked from get_stats per status across every owner", () => {
  assert.deepEqual(jobStatusStatsQueries(), [
    { key: "active", module: "hrc_job_postings", ignore_email: true, filters: { status: "active" } },
    { key: "inactive", module: "hrc_job_postings", ignore_email: true, filters: { status: "inactive" } },
  ]);
});

test("reads both counts and rejects a failed or partial response", () => {
  assert.deepEqual(readJobStatusCounts({ success: true, stats: { active: { count: 4 }, inactive: { count: "2" } } }), { active: 4, inactive: 2 });
  assert.throws(() => readJobStatusCounts({ success: false, message: "Denied" }), /Denied/);
  assert.throws(() => readJobStatusCounts({ success: true, stats: { active: { count: 4 } } }), /inactive/);
  assert.throws(() => readJobStatusCounts({ success: true, stats: { active: { count: 4 }, inactive: { error: "Bad filter" } } }), /Bad filter/);
});

test("only an inactive posting counts as inactive", () => {
  assert.equal(jobStatusOf({ status: " Inactive " }), "inactive");
  for (const status of ["active", "", undefined, "open"]) assert.equal(jobStatusOf({ status }), "active");
});
