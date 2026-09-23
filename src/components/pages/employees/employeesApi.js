import { http } from "../../../services/api";

export const employeeName = (record) =>
  [record.first_name, record.last_name].map(value => String(value || "").trim()).filter(Boolean).join(" ") || record.name?.trim() || "Unnamed employee";

export function employeeDate(value = "") {
  const text = String(value).trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text.slice(0, 10);
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
