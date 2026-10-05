/** Table-view catalog from SmartGateway, independent of sidebar navigation. */
export const DEFAULT_VIEW_KEY = "table";
export const viewId = (moduleKey, viewKey) => `${moduleKey}:${viewKey}`;

/** Keep hidden tables editable, but never infer routing keys from labels or IDs. */
function collectTableViews(records, modules) {
  const moduleKeys = new Map(
    modules.map((module) => [module.id, module.definition_key?.trim()]),
  );
  const seen = new Map();
  for (const record of records) {
    if (
      String(record.view_type ?? "")
        .trim()
        .toLowerCase() !== "table"
    )
      continue;
    const moduleKey = moduleKeys.get(record.ui_module_id);
    const viewKey =
      typeof record.view_key === "string" ? record.view_key.trim() : "";
    if (!moduleKey || !viewKey) continue;
    const id = viewId(moduleKey, viewKey);
    if (seen.has(id)) continue;
    seen.set(id, {
      id,
      moduleKey,
      viewKey,
      label: record.name?.trim() || moduleKey,
      active: ![false, 0, "0", "false"].includes(record.is_active),
      groupName: "Table views",
    });
  }
  return [...seen.values()];
}

/** Read a metadata catalog in bulk, never a request per record. */
async function fetchCatalog(fetchPage, options) {
  const records = [];
  const seen = new Set();
  for (let page = 1; ; page += 1) {
    const response = await fetchPage({
      action: "fetch",
      ...options,
      // SmartGateway accepts one field and a separate direction. A unique
      // sort key prevents equal names/dates from overlapping across pages.
      order_by: "id",
      order_dir: "ASC",
      page,
      per_page: 50,
    });
    if (response?.success !== true || !Array.isArray(response.records)) {
      throw new Error(
        response?.error ||
          "The table view list could not be loaded. Try Reload.",
      );
    }
    const batch = response.records;
    if (!batch.length) break;
    const fresh = batch.filter((record) => !seen.has(record.id));
    if (!fresh.length)
      throw new Error(
        "The table view list returned a repeated page. Try Reload.",
      );
    fresh.forEach((record) => seen.add(record.id));
    records.push(...fresh);
    const totalPages = Number(
      response.pagination?.total_pages ??
        response.pagination?.totalPages ??
        response.total_pages,
    );
    const totalRecords = Number(
      response.total ??
        response.total_records ??
        response.pagination?.total_records ??
        response.pagination?.totalRecords,
    );
    const pageSize =
      Number(
        response.per_page ??
          response.pagination?.per_page ??
          response.pagination?.pageSize,
      ) || 50;
    if (
      totalPages > 0
        ? page >= totalPages
        : Number.isFinite(totalRecords)
          ? records.length >= totalRecords
          : batch.length < pageSize
    )
      break;
  }
  return records;
}

/** Views reference ui_module_id; modules supply the actual definition_key.
 * Two bulk catalog reads replace all per-view discovery requests.
 */
export async function loadTableViewRegistry(fetchPage) {
  const records = await fetchCatalog(fetchPage, {
    module: "outr_ui_views",
    filters: { view_type: "table" },
  });
  if (!records.length) return { views: [] };
  const modules = await fetchCatalog(fetchPage, {
    module: "outr_ui_modules",
  });

  return { views: collectTableViews(records, modules) };
}

export function groupTableViews(views) {
  return views?.length ? [{ groupName: "Table views", views }] : [];
}
