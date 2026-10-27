// Request bodies, validation and totals for the SmartGateway `hrc_quotations` module:
// quotations for maintenance work done at the office (electrical, plumbing, repairs…).
// Field contract: docs/quotations-backend-fields.md.
export const QUOTATION_MODULE = "hrc_quotations";
export const QUOTATION_FIELDS = [
  "name",
  "quotation_number",
  "category",
  "work_date",
  "work_location",
  "description",
  "worker_name",
  "worker_company",
  "worker_phone",
  "amount",
  "payment_status",
  "payment_method",
  "paid_on",
  "payment_reference",
  "payment_by_id",
  "notes",
];
export const PAYMENT_STATUSES = ["unpaid", "paid"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Bank transfer", "Cheque", "Card", "Other"];
export const WORK_CATEGORIES = ["Electrical", "Plumbing", "Carpentry", "Painting", "Civil work", "Cleaning", "IT & network", "AC & appliances", "Other"];

const clean = (value) => String(value ?? "").trim();
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const todayKey = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export const TIME_PERIODS = [
  ["all", "All time"],
  ["this_month", "This month"],
  ["last_month", "Last month"],
  ["last_3_months", "Last 3 months"],
  ["this_year", "This year"],
  ["custom", "Custom"],
];

/** The { from, to } work dates (inclusive, YYYY-MM-DD) a period covers, or null for all time. */
export function periodRange(period, now = new Date(), custom = {}) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = (y, m, d) => todayKey(new Date(y, m, d));
  switch (period) {
    case "this_month": return { from: day(year, month, 1), to: day(year, month + 1, 0) };
    case "last_month": return { from: day(year, month - 1, 1), to: day(year, month, 0) };
    case "last_3_months": return { from: day(year, month - 2, 1), to: day(year, month + 1, 0) };
    case "this_year": return { from: day(year, 0, 1), to: day(year, 11, 31) };
    case "custom": {
      const from = DATE.test(clean(custom.from)) ? clean(custom.from) : "";
      const to = DATE.test(clean(custom.to)) ? clean(custom.to) : "";
      if (!from && !to) return null;
      return from && to && from > to ? { from: to, to: from } : { from: from || "0000-01-01", to: to || "9999-12-31" };
    }
    default: return null;
  }
}

/** One page of quotations, newest first, sorted (and limited to `range` of work dates) by SmartGateway. */
export function quotationListBody(page = 1, range = null) {
  return {
    action: "fetch",
    module: QUOTATION_MODULE,
    ...(range ? { date_range: "custom", date_field: "work_date", date_from: range.from, date_to: range.to } : {}),
    order_by: "date_entered",
    order_dir: "DESC",
    page,
    per_page: 100,
  };
}

/** A readable reference such as QT-2610-7K3F: year and month, then four random characters. */
export function newQuotationNumber(now = new Date(), random = Math.random) {
  const suffix = Array.from({ length: 4 }, () => "23456789ABCDEFGHJKMNPQRSTUVWXYZ"[Math.floor(random() * 31)]).join("");
  return `QT-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${suffix}`;
}

export const amountOf = (record) => {
  const amount = Number(String(record?.amount ?? "").replace(/[,\s₹]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
};

export const isPaid = (record) => clean(record?.payment_status).toLowerCase() === "paid";

/** The fields to save, validated the same way the backend does. */
export function quotationData(values = {}, now = new Date()) {
  const data = Object.fromEntries(QUOTATION_FIELDS.map((field) => [field, clean(values[field])]));
  if (!data.name) throw new Error("Give the work a short title, for example “Light fixing, 2nd floor”.");
  if (!data.worker_name) throw new Error("Enter the worker's name.");
  if (data.worker_phone && !/^\+?[\d\s()-]{7,20}$/.test(data.worker_phone)) throw new Error("Enter a valid contact number.");
  const amount = Number(data.amount.replace(/,/g, ""));
  if (!data.amount || !Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
  data.amount = String(Math.round(amount * 100) / 100);
  if (data.work_date && !DATE.test(data.work_date)) throw new Error("Choose a valid work date.");
  if (!PAYMENT_STATUSES.includes(data.payment_status)) data.payment_status = "unpaid";
  if (data.payment_status === "paid") {
    if (!data.payment_method) throw new Error("Choose how it was paid.");
    if (!data.payment_by_id) throw new Error("Choose who made the payment.");
    if (!data.paid_on) data.paid_on = todayKey(now);
    if (!DATE.test(data.paid_on)) throw new Error("Choose a valid payment date.");
  } else {
    data.payment_method = "";
    data.paid_on = "";
    data.payment_reference = "";
    data.payment_by_id = "";
  }
  if (!data.quotation_number) data.quotation_number = newQuotationNumber(now);
  return data;
}

/**
 * Create or update request for a quotation (`values.id` updates). A new quotation also records
 * `admin_id`, the employee id of the admin creating it; edits never change who created it.
 */
export function quotationSaveBody(values, now = new Date()) {
  const data = quotationData(values, now);
  const id = clean(values.id);
  if (id) return { action: "update", module: QUOTATION_MODULE, id, data };
  const adminId = clean(values.admin_id);
  if (!adminId) throw new Error("Your session has no employee ID. Sign in again, then save the quotation.");
  return { action: "create", module: QUOTATION_MODULE, data: { ...data, admin_id: adminId } };
}

/**
 * Who created a quotation (`admin_id`) and who paid it (`payment_by_id`). Like other relate fields
 * the gateway may return `<field>_name`; otherwise the name comes from `nameById` (the admin list).
 */
export function quotationPeople(record, nameById = new Map()) {
  const nameOf = (field) => clean(record?.[`${field}_name`]) || clean(nameById.get(clean(record?.[field])));
  return { createdBy: nameOf("admin_id"), paidBy: isPaid(record) ? nameOf("payment_by_id") : "" };
}

/** The date a quotation belongs to: its work date, else the day it was entered. */
export const quotationDate = (record) => {
  const work = clean(record?.work_date);
  if (DATE.test(work)) return work;
  const entered = clean(record?.date_entered).slice(0, 10);
  return DATE.test(entered) ? entered : "";
};

/** Whether a quotation's date falls in a periodRange() result (null matches everything). */
export const inPeriod = (record, range) => {
  if (!range) return true;
  const date = quotationDate(record);
  return Boolean(date) && date >= range.from && date <= range.to;
};

/** Totals for the ledger header and the home card. `month` is "YYYY-MM". */
export function quotationSummary(records = [], month = todayKey().slice(0, 7)) {
  const summary = { count: records.length, billed: 0, paid: 0, outstanding: 0, paidCount: 0, unpaidCount: 0, paidThisMonth: 0 };
  for (const record of records) {
    const amount = amountOf(record);
    summary.billed += amount;
    if (isPaid(record)) {
      summary.paid += amount;
      summary.paidCount += 1;
      if (clean(record.paid_on).startsWith(month)) summary.paidThisMonth += amount;
    } else {
      summary.outstanding += amount;
      summary.unpaidCount += 1;
    }
  }
  return summary;
}

/** Quotations matching a status tab ("all", "unpaid", "paid") and a search term, in the server's order. */
export function filterQuotations(records = [], { status = "all", search = "" } = {}) {
  const term = clean(search).toLowerCase();
  return records.filter((record) =>
    (status === "all" || (status === "paid") === isPaid(record)) &&
    (!term || ["name", "quotation_number", "worker_name", "worker_company", "worker_phone", "category", "work_location"].some((field) => clean(record[field]).toLowerCase().includes(term))));
}

/** Whole days an unpaid quotation has been waiting since its date. */
export function daysOutstanding(record, now = new Date()) {
  const date = quotationDate(record);
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  return Math.max(0, Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(year, month - 1, day)) / 86400000));
}

export const formatAmount = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

export const formatDay = (key) => {
  if (!DATE.test(clean(key))) return "";
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
};

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const belowThousand = (n) => [n >= 100 && `${ONES[Math.floor(n / 100)]} Hundred`, n % 100 && belowHundred(n % 100)].filter(Boolean).join(" ");

function indianWords(n) {
  if (n === 0) return "Zero";
  const parts = [];
  for (const [size, label] of [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]]) {
    if (n >= size) {
      const count = Math.floor(n / size);
      parts.push(`${size === 10000000 ? indianWords(count) : belowHundred(count)} ${label}`);
      n %= size;
    }
  }
  if (n) parts.push(belowThousand(n));
  return parts.join(" ");
}

/** The amount written out the way Indian invoices do, e.g. "Rupees Four Thousand Five Hundred Only". */
export function amountInWords(amount) {
  const value = Math.round(Math.abs(Number(amount) || 0) * 100);
  const rupees = Math.floor(value / 100);
  const paise = value % 100;
  return `Rupees ${indianWords(rupees)}${paise ? ` and ${belowHundred(paise)} Paise` : ""} Only`;
}
