import { http } from "../services/api";
import { HOLIDAY_MODULE, holidayListBody, holidaySaveBody, sortHolidays, toHoliday } from "../components/pages/holidays/holidayUtils";

const gateway = async (body, fallbackMessage) => {
  const response = await http({ method: "POST", body });
  if (response?.success !== true) throw new Error(response?.message || response?.error || fallbackMessage);
  return response;
};

/** Every public holiday, by date (undated ones last). */
export async function fetchHolidays() {
  const records = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await gateway(holidayListBody(page), "Could not load holidays. Please retry.");
    if (!Array.isArray(response.records)) throw new Error("Could not load holidays. Please retry.");
    records.push(...response.records.filter((record) => String(record.deleted) !== "1"));
    totalPages = Number(response.total_pages) || 1;
    page += 1;
  } while (page <= totalPages);
  return sortHolidays(records.map(toHoliday));
}

/** Creates a holiday, or updates it when `values.id` is set. Resolves to its id. */
export async function saveHoliday(values) {
  const body = holidaySaveBody(values);
  const response = await gateway(body, "Could not save the holiday. Please retry.");
  const id = body.id || response.id || response.record?.id || response.data?.id;
  if (!id) throw new Error("The holiday was saved but no ID came back. Refresh to see it.");
  return id;
}

export async function deleteHoliday(id) {
  id = String(id ?? "").trim();
  if (!id) throw new Error("A holiday is required.");
  await gateway({ action: "delete", module: HOLIDAY_MODULE, id }, "Could not delete the holiday. Please retry.");
  return id;
}
