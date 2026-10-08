export const INCREMENT_MODULES = {
  requests: "hrc_increment",
  questions: "hrc_increment_questions",
  replies: "hrc_increment_replies",
};

export const clean = (value) => String(value ?? "").trim();

export function gatewayError(error) {
  const payload = error?.response?.data;
  return payload?.error || payload?.message || error?.message || "The request failed. Please try again.";
}

function assertResponse(response, message) {
  if (response?.success !== true) throw new Error(response?.error || response?.message || message);
  return response;
}

export async function loadFields(request, module) {
  const response = assertResponse(await request({ action: "get_module_fields", module }), "Could not load field metadata.");
  const fields = Array.isArray(response.fields) ? response.fields : Object.values(response.fields || {});
  if (!fields.length || fields.some((field) => !field?.name)) throw new Error("Field metadata is incomplete. Refresh to try again.");
  return fields;
}

export async function loadPage(request, module, options = {}) {
  const response = assertResponse(await request({
    action: "fetch", module, page: 1, per_page: 20,
    order_by: "date_entered", order_dir: "DESC", ...options,
  }), "Could not load increment records.");
  if (!Array.isArray(response.records)) throw new Error("The gateway returned an invalid record collection.");
  return {
    ...response,
    records: response.records.filter((record) => clean(record.deleted) !== "1"),
    total: Number(response.total) || 0,
    total_pages: Math.max(1, Number(response.total_pages) || 1),
  };
}

export async function loadAll(request, module, options = {}) {
  const records = [];
  let page = 1;
  let pages = 1;
  do {
    const response = await loadPage(request, module, { ...options, per_page: 200, page });
    records.push(...response.records);
    pages = response.total_pages;
    page += 1;
  } while (page <= pages);
  return records;
}

export async function loadRequestCollection(request, { search, from, to } = {}) {
  const records = await loadAll(request, INCREMENT_MODULES.requests, {
    ...(search ? { search, search_fields: ["name"] } : {}),
    ...(from || to ? { date_range: "custom", date_field: "date_entered", date_from: from, date_to: to } : {}),
  });
  const ids = records.map((record) => clean(record.id)).filter(Boolean);
  const requestIds = new Set(ids);
  const replies = [];
  // Bounded ID batches keep the completion filters accurate across pages.
  // Never send an empty IN filter: the gateway ignores it.
  for (let offset = 0; offset < ids.length; offset += 200) {
    const batch = await loadAll(request, INCREMENT_MODULES.replies, {
      filters: { increment_id: { in: ids.slice(offset, offset + 200) } },
      fields: ["id", "increment_id", "question_id", "description"],
    });
    replies.push(...batch.filter((reply) => requestIds.has(clean(reply.increment_id))));
  }
  return { records, replies };
}

export function requireReplyLinks(fields) {
  for (const name of ["increment_id", "question_id", "description"]) {
    if (!fields.some((field) => field.name === name)) {
      throw new Error(`The reply module does not expose ${name}. Its relationship mapping must be checked before loading answers.`);
    }
  }
}

export function numericAmount(value) {
  const text = clean(value).replace(/,/g, "");
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

// Confirmed stored contract: name is employee email; description is requested
// annual salary. Current salary and approval status are not persisted here.
export const requestedAnnualSalary = (record) => numericAmount(record.description);

export function requestIdentity(record) {
  const email = clean(record.name);
  const displayName = [record.first_name, record.last_name].map(clean).filter(Boolean).join(" ");
  return { email: email.includes("@") ? email : "", name: displayName || (email.includes("@") ? email : "Employee email unavailable") };
}

export const questionText = (question) => clean(question.description) || clean(question.name) || "Untitled question";

export function answerProgress(questions, replies, incrementId) {
  const questionIds = new Set(questions.map((question) => clean(question.id)));
  const answered = new Set(replies.filter((reply) => clean(reply.increment_id) === clean(incrementId) && clean(reply.description) && questionIds.has(clean(reply.question_id)))
    .map((reply) => clean(reply.question_id))).size;
  return { answered, total: questionIds.size, complete: questionIds.size > 0 && answered === questionIds.size };
}

export function requestOverview(records, questions, replies) {
  const questionIds = new Set(questions.map((question) => clean(question.id)));
  const answersByRequest = new Map();
  for (const reply of replies) {
    if (!clean(reply.description) || !questionIds.has(clean(reply.question_id))) continue;
    const id = clean(reply.increment_id);
    if (!answersByRequest.has(id)) answersByRequest.set(id, new Set());
    answersByRequest.get(id).add(clean(reply.question_id));
  }
  const rows = records.map((record) => {
    const answered = answersByRequest.get(clean(record.id))?.size || 0;
    return { record, progress: { answered, total: questionIds.size, complete: questionIds.size > 0 && answered === questionIds.size } };
  });
  const complete = rows.filter((row) => row.progress.complete).length;
  return { rows, total: rows.length, complete, awaiting: rows.length - complete };
}

export function filterRequestRows(rows, completion) {
  if (completion === "complete") return rows.filter((row) => row.progress.complete);
  if (completion === "awaiting") return rows.filter((row) => !row.progress.complete);
  return rows;
}

export function groupAnswers(questions, replies, incrementId) {
  const groups = new Map(questions.map((question) => [clean(question.id), { id: clean(question.id), question, replies: [], missing: false }]));
  for (const reply of replies) {
    if (clean(reply.increment_id) !== clean(incrementId)) continue;
    const key = clean(reply.question_id);
    if (!groups.has(key)) groups.set(key, { id: key, question: null, replies: [], missing: true });
    groups.get(key).replies.push(reply);
  }
  return [...groups.values()];
}

export async function saveRecord(request, module, id, data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || !Object.keys(data).length) throw new Error("There are no changes to save.");
  const result = assertResponse(await request({ action: id ? "update" : "create", module, ...(id ? { id } : {}), data }), "The changes could not be saved.");
  if (!result.id || (id && clean(result.id) !== clean(id))) throw new Error("The gateway did not confirm the saved record. Refresh before retrying.");
  // Read after write to detect hooks that reject or transform submitted fields.
  const verified = await loadPage(request, module, { filters: { id: result.id }, per_page: 1 });
  const record = verified.records.find((item) => clean(item.id) === clean(result.id));
  if (!record || Object.entries(data).some(([key, value]) => clean(record[key]) !== clean(value))) {
    throw new Error("The gateway saved a different result. Refresh and review the record before retrying.");
  }
  return record;
}
