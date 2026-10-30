import test from "node:test";
import assert from "node:assert/strict";
import {
  acknowledgementCreateBody,
  acknowledgementListBody,
  acknowledgementsByQuotation,
  awaitingAcknowledgement,
  isQuotationAcknowledgement,
  needsAcknowledgement,
} from "./quotationAcknowledgements.js";

const quotation = { id: "q-1", quotation_number: "QT-2610-7K3F", admin_id: "admin-1" };

test("acknowledgements are fetched from hrc_employee_response, filtered and sorted by SmartGateway", () => {
  assert.deepEqual(acknowledgementListBody(2), {
    action: "fetch",
    module: "hrc_employee_response",
    filters: { description: "acknowledged" },
    order_by: "date_entered",
    order_dir: "ASC",
    page: 2,
    per_page: 100,
  });
});

test("an acknowledgement records the quotation and the admin", () => {
  assert.deepEqual(acknowledgementCreateBody(quotation, "admin-2"), {
    action: "create",
    module: "hrc_employee_response",
    data: { name: "Quotation acknowledged: QT-2610-7K3F", description: "acknowledged", alert_id: "q-1", employee_id: "admin-2" },
  });
  assert.throws(() => acknowledgementCreateBody(quotation, ""), /employee ID/);
  assert.throws(() => acknowledgementCreateBody(quotation, "admin-1"), /You created/);
  assert.throws(() => acknowledgementCreateBody({}, "admin-2"), /quotation is required/);
});

test("system-alert answers are not quotation acknowledgements", () => {
  assert.equal(isQuotationAcknowledgement({ name: "Office closed on Friday", description: "acknowledged", alert_id: "a-1" }), false);
  assert.equal(isQuotationAcknowledgement({ description: "acknowledged", alert_id: "a-1" }), false);
  assert.equal(isQuotationAcknowledgement({ name: "Quotation acknowledged: QT-2610-7K3F", description: "acknowledged", alert_id: "q-1" }), true);
});

test("acknowledgements are grouped per quotation, once per admin, and decide who still has to acknowledge", () => {
  const names = new Map([["admin-2", "Priya Mehta"], ["admin-3", "Arjun Rao"]]);
  const acks = acknowledgementsByQuotation([
    { alert_id: "q-1", employee_id: "admin-2", name: "Quotation acknowledged: QT-1", description: "acknowledged", date_entered: "2026-10-27 10:00:00" },
    { alert_id: "q-1", employee_id: "admin-2", name: "Quotation acknowledged: QT-1", description: "acknowledged", date_entered: "2026-10-27 10:01:00" },
    { alert_id: "q-1", employee_id: "admin-3", employee_id_name: "Arjun R.", name: "Quotation acknowledged: QT-1", description: "acknowledged" },
    { alert_id: "a-9", employee_id: "admin-3", name: "Holiday notice", description: "acknowledged" },
  ], names);
  assert.deepEqual(acks.get("q-1"), [
    { employeeId: "admin-2", name: "Priya Mehta", at: "2026-10-27 10:00:00" },
    { employeeId: "admin-3", name: "Arjun R.", at: "" },
  ]);
  assert.equal(acks.has("a-9"), false, "a system-alert answer is not an acknowledgement");

  assert.equal(needsAcknowledgement(quotation, acks, "admin-1"), false, "the creator never acknowledges");
  assert.equal(needsAcknowledgement(quotation, acks, "admin-2"), false);
  assert.equal(needsAcknowledgement(quotation, acks, "admin-4"), true);
  assert.equal(needsAcknowledgement(quotation, acks, ""), false);

  const admins = ["admin-1", "admin-2", "admin-3", "admin-4"].map((id) => ({ id, name: id }));
  assert.deepEqual(awaitingAcknowledgement(quotation, acks, admins).map((admin) => admin.id), ["admin-4"]);
});
