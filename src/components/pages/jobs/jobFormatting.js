import he from "he";

export const valueOf = (record, keys) => keys.map(key => record?.[key]).find(value =>
  (typeof value === "string" && value.trim()) || typeof value === "number");

export function plainText(value) {
  return he.decode(String(value ?? "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(?:p|li|div|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, ""))
    .replace(/\r\n/g, "\n").replace(/[^\S\n]+/g, " ").trim();
}

export const titleOf = job => plainText(valueOf(job, ["job_title", "name", "title", "position"])) || "Job posting";
export const readable = value => String(value ?? "Unknown").replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());

export function requirementItems(value) {
  return plainText(value).split(/\n+|\s+[•●▪]\s*|\s+-\s+/)
    .map(item => item.replace(/^\s*[-•●▪]\s*/, "").trim()).filter(Boolean);
}

export function fieldLabel(job, keys, dropdowns = {}, format = false) {
  const value = valueOf(job, keys);
  if (value === undefined) return "";
  const field = keys.find(key => job[key] === value);
  const label = dropdowns[field]?.[value];
  return plainText(label || (format ? readable(value) : value));
}
