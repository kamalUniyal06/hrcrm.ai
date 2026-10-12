import test from "node:test";
import assert from "node:assert/strict";
import { loadCandidatePage, loadShortlistSource } from "./candidateList.js";

const assignedDirectoryFilters = {
  employee: 0,
  hrc_stages_id_c: { nin: ["", "Unassigned"] },
  hrc_phase_id: { nin: ["", "Unassigned"] },
  hrc_status_id_c: { nin: ["", "Unassigned"] },
};

test("candidate directory requires an assigned stage, phase and status before server pagination", async () => {
  const calls = [];
  const records = Array.from({ length: 20 }, (_, index) => ({ id: String(index) }));
  const result = await loadCandidatePage(async (body) => {
    calls.push(body);
    return { success: true, records, total: "45", page: 1, per_page: 20, total_pages: 3 };
  });

  assert.deepEqual(calls, [{
    action: "fetch", module: "hrc_candidates", filters: assignedDirectoryFilters,
    order_by: "date_entered", order_dir: "DESC", page: 1, per_page: 20,
  }]);
  assert.equal(result.total, 45);
  assert.equal(result.pages, 3);
  assert.deepEqual(result.records, records);
});

test("the final page retains the server total rather than counting or slicing its records", async () => {
  const records = Array.from({ length: 5 }, (_, index) => ({ id: String(index + 40) }));
  const result = await loadCandidatePage(async (body) => {
    assert.equal(body.page, 3);
    assert.equal(body.per_page, 20);
    assert.deepEqual(body.filters, assignedDirectoryFilters);
    return { success: true, records, total: 45, page: 3, per_page: 20 };
  }, { page: 3 });

  assert.equal(result.page, 3);
  assert.equal(result.pages, 3);
  assert.equal(result.total, 45);
  assert.deepEqual(result.records, records);
});

test("callers cannot override required directory filters with search or workflow filters", async () => {
  const result = await loadCandidatePage(async (body) => {
    assert.deepEqual(body.filters, assignedDirectoryFilters);
    assert.equal(Object.hasOwn(body, "search"), false);
    assert.equal(Object.hasOwn(body, "search_fields"), false);
    assert.equal(body.order_by, "email1");
    assert.equal(body.order_dir, "ASC");
    return { success: true, records: [], total: 0, total_pages: 0 };
  }, {
    search: " Alex ",
    filters: { employee: "1", stage: "Shortlisted", hrc_phase_name: "", status: "Scheduled" },
    orderBy: "email1", orderDir: "ASC",
  });

  assert.equal(result.total, 0);
  assert.equal(result.pages, 1);
});

test("nested pagination and a changed final page use the server's page boundaries", async () => {
  const result = await loadCandidatePage(async () => ({
    success: true, records: [{ id: "last" }],
    pagination: { total_records: "21", total_pages: "2", page: "2", per_page: "20" },
  }), { page: 3 });

  assert.equal(result.page, 2);
  assert.equal(result.pages, 2);
  assert.equal(result.perPage, 20);
  assert.equal(result.total, 21);
});

test("failed or malformed candidate pages never become an empty successful directory", async () => {
  for (const response of [
    { success: false, error: "Permission denied" },
    { success: true, records: null, total: 20 },
    { success: true, records: [] },
    { success: true, records: [], total: -1 },
  ]) {
    await assert.rejects(loadCandidatePage(async () => response));
  }
});

test("the shortlist requests the employee and related stage-name filters on every server page", async () => {
  const requests = [];
  const firstPage = Array.from({ length: 20 }, (_, index) => ({ id: `candidate-${index}`, employee: "0", hrc_stages_id_c_name: "Shortlisted" }));
  const laterCandidate = { id: "later-candidate", employee: 0, hrc_stages_id_c_name: "Shortlisted" };
  const records = await loadShortlistSource(async (body) => {
    requests.push(body);
    return {
      success: true,
      records: body.page === 1 ? firstPage : [laterCandidate],
      total: 21, total_pages: 2, page: body.page, per_page: 20,
    };
  });
  assert.deepEqual(requests.map((body) => body.page), [1, 2]);
  requests.forEach((body) => {
    assert.deepEqual(body.filters, { employee: 0, hrc_stages_id_c_name: "Shortlisted" });
    assert.equal(Object.hasOwn(body, "search"), false);
  });
  assert.equal(records.length, 21);
  assert.equal(records.at(-1).id, "later-candidate");
});

test("a failed later page cannot turn the shortlist into an incomplete successful result", async () => {
  await assert.rejects(loadShortlistSource(async (body) => body.page === 1
    ? { success: true, records: [{ id: "first", employee: 0, hrc_stages_id_c_name: "Shortlisted" }], total: 21, total_pages: 2 }
    : { success: false, error: "Could not load the next page" }), /next page/);
});

test("an ignored filter or an employee record cannot populate the shortlist selector", async () => {
  for (const record of [
    { id: "joining", employee: 0, hrc_stages_id_c_name: "Joining" },
    { id: "employee", employee: 1, hrc_stages_id_c_name: "Shortlisted" },
    { id: "missing-employee", hrc_stages_id_c_name: "Shortlisted" },
    { id: "missing-stage", employee: 0 },
  ]) {
    await assert.rejects(loadShortlistSource(async () => ({ success: true, records: [record], total: 1 })), /ineligible candidates/);
  }
});

test("empty shortlists and false employee flags are accepted while deleted records stay excluded", async () => {
  assert.deepEqual(await loadShortlistSource(async () => ({ success: true, records: [], total: 0 })), []);
  const record = { id: "shortlisted", employee: false, hrc_stages_id_c_name: " ShortLISTED " };
  const result = await loadShortlistSource(async () => ({ success: true, records: [record, { id: "deleted", employee: 1, deleted: "1" }], total: 2 }));
  assert.deepEqual(result, [record]);
});
