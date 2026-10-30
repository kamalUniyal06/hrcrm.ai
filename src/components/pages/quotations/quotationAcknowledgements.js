// Admins acknowledge quotations created by other admins. Each acknowledgement is one
// `hrc_employee_response` record whose `alert_id` holds the quotation id. The backend only
// accepts system-alert answers as the description, so it is "acknowledged" like an alert
// answer; the `name` prefix is what tells the two apart.
// Field contract: docs/quotations-backend-fields.md.
export const ACK_MODULE = "hrc_employee_response";
export const ACK_ANSWER = "acknowledged";
export const ACK_NAME_PREFIX = "Quotation acknowledged: ";

const clean = (value) => String(value ?? "").trim();

/** True for a response that acknowledges a quotation rather than answering a system alert. */
export const isQuotationAcknowledgement = (record) =>
  clean(record?.name).toLowerCase().startsWith(ACK_NAME_PREFIX.trim().toLowerCase());

/** One page of "acknowledged" responses, oldest first, filtered and sorted by SmartGateway. Alert answers are dropped later. */
export function acknowledgementListBody(page = 1) {
  return { action: "fetch", module: ACK_MODULE, filters: { description: ACK_ANSWER }, order_by: "date_entered", order_dir: "ASC", page, per_page: 100 };
}

/** Create request recording that `employeeId` (an admin) acknowledged `quotation`. */
export function acknowledgementCreateBody(quotation, employeeId) {
  const quotationId = clean(quotation?.id);
  const adminId = clean(employeeId);
  if (!quotationId) throw new Error("A quotation is required.");
  if (!adminId) throw new Error("Your session has no employee ID. Sign in again, then acknowledge the quotation.");
  if (clean(quotation.admin_id) === adminId) throw new Error("You created this quotation, so there is nothing to acknowledge.");
  return {
    action: "create",
    module: ACK_MODULE,
    data: {
      name: `${ACK_NAME_PREFIX}${clean(quotation.quotation_number) || quotationId}`,
      description: ACK_ANSWER,
      alert_id: quotationId,
      employee_id: adminId,
    },
  };
}

/**
 * Acknowledgements grouped by quotation id: [{ employeeId, name, at }] in the order they came in,
 * one per admin. Names come from the gateway's `employee_id_name`, else from `nameById`.
 */
export function acknowledgementsByQuotation(records = [], nameById = new Map()) {
  const groups = new Map();
  for (const record of records) {
    const quotationId = clean(record.alert_id);
    const employeeId = clean(record.employee_id);
    if (!quotationId || !employeeId || !isQuotationAcknowledgement(record)) continue;
    const list = groups.get(quotationId) || [];
    if (list.some((ack) => ack.employeeId === employeeId)) continue;
    list.push({ employeeId, name: clean(record.employee_id_name) || clean(nameById.get(employeeId)), at: clean(record.date_entered) });
    groups.set(quotationId, list);
  }
  return groups;
}

/** Whether `employeeId` still has to acknowledge this quotation (it was created by someone else). */
export function needsAcknowledgement(quotation, acks = new Map(), employeeId = "") {
  const me = clean(employeeId);
  if (!me || !clean(quotation?.id) || clean(quotation.admin_id) === me) return false;
  return !(acks.get(clean(quotation.id)) || []).some((ack) => ack.employeeId === me);
}

/** Admins (other than the creator) who haven't acknowledged the quotation yet. */
export function awaitingAcknowledgement(quotation, acks = new Map(), admins = []) {
  const done = new Set((acks.get(clean(quotation?.id)) || []).map((ack) => ack.employeeId));
  return admins.filter((admin) => admin.id !== clean(quotation?.admin_id) && !done.has(admin.id));
}
