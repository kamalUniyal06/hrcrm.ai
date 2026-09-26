import { http } from "@/services/api";

const RESIGNATION_MODULE = "hrc_resignation";

const assertSuccess = (response, fallbackMessage) => {
  if (response?.success !== true) {
    throw new Error(response?.message || response?.error || fallbackMessage);
  }

  return response;
};

export const getResignationByEmail = async (email) => {
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) throw new Error("An employee email is required.");

  const response = assertSuccess(
    await http({
      method: "POST",
      body: {
        action: "fetch",
        module: RESIGNATION_MODULE,
        filters: { name: normalizedEmail },
        page: 1,
        per_page: 1,
      },
    }),
    "Could not load the resignation request.",
  );

  return Array.isArray(response.records) ? response.records[0] ?? null : null;
};

export const ensureResignationRecord = async (email) => {
  const existing = await getResignationByEmail(email);
  if (existing) return existing;

  const normalizedEmail = String(email || "").trim();
  const response = assertSuccess(
    await http({
      method: "POST",
      body: {
        action: "create",
        module: RESIGNATION_MODULE,
        data: { name: normalizedEmail },
      },
    }),
    "Could not create the resignation request.",
  );

  // Smart Gateway create responses may contain either the complete record or
  // only its id. Fetch once more so token fields always come from the server.
  if (response.record?.id && response.record.lbl_tl_token) return response.record;
  const created = await getResignationByEmail(normalizedEmail);
  if (!created) throw new Error("The resignation request was created but could not be loaded.");
  return created;
};

export const updateResignationRecord = async (id, data) => {
  if (!id) throw new Error("A resignation request ID is required.");

  return assertSuccess(
    await http({
      method: "POST",
      body: { action: "update", module: RESIGNATION_MODULE, id, data },
    }),
    "Could not update the resignation request.",
  );
};
