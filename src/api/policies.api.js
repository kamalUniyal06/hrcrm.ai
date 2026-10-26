import he from "he";
import { http } from "../services/api";
import { policyListBody, policySaveBody } from "../components/pages/policies/policyUtils";

const decode = (value) => he.decode(String(value ?? ""));

// The gateway may entity-encode text fields; the page sanitises the decoded HTML before showing it.
const normalize = (record) => ({
  ...record,
  name: decode(record.name),
  category: decode(record.category),
  summary: decode(record.summary),
  description: decode(record.description),
});

/** Every policy the viewer may read. Admins also receive drafts. */
export async function fetchPolicies({ includeDrafts = false } = {}) {
  const records = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await http({ method: "POST", body: policyListBody({ includeDrafts, page }) });
    if (response?.success !== true || !Array.isArray(response.records))
      throw new Error(response?.message || response?.error || "Could not load policies. Please retry.");
    records.push(...response.records.filter((record) => String(record.deleted) !== "1").map(normalize));
    totalPages = Number(response.total_pages) || 1;
    page += 1;
  } while (page <= totalPages);
  return records;
}

/** Creates a policy, or updates it when `values.id` is set. Resolves to the saved policy's id. */
export async function savePolicy(values) {
  const body = policySaveBody(values);
  const response = await http({ method: "POST", body });
  if (response?.success !== true) throw new Error(response?.message || response?.error || "Could not save the policy. Please retry.");
  const id = body.id || response.id || response.record?.id || response.data?.id;
  if (!id) throw new Error("The policy was saved but no ID came back. Refresh to see it.");
  return id;
}
