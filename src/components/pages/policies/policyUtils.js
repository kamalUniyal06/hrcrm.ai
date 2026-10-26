// Request bodies, validation and grouping for the SmartGateway `hrc_policies` module.
// Field contract: docs/policies-backend-fields.md.
export const POLICY_MODULE = "hrc_policies";
export const POLICY_FIELDS = ["name", "category", "summary", "description", "version", "effective_date", "status"];
export const POLICY_STATUSES = ["published", "draft"];
const CATEGORY_ORDER = ["Terms", "Privacy", "Conduct", "Time & leave", "Workplace", "Security", "Finance", "Employment"];

const clean = (value) => String(value ?? "").trim();

/** One page of policies, sorted by name on the server. Employees only ask for published ones. */
export function policyListBody({ includeDrafts = false, page = 1 } = {}) {
  return {
    action: "fetch",
    module: POLICY_MODULE,
    ...(includeDrafts ? {} : { filters: { status: "published" } }),
    order_by: "name",
    order_dir: "ASC",
    page,
    per_page: 100,
  };
}

/** The fields to save, validated the same way the backend does. */
export function policyData(values = {}) {
  const data = Object.fromEntries(POLICY_FIELDS.map((field) => [field, field === "description" ? String(values[field] ?? "") : clean(values[field])]));
  if (!data.name) throw new Error("Give the policy a title.");
  if (!data.description.replace(/<[^>]*>|&nbsp;/g, "").trim()) throw new Error("Write the policy before saving it.");
  if (!POLICY_STATUSES.includes(data.status)) data.status = "draft";
  if (data.effective_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.effective_date)) throw new Error("Choose a valid effective date.");
  return data;
}

/** Create or update request for a policy (`values.id` updates). */
export function policySaveBody(values) {
  const data = policyData(values);
  const id = clean(values.id);
  return id ? { action: "update", module: POLICY_MODULE, id, data } : { action: "create", module: POLICY_MODULE, data };
}

/** Policies a viewer may read (employees only see published ones), grouped by category. */
export function groupPolicies(records = [], { includeDrafts = false, search = "" } = {}) {
  const term = clean(search).toLowerCase();
  const visible = records.filter((record) =>
    (includeDrafts || record.status === "published") &&
    (!term || [record.name, record.category, record.summary].some((value) => clean(value).toLowerCase().includes(term))));
  const groups = new Map();
  for (const record of visible) {
    const category = clean(record.category) || "General";
    groups.set(category, [...(groups.get(category) || []), record]);
  }
  const rank = (category) => (CATEGORY_ORDER.includes(category) ? CATEGORY_ORDER.indexOf(category) : CATEGORY_ORDER.length);
  // Categories follow the handbook order; policies keep the server's name order.
  return [...groups]
    .sort(([left], [right]) => rank(left) - rank(right) || left.localeCompare(right))
    .map(([category, items]) => ({ category, items }));
}
