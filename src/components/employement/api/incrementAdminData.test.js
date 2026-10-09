import test from "node:test";
import assert from "node:assert/strict";
import {
  answerProgress, filterRequestRows, groupAnswers, loadAll, loadPage, loadRequestCollection, questionText, requestedAnnualSalary,
  requestIdentity, requestOverview, saveRecord,
} from "./incrementAdminData.js";

test("stored increment name is email and description is the requested annual salary", () => {
  const record = { name: "employee@example.org", description: "360000" };
  assert.equal(requestIdentity(record).email, "employee@example.org");
  assert.equal(requestedAnnualSalary(record), 360000);
  assert.equal(requestedAnnualSalary({ name: "360000", description: "" }), null);
  assert.equal(requestedAnnualSalary({ description: "Salary to discuss" }), null);
  assert.equal(requestedAnnualSalary({ description: "Infinity" }), null);
});

test("answer completion ignores other requests, duplicates, blank replies, and unavailable questions", () => {
  const questions = [{ id: "question-1" }, { id: "question-2" }];
  const replies = [
    { increment_id: "request-1", question_id: "question-1", description: "An answer" },
    { increment_id: "request-1", question_id: "question-1", description: "Another answer" },
    { increment_id: "request-1", question_id: "question-2", description: "  " },
    { increment_id: "request-2", question_id: "question-2", description: "Other employee" },
    { increment_id: "request-1", question_id: "archived", description: "Historical answer" },
  ];
  assert.deepEqual(answerProgress(questions, replies, "request-1"), { answered: 1, total: 2, complete: false });
  assert.deepEqual(answerProgress([], replies, "request-1"), { answered: 0, total: 0, complete: false });
});

test("answers join through scalar IDs even when SuiteCRM relationship fields are blank", () => {
  const replies = [
    { id: "a", increment_id: "r1", question_id: "q1", description: "Answer", hrc_increment_hrc_increment_replies_1hrc_increment_ida: " " },
    { id: "b", increment_id: "r1", question_id: "old", description: "Preserve me" },
    { id: "c", increment_id: "r2", question_id: "q1", description: "Different request" },
  ];
  const groups = groupAnswers([{ id: "q1", description: "Question" }, { id: "q2" }], replies, "r1");
  assert.deepEqual(groups.map((group) => [group.id, group.missing, group.replies.map((reply) => reply.id)]), [
    ["q1", false, ["a"]], ["q2", false, []], ["old", true, ["b"]],
  ]);
});

test("the supplied record shapes load salaries and link answers without a metadata request", async () => {
  const questions = [{ id: "q1", name: "", description: "What have you learned?" }];
  const calls = [];
  const data = await loadRequestCollection(async (body) => {
    calls.push(body);
    assert.equal(body.action, "fetch");
    if (body.module === "hrc_increment") {
      return { success: true, total: 1, total_pages: 1, records: [{ id: "r1", name: "employee@example.org", description: "360000" }] };
    }
    assert.deepEqual(body.filters, { increment_id: { in: ["r1"] } });
    assert.deepEqual(body.fields, ["id", "increment_id", "question_id", "description"]);
    return { success: true, total: 1, total_pages: 1, records: [{ id: "reply-1", name: "", increment_id: "r1", question_id: "q1", description: "New skills" }] };
  });
  assert.equal(calls.length, 2);
  assert.equal(requestIdentity(data.records[0]).email, "employee@example.org");
  assert.equal(requestedAnnualSalary(data.records[0]), 360000);
  assert.equal(questionText(questions[0]), "What have you learned?");
  assert.equal(requestOverview(data.records, questions, data.replies).complete, 1);
});

test("all-page reads preserve ordering and filters while excluding deleted records", async () => {
  const calls = [];
  const records = await loadAll(async (body) => {
    calls.push(body);
    return { success: true, total: 3, total_pages: 2, records: body.page === 1 ? [{ id: "one" }, { id: "deleted", deleted: "1" }] : [{ id: "two" }] };
  }, "hrc_increment_replies", { filters: { increment_id: "request-1" }, order_dir: "ASC" });
  assert.deepEqual(records.map((record) => record.id), ["one", "two"]);
  assert.deepEqual(calls.map((body) => body.page), [1, 2]);
  assert.ok(calls.every((body) => body.action === "fetch" && body.per_page === 200 && body.filters.increment_id === "request-1" && body.order_dir === "ASC"));
});

test("gateway failures and malformed collections do not become empty successful lists", async () => {
  await assert.rejects(loadPage(async () => ({ success: false, error: "Access denied" }), "hrc_increment"), /Access denied/);
  await assert.rejects(loadPage(async () => ({ success: true }), "hrc_increment"), /invalid record collection/);
});

test("question updates are verified by a filtered read of the saved record", async () => {
  const calls = [];
  const record = { id: "question-1", name: "Impact", description: "Describe your impact." };
  const saved = await saveRecord(async (body) => {
    calls.push(body);
    return body.action === "update" ? { success: true, id: "question-1" } : { success: true, records: [record] };
  }, "hrc_increment_questions", "question-1", { name: record.name, description: record.description });
  assert.equal(saved, record);
  assert.deepEqual(calls.map((body) => body.action), ["update", "fetch"]);
  assert.deepEqual(calls[1].filters, { id: "question-1" });
});

test("a transformed or unconfirmed write is surfaced and never automatically repeated", async () => {
  let writes = 0;
  await assert.rejects(saveRecord(async (body) => {
    if (body.action === "create") { writes += 1; return { success: true, id: "new-question" }; }
    return { success: true, records: [{ id: "new-question", description: "Different value" }] };
  }, "hrc_increment_questions", null, { description: "Intended value" }), /saved a different result/);
  assert.equal(writes, 1);
  await assert.rejects(saveRecord(async () => ({ success: true, id: "wrong-id" }), "hrc_increment_questions", "question-1", { name: "Impact" }), /did not confirm/);
});

test("completion cards count and filter all requests before table pagination", () => {
  const records = Array.from({ length: 25 }, (_, index) => ({ id: `request-${index}` }));
  const replies = [
    { increment_id: "request-24", question_id: "q1", description: "Answer on the second page" },
    { increment_id: "request-24", question_id: "q1", description: "Duplicate response" },
    { increment_id: "unrelated", question_id: "q1", description: "Another request" },
    { increment_id: "request-0", question_id: "q1", description: " " },
    { increment_id: "request-1", question_id: "archived", description: "Old answer" },
  ];
  const overview = requestOverview(records, [{ id: "q1" }], replies);
  assert.equal(overview.total, 25);
  assert.equal(overview.complete, 1);
  assert.equal(overview.awaiting, 24);
  assert.deepEqual(filterRequestRows(overview.rows, "complete").map((row) => row.record.id), ["request-24"]);
  assert.equal(filterRequestRows(overview.rows, "awaiting").length, 24);
  assert.equal(filterRequestRows(overview.rows, "all").length, 25);
  assert.equal(requestOverview(records, [], replies).complete, 0);
});

test("collection loading fetches every page and batches reply IDs within the active email and dates", async () => {
  const calls = [];
  const allRecords = Array.from({ length: 201 }, (_, index) => ({ id: `request-${index}` }));
  const data = await loadRequestCollection(async (body) => {
    calls.push(body);
    if (body.module === "hrc_increment") return {
      success: true, total_pages: 2, total: 201,
      records: body.page === 1 ? allRecords.slice(0, 200) : allRecords.slice(200),
    };
    return { success: true, total_pages: 1, records: [
      { increment_id: body.filters.increment_id.in[0], question_id: "q1", description: "Answer" },
      { increment_id: "outside-filter", question_id: "q1", description: "Exclude this" },
    ] };
  }, { search: "employee", from: "2026-10-01", to: "2026-10-08" });
  const requestCalls = calls.filter((body) => body.module === "hrc_increment");
  const replyCalls = calls.filter((body) => body.module === "hrc_increment_replies");
  assert.equal(data.records.length, 201);
  assert.deepEqual(requestCalls.map((body) => body.page), [1, 2]);
  assert.ok(requestCalls.every((body) => body.search === "employee" && body.date_from === "2026-10-01" && body.date_to === "2026-10-08"));
  assert.deepEqual(replyCalls.map((body) => body.filters.increment_id.in.length), [200, 1]);
  assert.deepEqual(data.replies.map((reply) => reply.increment_id), ["request-0", "request-200"]);
});

test("an empty request result never issues an unbounded reply query", async () => {
  const calls = [];
  const data = await loadRequestCollection(async (body) => {
    calls.push(body);
    return { success: true, total_pages: 1, total: 0, records: [] };
  });
  assert.deepEqual(data, { records: [], replies: [] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].module, "hrc_increment");
});
