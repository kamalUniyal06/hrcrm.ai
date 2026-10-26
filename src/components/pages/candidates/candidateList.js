export const candidatePageSize = 20;
export const shortlistedCandidatesKey = ["candidates", "list", "shortlisted"];
export const workflowFilterFields = { stage: "hrc_stages_id_c", phase: "hrc_phase_id", status: "hrc_status_id_c" };
export const candidateSearchFields = ["first_name", "last_name", "phone_mobile", "current_designation", "title", "department"];

const clean = (value) => String(value ?? "").trim();

export function buildCandidateListRequest({
  page = 1,
  perPage = candidatePageSize,
  orderBy = "date_entered",
  orderDir = "DESC",
  shortlistedOnly = false,
  dateRange = null,
  search = "",
  workflow = {},
  source = "",
} = {}) {
  const term = clean(search);
  return {
    action: "fetch",
    module: "hrc_candidates",
    filters: {
      employee: 0,
      ...(shortlistedOnly ? { hrc_stages_id_c_name: "Shortlisted" } : {
        // Filter before pagination so totals only include assigned candidates;
        // a chosen workflow ID is already assigned, so it replaces the exclusion.
        ...Object.fromEntries(Object.entries(workflowFilterFields).map(([kind, field]) =>
          [field, clean(workflow?.[kind]) || { nin: ["", "Unassigned"] }])),
        ...(clean(source) ? { candidate_source: clean(source) } : {}),
        // email1 is not a candidate column; the gateway matches it exactly through the email tables.
        ...(term.includes("@") ? { email1: term } : {}),
      }),
    },
    ...(!shortlistedOnly && term && !term.includes("@") ? { search: term, search_fields: candidateSearchFields } : {}),
    order_by: orderBy,
    order_dir: orderDir,
    ...(dateRange?.fromDate && dateRange?.toDate ? {
      date_range: "custom",
      date_field: "date_entered",
      date_from: `${dateRange.fromDate} ${dateRange.fromTime || "00:00"}:00`,
      date_to: `${dateRange.toDate} ${dateRange.toTime || "23:59"}:59`,
    } : {}),
    page,
    per_page: perPage,
  };
}

/** Fetch only the requested page; counts and page boundaries come from the API. */
export async function loadCandidatePage(request, options) {
  const body = buildCandidateListRequest(options);
  const response = await request(body);
  if (response?.success !== true || !Array.isArray(response.records)) {
    throw new Error(response?.error || response?.message || "Could not load candidates. Please retry.");
  }

  const pagination = response.pagination || {};
  const total = Number(response.total ?? response.total_records ?? pagination.total ?? pagination.total_records);
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("The candidate list did not return a valid total. Please retry.");
  }
  const perPage = Number(response.per_page ?? pagination.per_page) || candidatePageSize;
  const page = Number(response.page ?? pagination.page) || body.page;
  const pages = Math.max(1, Number(response.total_pages ?? pagination.total_pages) || Math.ceil(total / perPage));
  return { records: response.records, total, page, perPage, pages, dropdownLists: response.dropdown_lists || {} };
}

/** Request the same server-filtered shortlist for the list and assessment selectors. */
export async function loadShortlistSource(request, { dateRange = null, orderBy, orderDir } = {}) {
  const records = [];
  let page = 1;
  let pages = 1;
  do {
    const result = await loadCandidatePage(request, { page, shortlistedOnly: true, dateRange, orderBy, orderDir });
    const active = result.records.filter((record) => String(record.deleted) !== "1");
    if (active.some((record) =>
      !(record.employee === false || String(record.employee ?? "").trim() === "0") ||
      String(record.hrc_stages_id_c_name ?? "").trim().toLowerCase() !== "shortlisted"
    )) {
      throw new Error("The shortlist includes ineligible candidates. Please refresh or contact your administrator.");
    }
    records.push(...active);
    pages = result.pages;
    page += 1;
  } while (page <= pages);
  return records;
}
