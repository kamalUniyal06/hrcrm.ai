import { http } from "../../../services/api";

export const employeeName = (record) =>
  [record.first_name, record.last_name].map(value => String(value || "").trim()).filter(Boolean).join(" ") || record.name?.trim() || "Unnamed employee";

export function employeeDate(value = "") {
  const text = String(value).trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text.slice(0, 10);
}

// "12 Mar 2024" from a stored joining date, or "—" when it can't be read.
export function formatJoinDate(value) {
  const match = employeeDate(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "—";
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Time since joining, e.g. "2y 3m" or "4m"; empty for missing or future dates.
export function tenure(value) {
  const match = employeeDate(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const now = new Date();
  let months = (now.getFullYear() - Number(match[1])) * 12 + now.getMonth() - (Number(match[2]) - 1);
  if (now.getDate() < Number(match[3])) months -= 1;
  if (months < 0) return "";
  if (months < 1) return "New joiner";
  const years = Math.floor(months / 12);
  return [years && `${years}y`, months % 12 && `${months % 12}m`].filter(Boolean).join(" ");
}

export async function fetchEmployee(id) {
  const response = await http({ method: "POST", body: {
    action: "fetch", module: "hrc_employees", filters: { id }, page: 1, per_page: 1,
  } });
  const record = response?.records?.find(item => item.id === id && String(item.deleted) !== "1");
  if (response?.success !== true || !record) throw new Error(response?.message || "Employee unavailable. Refresh the directory and try again.");
  return record;
}

export async function saveEmployee(id, data) {
  const response = await http({ method: "POST", body: {
    action: id ? "update" : "create", module: "hrc_employees", ...(id ? { id } : {}), data,
  } });
  if (response?.success !== true) throw new Error(response?.message || response?.error || "Could not save employee. Please retry.");
  return response;
}

export async function deleteEmployee(id) {
  if (!id) throw new Error("An employee ID is required.");
  const response = await http({ method: "POST", body: { action: "delete", module: "hrc_employees", id } });
  if (response?.success !== true) throw new Error(response?.message || response?.error || "Could not delete employee. Please retry.");
}
