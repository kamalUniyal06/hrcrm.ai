import { http } from "@/services/api";
import { INCREMENT_FIELDS, INCREMENT_MODULES, loadAll, loadPage, loadRequestCollection, saveRecord } from "./incrementAdminData";

const request = (body) => http({ method: "POST", body });

export const fetchAdminQuestions = () => loadAll(request, INCREMENT_MODULES.questions, { order_dir: "ASC" });

export const fetchAdminRequests = (options) => loadRequestCollection(request, options);

// Newest first, like the attendance detail: the gateway filters on the employee email.
export const fetchAdminRequestsByEmail = (email) => {
  if (!email) throw new Error("An employee email is required.");
  return loadAll(request, INCREMENT_MODULES.requests, { filters: { [INCREMENT_FIELDS.requests.employeeEmail]: email } });
};

export const fetchAdminReplies = (id) => {
  if (!id) throw new Error("Select an increment request first.");
  return loadAll(request, INCREMENT_MODULES.replies, { filters: { [INCREMENT_FIELDS.replies.incrementId]: id }, order_dir: "ASC" });
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
  return saveRecord(request, INCREMENT_MODULES.questions, id, {
    [INCREMENT_FIELDS.questions.title]: name.trim(),
    [INCREMENT_FIELDS.questions.text]: description.trim(),
  });
};
