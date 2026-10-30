// Public holidays (`hrc_holidays`): name, holiday_date and description. Pure helpers for the
// admin page; requests go through src/api/holidays.api.js.

import he from "he";

export const HOLIDAY_MODULE = "hrc_holidays";

const text = (value) => String(value ?? "").trim();

/**
 * `holiday_date` as YYYY-MM-DD, or "" when it is missing or not a real date. The gateway sends
 * MM/DD/YYYY; a first part above 12 can only be a day, so DD/MM/YYYY is read too.
 */
export function holidayDateKey(value) {
  const raw = text(value);
  let year;
  let month;
  let day;
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const slashed = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (iso) [, year, month, day] = iso.map(Number);
  else if (slashed) {
    const [first, second] = [Number(slashed[1]), Number(slashed[2])];
    year = Number(slashed[3]);
    [month, day] = first > 12 ? [second, first] : [first, second];
  } else return "";
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** A gateway record as { id, name, date (YYYY-MM-DD or ""), description }; names may come entity-encoded. */
export const toHoliday = (record) => ({
  id: text(record?.id),
  name: he.decode(text(record?.name)),
  date: holidayDateKey(record?.holiday_date),
  description: he.decode(text(record?.description)),
});

/** Dated holidays by date, then undated ones (they need fixing) by name. */
export const sortHolidays = (holidays) =>
  [...holidays].sort((a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : 0) || a.name.localeCompare(b.name));

/** Years that have holidays, newest first. */
export const holidayYears = (holidays) =>
  [...new Set(holidays.map((holiday) => holiday.date.slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));

/** What the form must fix before saving, by field; empty when it can be saved. */
export function holidayProblems(values, holidays = []) {
  const problems = {};
  const name = text(values?.name);
  const date = holidayDateKey(values?.date);
  if (!name) problems.name = "Give the holiday a name.";
  else if (name.length > 255) problems.name = "Keep the name under 255 characters.";
  if (!date) problems.date = "Choose the date.";
  else if (holidays.some((holiday) => holiday.id !== values?.id && holiday.date === date && holiday.name.toLowerCase() === name.toLowerCase())) {
    problems.date = "This holiday is already on the list for that date.";
  }
  return problems;
}

export const holidayListBody = (page) => ({ action: "fetch", module: HOLIDAY_MODULE, order_by: "holiday_date", order_dir: "ASC", page, per_page: 100 });

/** A create (no `id`) or update body. Dates are saved as YYYY-MM-DD, the database format. */
export function holidaySaveBody(values) {
  const id = text(values?.id);
  const data = { name: text(values?.name), holiday_date: holidayDateKey(values?.date), description: text(values?.description) };
  return id ? { action: "update", module: HOLIDAY_MODULE, id, data } : { action: "create", module: HOLIDAY_MODULE, data };
}

/** "Thu, 25 Dec 2026" for a YYYY-MM-DD key. */
export function formatHolidayDate(key, options = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) {
  if (!key) return "";
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(year, month - 1, day));
}
