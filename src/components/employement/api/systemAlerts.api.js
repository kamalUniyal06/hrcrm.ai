import { http } from "@/services/api";
import { CRM_ENDPOINT } from "@/services/crmUrl";
import { crmFetch } from "@/services/crmClient";
import { FETCH_GPC_X_API_KEY } from "@/store/constants";
import { queryClient } from "@/lib/queryClient";
import {
  alertPayload,
  diffTargets,
  readAlertStatus,
  readMyAlerts,
  respondErrorKind,
} from "../components/alerts/systemAlertUtils";
import { isQuotationAcknowledgement } from "../../pages/quotations/quotationAcknowledgements";

const ALERT_MODULE = "hrc_system_alert";
const RESPONSE_MODULE = "hrc_employee_response";
const EMPLOYEE_MODULE = "hrc_employees";
const PAGE_SIZE = 100;
const HRC_URL = `${CRM_ENDPOINT}?entryPoint=hrc`;

// Employees read their alerts through my_alerts only, under this one cache key.
export const MY_ALERTS_KEY = ["system-alerts", "mine"];

const clean = (value) => String(value ?? "").trim();

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

const responseAlertId = (record) =>
  String(record.alert_id || "").trim() ||
  String(record.hrc_system_alert_hrc_employee_response_1hrc_system_alert_ida || "").trim();

const gateway = async (body, fallbackMessage) => {
  const response = await http({ method: "POST", body });
  if (response?.success !== true) {
    throw new Error(response?.message || response?.error || fallbackMessage);
  }
  return response;
};

/* ── Employee calls (hrc entry point) ─────────────────────────────────────── */

// The backend reads the employee from the CRM token, so no employee id is sent.
// crmFetch attaches that token and retries once with a fresh one on a 401.
async function hrcAlertCall(type, body = null) {
  if (!FETCH_GPC_X_API_KEY) throw new Error("Alerts are not configured. Please contact your administrator.");
  const response = await crmFetch(`${HRC_URL}&type=${type}`, {
    method: "POST",
    headers: {
      "x-api-key": FETCH_GPC_X_API_KEY,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  // A bad API key comes back as 200 with `status: false` instead of `success`.
  if (!response.ok || data?.success !== true) {
    const error = new Error(data?.message || data?.error || "The alert request failed. Please try again.");
    error.status = response.ok ? 500 : response.status;
    throw error;
  }
  return data;
}

export const fetchMyAlerts = async () => readMyAlerts(await hrcAlertCall("my_alerts"));

// Logout waits only for unanswered alerts that need an answer (acknowledge, yes/no).
// Information alerts never hold it up.
export const ensureSystemAlertsAnswered = async () => {
  let data;
  try {
    data = await fetchMyAlerts();
  } catch (error) {
    // A role without alert access has nothing to answer.
    if (error.status === 403) return;
    throw new Error("Could not check required alerts. Please try logging out again.");
  }
  queryClient.setQueryData(MY_ALERTS_KEY, data);
  const blocking = data.alerts.filter((alert) => alert.blocks_logout);
  if (!blocking.length) return;
  window.dispatchEvent(new CustomEvent("system-alerts-required", { detail: { alerts: blocking } }));
  const error = new Error("Please respond before logging out.");
  error.code = "SYSTEM_ALERTS_REQUIRED";
  throw error;
};

export const respondToAlert = async ({ alert, answer }) => {
  const normalized = clean(answer).toLowerCase();
  if (!alert?.id || !alert.allowed_answers?.includes(normalized)) {
    throw new Error("That answer is not allowed for this alert.");
  }
  try {
    return await hrcAlertCall("alert_respond", { alert_id: alert.id, answer: normalized });
  } catch (error) {
    // A double click or a second tab already saved it.
    if (respondErrorKind(error) === "duplicate") return { success: true, alert_id: alert.id, answer: normalized };
    throw error;
  }
};

// HR only: who responded and who is still pending, out of the alert's targets.
export const fetchAlertStatus = async (alertId) =>
  readAlertStatus(await hrcAlertCall("alert_status", { alert_id: alertId }));

/* ── HR management (generic gateway) ──────────────────────────────────────── */

const LINK_BATCH = 5;

async function linkEmployees(alertId, employeeIds, action) {
  const failed = [];
  for (let index = 0; index < employeeIds.length; index += LINK_BATCH) {
    const batch = employeeIds.slice(index, index + LINK_BATCH);
    const results = await Promise.allSettled(batch.map((employeeId) =>
      gateway(
        { action, module: ALERT_MODULE, id: alertId, related_module: EMPLOYEE_MODULE, related_id: employeeId },
        "Could not update the alert's employees.",
      )));
    results.forEach((result, position) => {
      if (result.status === "rejected") failed.push(batch[position]);
    });
  }
  return failed;
}

export const fetchAlertTargets = async (alertId) => {
  const ids = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = ensureRecords(
      await http({
        method: "POST",
        body: { action: "fetch_related", module: ALERT_MODULE, id: alertId, related_module: EMPLOYEE_MODULE, page, per_page: 200 },
      }),
      "Could not load the alert's employees.",
    );
    ids.push(...response.records.filter((record) => String(record.deleted) !== "1").map((record) => clean(record.id)).filter(Boolean));
    totalPages = Number(response.total_pages) || 1;
    page += 1;
  } while (page <= totalPages);
  return ids;
};

export const createSystemAlert = async (values) => {
  const data = alertPayload(values);
  if (!data.name || !data.description.trim()) throw new Error("An alert title and description are required.");
  const selected = data.audience === "selected";
  const employeeIds = selected ? values.employeeIds || [] : [];
  if (selected && !employeeIds.length) throw new Error("Pick at least one employee.");
  // A targeted alert starts inactive and is switched on once every link exists,
  // so no one it targets can log in before their link is there.
  const created = await gateway(
    { action: "create", module: ALERT_MODULE, data: selected ? { ...data, active: 0 } : data },
    "Could not create the alert.",
  );
  const id = clean(created?.record?.id || created?.data?.id || created?.id || created?.record_id);
  if (!id) throw new Error("The alert was created but its ID was not returned.");
  if (selected) {
    const failed = await linkEmployees(id, employeeIds, "add_relationship");
    if (failed.length) {
      throw new Error(`The alert was saved as inactive because ${failed.length} employee${failed.length === 1 ? "" : "s"} could not be linked. Edit it to retry.`);
    }
    if (data.active) await gateway({ action: "update", module: ALERT_MODULE, id, data: { active: 1 } }, "The alert was saved but could not be switched on. Edit it to turn it on.");
  }
  return { id };
};

export const updateSystemAlert = async ({ id, values, currentTargetIds = [] }) => {
  if (!clean(id)) throw new Error("An alert is required.");
  const data = alertPayload(values);
  if (!data.name || !data.description.trim()) throw new Error("An alert title and description are required.");
  if (data.audience === "selected") {
    // Links change first, while the old audience still applies.
    const { add, remove } = diffTargets(currentTargetIds, values.employeeIds || []);
    const failed = [
      ...await linkEmployees(id, add, "add_relationship"),
      ...await linkEmployees(id, remove, "remove_relationship"),
    ];
    if (failed.length) throw new Error(`${failed.length} employee link${failed.length === 1 ? "" : "s"} could not be updated. Nothing else was changed. Please try again.`);
  }
  await gateway({ action: "update", module: ALERT_MODULE, id, data }, "Could not save the alert.");
  return { id };
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

// HR list: every alert (live or not) with the responses saved against it.
export const fetchSystemAlertResponses = async () => {
  const [alerts, allResponses] = await Promise.all([
    fetchAll(ALERT_MODULE),
    fetchAll(RESPONSE_MODULE),
  ]);
  // The same module also holds quotation acknowledgements; they belong to Quotation alerts.
  const responses = allResponses.filter((record) => !isQuotationAcknowledgement(record));
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
