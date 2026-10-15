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

const numberOf = value => {
  const text = String(value ?? "").replace(/,/g, "").trim();
  return text && Number.isFinite(Number(text)) ? Number(text) : null;
};

export function experienceRange(job) {
  const min = numberOf(job?.minimum_experience);
  const max = numberOf(job?.maximum_experience);
  const unit = value => `${value} year${value === 1 ? "" : "s"}`;
  if (min !== null && max !== null && max > min) return `${min}–${unit(max)}`;
  if (min !== null && min > 0) return `${min}+ years`;
  if (max !== null && max > 0) return `Up to ${unit(max)}`;
  if (min === 0 && (max === null || max === 0)) return "Freshers welcome";
  return plainText(valueOf(job, ["experience_required", "experience", "experience_level"]));
}

export function salaryRange(job, dropdowns = {}) {
  const min = numberOf(job?.minimum_salary);
  const max = numberOf(job?.maximum_salary);
  const currency = fieldLabel(job, ["salary_currency"], dropdowns);
  const format = value => value.toLocaleString(/^(inr|₹)?$/i.test(currency) ? "en-IN" : "en-US");
  const amount = min !== null && max !== null && max > min ? `${format(min)} – ${format(max)}`
    : min !== null ? `${format(min)}+`
      : max !== null ? `Up to ${format(max)}` : "";
  const negotiable = String(job?.salary_negotiable) === "1";
  if (!amount) return plainText(valueOf(job, ["salary_range", "salary", "ctc"])) || (negotiable ? "Negotiable" : "");
  return `${currency ? `${currency} ` : ""}${amount}${negotiable ? " (negotiable)" : ""}`;
}

export function locationOf(job) {
  const place = plainText(valueOf(job, ["job_location", "location"]));
  return place || ["city", "state", "country"].map(key => plainText(job?.[key])).filter(Boolean).join(", ");
}

// Short phrases read better as chips; full sentences stay as a list.
export const isChipList = items => items.length > 0 && items.every(item => item.length <= 48 && !/\.$/.test(item));

export function applicationTone(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "accepted" || value === "hired" || value === "selected") return "positive";
  if (value.startsWith("rejected") || value === "withdrawn") return "negative";
  return "pending";
}
