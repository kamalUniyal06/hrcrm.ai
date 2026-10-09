export const candidatePageSize = 20;
export const shortlistedCandidatesKey = ["candidates", "list", "shortlisted"];

export function buildCandidateListRequest({
  page = 1,
  orderBy = "date_entered",
  orderDir = "DESC",
  shortlistedOnly = false,
} = {}) {
  return {
    action: "fetch",
    module: "hrc_candidates",
    filters: {
      employee: 0,
      ...(shortlistedOnly ? { hrc_stages_id_c_name: "Shortlisted" } : {
        // Filter before pagination so totals only include assigned candidates.
        hrc_stages_id_c: { nin: ["", "Unassigned"] },
        hrc_phase_id: { nin: ["", "Unassigned"] },
        hrc_status_id_c: { nin: ["", "Unassigned"] },
      }),
    },
    order_by: orderBy,
    order_dir: orderDir,
    page,
    per_page: candidatePageSize,
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
  return { records: response.records, total, page, perPage, pages };
}

/** Request the same server-filtered shortlist for the list and assessment selectors. */
export async function loadShortlistSource(request) {
  const records = [];
  let page = 1;
  let pages = 1;
  do {
    const result = await loadCandidatePage(request, { page, shortlistedOnly: true });
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
