import { http } from "@/services/api";
import { INCREMENT_MODULES, loadAll, loadFields, loadPage, requireReplyLinks, saveRecord } from "./incrementAdminData";

const request = (body) => http({ method: "POST", body });

export async function fetchIncrementSchema() {
  const entries = await Promise.all(Object.entries(INCREMENT_MODULES).map(async ([key, module]) => [key, await loadFields(request, module)]));
  const schema = Object.fromEntries(entries);
  requireReplyLinks(schema.replies);
  return schema;
}

export const fetchAdminQuestions = () => loadAll(request, INCREMENT_MODULES.questions, { order_dir: "ASC" });

export async function fetchAdminRequests({ page, search, from, to }) {
  const response = await loadPage(request, INCREMENT_MODULES.requests, {
    page,
    ...(search ? { search, search_fields: ["name"] } : {}),
    ...(from || to ? { date_range: "custom", date_field: "date_entered", date_from: from, date_to: to } : {}),
  });
  const ids = response.records.map((record) => record.id).filter(Boolean);
  // An empty IN filter is ignored by the gateway, so do not send it.
  const replies = ids.length ? await loadAll(request, INCREMENT_MODULES.replies, {
    filters: { increment_id: { in: ids } },
    fields: ["id", "increment_id", "question_id", "description"],
  }) : [];
  return { ...response, replies: replies.filter((reply) => ids.includes(reply.increment_id)) };
}

export const fetchAdminReplies = (id) => {
  if (!id) throw new Error("Select an increment request first.");
  return loadAll(request, INCREMENT_MODULES.replies, { filters: { increment_id: id }, order_dir: "ASC" });
};

export const fetchAdminRequest = async (id) => {
  if (!id) throw new Error("An increment ID is required.");
  const response = await loadPage(request, INCREMENT_MODULES.requests, { filters: { id }, per_page: 1 });
  const record = response.records.find((record) => record.id === id);
  if (!record) throw new Error("This request is no longer available. Return to the request list and refresh.");
  return record;
};

export const saveAdminQuestion = (id, { name, description }) => {
  if (!name.trim() || !description.trim()) throw new Error("Enter a title and question text.");
  return saveRecord(request, INCREMENT_MODULES.questions, id, { name: name.trim(), description: description.trim() });
};
