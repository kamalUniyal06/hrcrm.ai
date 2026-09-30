import { http } from "@/services/api";

const ALERT_MODULE = "hrc_system_alert";
const RESPONSE_MODULE = "hrc_employee_response";
const PAGE_SIZE = 100;

const ensureRecords = (response, fallbackMessage) => {
  if (response?.success !== true || !Array.isArray(response.records)) {
    throw new Error(response?.message || response?.error || fallbackMessage);
  }

  return response;
};

const fetchAll = async (module, filters = {}) => {
  const records = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = ensureRecords(
      await http({
        method: "POST",
        body: { action: "fetch", module, filters, page, per_page: PAGE_SIZE },
      }),
      `Could not load ${module}.`,
    );

    records.push(
      ...response.records.filter((record) => String(record.deleted) !== "1"),
    );
    totalPages =
      Number(response.total_pages) ||
      Math.ceil(Number(response.total) / (Number(response.per_page) || PAGE_SIZE)) ||
      1;
    page += 1;
  } while (page <= totalPages);

  return records;
};

const responseEmployeeId = (record) =>
  String(
    record.employee_id ||
    record.hrc_employees_hrc_employee_response_1hrc_employees_ida ||
    "",
  ).trim();

const responseAlertId = (record) =>
  String(record.alert_id || "").trim() ||
  String(record.hrc_system_alert_hrc_employee_response_1hrc_system_alert_ida || "").trim();

export const createSystemAlert = async ({ name, description }) => {
  name = String(name || "").trim();
  description = String(description || "").trim();
  if (!name || !description) throw new Error("An alert title and description are required.");
  const response = await http({
    method: "POST",
    body: { action: "create", module: ALERT_MODULE, data: { name, description } },
  });
  if (response?.success !== true) {
    throw new Error(response?.message || response?.error || "Could not create the alert.");
  }
  return response;
};

export const deleteSystemAlert = async (id) => {
  id = String(id || "").trim();
  if (!id) throw new Error("An alert is required.");
  // Finish pagination before deleting so shrinking pages cannot skip responses.
  const responses = (await fetchAll(RESPONSE_MODULE)).filter(
    (record) => responseAlertId(record) === id,
  );
  for (const record of responses) {
    try {
      if (!String(record.id || "").trim()) throw new Error("A response ID is missing.");
      const result = await http({
        method: "POST",
        body: { action: "delete", module: RESPONSE_MODULE, id: record.id },
      });
      if (result?.success !== true) {
        throw new Error(result?.message || result?.error || "Could not delete a response.");
      }
    } catch (error) {
      throw new Error(`Response cleanup stopped. The alert has not been deleted; some responses may already be removed. Retry to finish. ${error.message}`);
    }
  }
  const response = await http({ method: "POST", body: { action: "delete", module: ALERT_MODULE, id } });
  if (response?.success !== true) {
    throw new Error(response?.message || response?.error || "Could not delete the alert.");
  }
  return response;
};

export const fetchSystemAlertResponses = async () => {
  const [alerts, responses] = await Promise.all([
    fetchAll(ALERT_MODULE),
    fetchAll(RESPONSE_MODULE),
  ]);
  const groups = new Map(alerts.map((alert) => [String(alert.id).trim(), { alert, responses: [] }]));
  for (const response of responses) {
    const id = responseAlertId(response);
    if (!groups.has(id)) {
      groups.set(id, { alert: { id, unavailable: true, name: id ? "Responses to a removed or unavailable alert" : "Responses without an alert" }, responses: [] });
    }
    groups.get(id).responses.push(response);
  }
  return [...groups.values()];
};

export const fetchPendingSystemAlerts = async (employeeId) => {
  const normalizedEmployeeId = String(employeeId || "").trim();
  if (!normalizedEmployeeId) return [];

  const [alerts, responses] = await Promise.all([
    fetchAll(ALERT_MODULE),
    fetchAll(RESPONSE_MODULE, { employee_id: normalizedEmployeeId }),
  ]);

  const answeredAlertIds = new Set(
    responses
      .filter(
        (response) =>
          !responseEmployeeId(response) ||
          responseEmployeeId(response) === normalizedEmployeeId,
      )
      .map(responseAlertId)
      .filter(Boolean),
  );

  return alerts.filter((alert) => !answeredAlertIds.has(String(alert.id)));
};

export const ensureSystemAlertsAnswered = async (employeeId) => {
  if (!employeeId) return;
  let pending;
  try {
    pending = await fetchPendingSystemAlerts(employeeId);
  } catch {
    throw new Error("Could not check required alerts. Please try logging out again.");
  }
  if (pending.length) {
    window.dispatchEvent(new CustomEvent("system-alerts-required", { detail: { employeeId, alerts: pending } }));
    const error = new Error("Please give your response here before logging out.");
    error.code = "SYSTEM_ALERTS_REQUIRED";
    throw error;
  }
};

export const createSystemAlertResponse = async ({
  email,
  employeeId,
  alertId,
  answer,
}) => {
  console.log("employeeId", employeeId)
  console.log("alertId", alertId)
  console.log("answer", answer)
  if (!employeeId || !alertId || !["yes", "no"].includes(answer)) {
    throw new Error("A valid employee, alert, and response are required.");
  }

  const response = await http({
    method: "POST",
    body: {
      action: "create",
      module: RESPONSE_MODULE,
      data: {
        name: email,
        employee_id: employeeId,
        alert_id: alertId,
        description: answer,
      },
    },
  });

  if (response?.success !== true) {
    throw new Error(
      response?.message || response?.error || "Could not save your response.",
    );
  }

  return response;
};
