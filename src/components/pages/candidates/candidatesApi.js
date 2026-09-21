import { http } from "../../../services/api";

export const workflowModules = {
  stage: "hrc_stages",
  phase: "hrc_phases",
  status: "hrc_status",
};
export const workflowFields = {
  stage: "stage",
  phase: "hrc_phase_name",
  status: "status",
};

export async function fetchAllRecords(module) {
  const records = [];
  let page = 1;
  let pages = 1;
  do {
    const response = await http({
      method: "POST",
      body: { action: "fetch", module, page, per_page: 100 },
    });
    if (response?.success !== true || !Array.isArray(response.records))
      throw new Error(
        response?.message ||
          response?.error ||
          `Could not load ${module}. Please retry.`,
      );
    records.push(
      ...response.records.filter((record) => String(record.deleted) !== "1"),
    );
    pages =
      Number(response.total_pages) ||
      Math.ceil(Number(response.total) / (Number(response.per_page) || 100)) ||
      1;
    page += 1;
  } while (page <= pages);
  return records;
}

export async function fetchCandidateRecord(id) {
  const response = await http({
    method: "POST",
    body: {
      action: "fetch",
      module: "hrc_candidates",
      filters: { id },
      page: 1,
      per_page: 1,
    },
  });
  if (response?.success !== true || !Array.isArray(response.records))
    throw new Error(response?.message || "Could not load candidate details.");
  const record = response.records.find((record) => record.id === id);
  if (!record)
    throw new Error("This candidate is no longer available. Refresh the list.");
  return record;
}

// Prefer returned foreign keys; otherwise use the candidate field names confirmed for this CRM.
export function workflowField(record, kind) {
  const module = workflowModules[kind];
  const keys = [
    `${kind}_id`,
    `${kind}_id_c`,
    `hrc_${kind}_id_c`,
    `hrc_${kind}_id`,
    `${module}_id_c`,
    `${module}_id`,
  ];
  const key =
    keys.find((key) => Object.hasOwn(record, key)) ||
    Object.keys(record).find(
      (key) => key.startsWith(`${module}_`) && /ida$|idb$/.test(key),
    );
  return key || workflowFields[kind];
}

export function workflowValue(record, kind, options = []) {
  const key = workflowField(record, kind);
  const raw = key ? String(record[key] ?? "") : "";
  if (key && !raw) return "Unassigned";
  const option = options.find(
    (option) => String(option.id) === raw || option.name === raw,
  );
  return (
    option?.name ||
    record[workflowFields[kind]] ||
    record[`${kind}_name`] ||
    raw ||
    "Unassigned"
  );
}

export function optionValue(record, kind, option, options) {
  const key = workflowField(record, kind);
  const current = String(record[key] ?? "");
  // Plain workflow fields can contain names; explicit foreign keys always contain IDs.
  return /id/.test(key || "") ||
    (current && options.some((item) => String(item.id) === current))
    ? String(option.id)
    : option.name;
}

export async function updateCandidateRecord(id, data) {
  if (!id) throw new Error("A candidate ID is required to save changes.");
  if (!Object.keys(data).length) return;
  const response = await http({
    method: "POST",
    body: { action: "update", module: "hrc_candidates", id, data },
  });
  if (response?.success !== true)
    throw new Error(
      response?.message ||
        response?.error ||
        "Could not save candidate. Your changes are still available; please retry.",
    );
}

export const candidateName = (record) =>
  [record.first_name, record.last_name].filter(Boolean).join(" ") ||
  record.full_name ||
  record.name ||
  "Unnamed candidate";

export function workflowUpdate(record, kind, name, options = []) {
  const key = workflowField(record, kind);
  const option = options.find(
    (item) => item.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (option) return { [key]: optionValue(record, kind, option, options) };
  if (
    /id/.test(key) ||
    options.some((item) => String(item.id) === String(record[key]))
  ) {
    throw new Error(
      `The ${name} ${kind} is unavailable. Please configure it in the CRM and refresh.`,
    );
  }
  return { [key]: name };
}

export async function createInterview(data) {
  const response = await http({
    method: "POST",
    body: { action: "create", module: "hrc_interviews", data },
  });
  if (response?.success !== true)
    throw new Error(
      response?.message ||
        response?.error ||
        "Could not save the interview. Please retry.",
    );
  return response;
}

export async function fetchInterviewRecord(id) {
  const response = await http({
    method: "POST",
    body: { action: "fetch", module: "hrc_interviews", filters: { id }, page: 1, per_page: 1 },
  });
  const record = response?.records?.find((item) => String(item.id) === String(id) && String(item.deleted) !== "1");
  if (response?.success !== true || !record)
    throw new Error(response?.message || "This interview is no longer available. Refresh and try again.");
  return record;
}

export async function updateInterview(id, data) {
  if (!id) throw new Error("An interview ID is required.");
  const response = await http({
    method: "POST",
    body: { action: "update", module: "hrc_interviews", id, data },
  });
  if (response?.success !== true)
    throw new Error(response?.message || response?.error || "Could not save the interview. Please retry.");
  return response;
}
