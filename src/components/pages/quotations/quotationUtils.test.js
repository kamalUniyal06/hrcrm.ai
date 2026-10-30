import test from "node:test";
import assert from "node:assert/strict";
import {
  amountInWords,
  daysOutstanding,
  filterQuotations,
  inPeriod,
  periodRange,
  newQuotationNumber,
  quotationData,
  quotationDate,
  quotationListBody,
  quotationPeople,
  quotationSaveBody,
  quotationSummary,
} from "./quotationUtils.js";

const now = new Date(2026, 9, 27);
const base = { name: "Light fixing", worker_name: "Ramesh Kumar", worker_phone: "+91 98765 43210", amount: "4,500" };

test("the list is sorted newest first by SmartGateway, which also applies the time filter", () => {
  assert.deepEqual(quotationListBody(2), { action: "fetch", module: "hrc_quotations", order_by: "date_entered", order_dir: "DESC", page: 2, per_page: 100 });
  assert.deepEqual(quotationListBody(1, { from: "2026-10-01", to: "2026-10-31" }), {
    action: "fetch",
    module: "hrc_quotations",
    date_range: "custom",
    date_field: "work_date",
    date_from: "2026-10-01",
    date_to: "2026-10-31",
    order_by: "date_entered",
    order_dir: "DESC",
    page: 1,
    per_page: 100,
  });
});

test("time periods cover whole months and years", () => {
  assert.equal(periodRange("all", now), null);
  assert.deepEqual(periodRange("this_month", now), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(periodRange("last_month", now), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(periodRange("last_3_months", now), { from: "2026-08-01", to: "2026-10-31" });
  assert.deepEqual(periodRange("this_year", now), { from: "2026-01-01", to: "2026-12-31" });
  assert.deepEqual(periodRange("last_month", new Date(2026, 0, 15)), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(periodRange("custom", now, { from: "2026-10-20", to: "2026-10-01" }), { from: "2026-10-01", to: "2026-10-20" });
  assert.deepEqual(periodRange("custom", now, { from: "2026-10-20" }), { from: "2026-10-20", to: "9999-12-31" });
  assert.equal(periodRange("custom", now, {}), null);
  const range = periodRange("this_month", now);
  assert.equal(inPeriod({ work_date: "2026-10-05" }, range), true);
  assert.equal(inPeriod({ work_date: "2026-09-30" }, range), false);
  assert.equal(inPeriod({ date_entered: "2026-10-02 09:30:00" }, range), true);
  assert.equal(inPeriod({}, null), true);
});

test("quotation numbers carry the year and month", () => {
  assert.equal(newQuotationNumber(now, () => 0), "QT-2610-2222");
  assert.match(newQuotationNumber(now), /^QT-2610-[2-9A-Z]{4}$/);
});

test("saving creates without an id and updates with one, sending only module fields", () => {
  const body = quotationSaveBody({ ...base, quotation_number: "QT-2610-ABCD", date_modified: "x", admin_id: "emp-9" }, now);
  assert.equal(body.action, "create");
  assert.equal(body.data.admin_id, "emp-9");
  assert.throws(() => quotationSaveBody(base, now), /employee ID/);
  assert.equal(body.data.amount, "4500");
  assert.equal(body.data.payment_status, "unpaid");
  assert.equal(Object.hasOwn(body.data, "date_modified"), false);
  const update = quotationSaveBody({ ...base, id: "q-1", quotation_number: "QT-2610-ABCD", admin_id: "emp-2" }, now);
  assert.equal(update.action, "update");
  assert.equal(Object.hasOwn(update.data, "admin_id"), false, "edits keep the original creator");
  assert.equal(update.id, "q-1");
  assert.equal(update.data.quotation_number, "QT-2610-ABCD");
});

test("validation", () => {
  assert.throws(() => quotationData({ ...base, name: "" }), /title/);
  assert.throws(() => quotationData({ ...base, worker_name: " " }), /worker/);
  assert.throws(() => quotationData({ ...base, worker_phone: "call me" }), /contact number/);
  assert.throws(() => quotationData({ ...base, amount: "0" }), /greater than zero/);
  assert.throws(() => quotationData({ ...base, amount: "abc" }), /greater than zero/);
  assert.throws(() => quotationData({ ...base, payment_status: "paid" }), /how it was paid/);
  assert.throws(() => quotationData({ ...base, payment_status: "paid", payment_method: "UPI" }), /who made the payment/);
  const paid = quotationData({ ...base, payment_status: "paid", payment_method: "UPI", payment_by_id: "admin-1" }, now);
  assert.deepEqual([paid.paid_on, paid.payment_by_id], ["2026-10-27", "admin-1"]);
  const unpaid = quotationData({ ...base, payment_method: "UPI", paid_on: "2026-10-01", payment_reference: "123", payment_by_id: "admin-1" }, now);
  assert.deepEqual([unpaid.payment_method, unpaid.paid_on, unpaid.payment_reference, unpaid.payment_by_id], ["", "", "", ""]);
  assert.ok(unpaid.quotation_number.startsWith("QT-2610-"));
});

test("creator and payer names come from the gateway's relate names, else the admin list", () => {
  const names = new Map([["admin-1", "Priya Mehta"], ["admin-2", "Arjun Rao"]]);
  assert.deepEqual(quotationPeople({ admin_id: "admin-1", payment_status: "paid", payment_by_id: "admin-2" }, names), { createdBy: "Priya Mehta", paidBy: "Arjun Rao" });
  assert.deepEqual(quotationPeople({ admin_id: "admin-1", admin_id_name: "Priya M.", payment_by_id: "admin-2" }, names), { createdBy: "Priya M.", paidBy: "" });
  assert.deepEqual(quotationPeople({ admin_id: "gone", payment_status: "paid", payment_by_id: "", payment_by_id_name: "Arjun" }, names), { createdBy: "", paidBy: "Arjun" });
});

test("summary, filters and ageing", () => {
  const records = [
    { id: "1", name: "Wiring", worker_name: "Ramesh", amount: "1200.50", payment_status: "unpaid", work_date: "2026-10-20" },
    { id: "2", name: "Tap repair", worker_name: "Suresh", amount: "800", payment_status: "paid", paid_on: "2026-10-05" },
    { id: "3", name: "Painting", worker_name: "Mahesh", amount: "5000", payment_status: "Paid", paid_on: "2026-09-30" },
  ];
  assert.deepEqual(quotationSummary(records, "2026-10"), { count: 3, billed: 7000.5, paid: 5800, outstanding: 1200.5, paidCount: 2, unpaidCount: 1, paidThisMonth: 800 });
  assert.deepEqual(filterQuotations(records, { status: "paid" }).map((record) => record.id), ["2", "3"]);
  assert.deepEqual(filterQuotations(records, { status: "unpaid", search: "ramesh" }).map((record) => record.id), ["1"]);
  assert.equal(daysOutstanding(records[0], now), 7);
  assert.equal(quotationDate({ date_entered: "2026-10-02 09:30:00" }), "2026-10-02");
  assert.equal(daysOutstanding({}, now), null);
});

test("amounts in words follow the Indian system", () => {
  assert.equal(amountInWords(4500), "Rupees Four Thousand Five Hundred Only");
  assert.equal(amountInWords(125000.5), "Rupees One Lakh Twenty Five Thousand and Fifty Paise Only");
  assert.equal(amountInWords(21000000), "Rupees Two Crore Ten Lakh Only");
  assert.equal(amountInWords(0), "Rupees Zero Only");
});
