import { readResumeSections } from "./resumeSections.js";

// Linked CRM records take precedence so reviewing a parsed resume never duplicates them.
export function educationForOnboarding(records, description = "") {
  const fromResume = !records.length;
  const entries = fromResume ? readResumeSections(description).sections.education : records;
  return entries.map((entry) => {
    const row = { ...entry, name: entry.name?.trim() || entry.qualification || "" };
    // IDs embedded in resume content are not confirmed CRM relationship IDs.
    if (fromResume) delete row.id;
    return row;
  });
}
