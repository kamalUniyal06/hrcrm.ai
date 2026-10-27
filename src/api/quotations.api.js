import he from "he";
import { http } from "../services/api";
import { store } from "@/store/store";
import { employeeName } from "../components/pages/employees/employeesApi";
import { QUOTATION_MODULE, quotationListBody, quotationSaveBody } from "../components/pages/quotations/quotationUtils";
import { ACK_MODULE, acknowledgementCreateBody, acknowledgementListBody } from "../components/pages/quotations/quotationAcknowledgements";

const TEXT_FIELDS = ["name", "category", "work_location", "description", "worker_name", "worker_company", "payment_reference", "notes", "admin_id_name", "payment_by_id_name"];

// The gateway may entity-encode text fields.
const normalize = (record) => ({
  ...record,
  ...Object.fromEntries(TEXT_FIELDS.map((field) => [field, he.decode(String(record[field] ?? ""))])),
});

const gateway = async (body, fallbackMessage) => {
  const response = await http({ method: "POST", body });
  if (response?.success !== true) throw new Error(response?.message || response?.error || fallbackMessage);
  return response;
};

// Every page of a fetch request, without deleted records.
async function fetchPages(bodyFor, fallbackMessage) {
  const records = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await gateway(bodyFor(page), fallbackMessage);
    if (!Array.isArray(response.records)) throw new Error(fallbackMessage);
    records.push(...response.records.filter((record) => String(record.deleted) !== "1"));
    totalPages = Number(response.total_pages) || 1;
    page += 1;
  } while (page <= totalPages);
  return records;
}

/** Every quotation whose work date is in `range` ({ from, to }, or null for all), newest first. */
export async function fetchQuotations(range = null) {
  return (await fetchPages((page) => quotationListBody(page, range), "Could not load quotations. Please retry.")).map(normalize);
}

/** Creates a quotation, or updates it when `values.id` is set. Resolves to the saved quotation's id. */
export async function saveQuotation(values) {
  // New quotations record which admin created them.
  const body = quotationSaveBody({ ...values, admin_id: store.getState().user.userInfo?.id });
  const response = await gateway(body, "Could not save the quotation. Please retry.");
  const id = body.id || response.id || response.record?.id || response.data?.id;
  if (!id) throw new Error("The quotation was saved but no ID came back. Refresh to see it.");
  return id;
}

/** Every quotation acknowledgement (`hrc_employee_response` records), oldest first. */
export async function fetchQuotationAcknowledgements() {
  return fetchPages(acknowledgementListBody, "Could not load acknowledgements. Please retry.");
}

/** Records that the signed-in admin has seen a quotation another admin created. */
export async function acknowledgeQuotation(quotation) {
  const response = await gateway(acknowledgementCreateBody(quotation, store.getState().user.userInfo?.id), "Could not acknowledge the quotation. Please retry.");
  return response.id || response.record?.id || response.data?.id || "";
}

/** Deletes a quotation and its acknowledgements. */
export async function deleteQuotation(id) {
  id = String(id ?? "").trim();
  if (!id) throw new Error("A quotation is required.");
  // Acknowledgements go first, so none is left pointing at a deleted quotation.
  const acknowledgements = (await fetchQuotationAcknowledgements()).filter((record) => String(record.alert_id ?? "").trim() === id);
  for (const record of acknowledgements) {
    try {
      await gateway({ action: "delete", module: ACK_MODULE, id: record.id }, "Could not delete an acknowledgement.");
    } catch (error) {
      throw new Error(`The quotation was not deleted because its acknowledgements could not all be removed. Try again. ${error.message}`);
    }
  }
  await gateway({ action: "delete", module: QUOTATION_MODULE, id }, "Could not delete the quotation. Please retry.");
  return id;
}

/** Admins who can create or pay quotations, as { id, name, email }, sorted by first name on the server. */
export async function fetchQuotationAdmins() {
  const records = await fetchPages(
    (page) => ({ action: "fetch", module: "hrc_employees", order_by: "first_name", order_dir: "ASC", page, per_page: 100 }),
    "Could not load admins. Please retry.",
  );
  // An employee's role comes back as the `status_id` relate's name.
  return records
    .filter((record) => String(record.status_id_name ?? "").trim().toLowerCase() === "admin")
    .map((record) => ({ id: record.id, name: employeeName(record), email: String(record.email1 || "").trim() }));
}
