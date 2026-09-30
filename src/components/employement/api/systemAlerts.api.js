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
  String(
    record.alert_id ||
    record.hrc_system_alert_hrc_employee_response_1hrc_system_alert_ida ||
    "",
  ).trim();

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
