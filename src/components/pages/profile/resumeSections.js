const sectionKeys = ["experiences", "education", "skills"];

export function normalizeResumeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => item !== null && item !== undefined).map(item => {
    if (typeof item !== "object" || Array.isArray(item)) return { details: String(item) };
    return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)]));
  });
}

// Read JSON descriptions, with a fallback for profiles saved in the older text format.
export function readResumeSections(description = "") {
  const sections = { education: [], experiences: [], skills: [] };
  try {
    const data = JSON.parse(description);
    if (data?.content?.candidate && typeof data.content.candidate === "object" && !Array.isArray(data.content.candidate)) {
      for (const key of sectionKeys) sections[key] = normalizeResumeItems(data.content[key]);
      const about = data.content.candidate.description || data.content.candidate.summary;
      return { about: typeof about === "string" ? about : "", sections, parsedResume: data };
    }
    if (data && typeof data === "object" && !Array.isArray(data) &&
      (sectionKeys.some(key => Array.isArray(data[key])) || typeof data.about === "string")) {
      for (const key of sectionKeys) sections[key] = normalizeResumeItems(data[key]);
      return { about: typeof data.about === "string" ? data.about : "", sections };
    }
  } catch {
    // Plain text and legacy section headings remain editable without losing content.
  }
  const parts = String(description).split(/(?:^|\n\n)(EDUCATION|EXPERIENCES|SKILLS)\r?\n/);
  for (let index = 1; index < parts.length; index += 2) {
    const key = parts[index].toLowerCase();
    sections[key] = parts[index + 1].trim().split(/\n\n/).filter(Boolean).flatMap(block => {
      // Older profiles stored one entry per line with inline field separators.
      const records = / · | \uFFFD /.test(block) ? block.split("\n") : [block];
      return records.map(record => {
        const values = {};
        let previous = "";
        for (const line of record.split(/\n| · | \uFFFD /)) {
          const field = line.match(/^([a-zA-Z][\w ]*):\s?(.*)$/);
          if (field) { previous = field[1].replaceAll(" ", "_"); values[previous] = field[2]; }
          else if (previous) values[previous] += `\n${line.startsWith("  ") ? line.slice(2) : line}`;
          else { previous = "details"; values.details = line; }
        }
        return values;
      });
    });
  }
  return { about: parts[0].trim(), sections };
}

export function writeResumeSections(about, sections) {
  return JSON.stringify({
    about: about || "",
    ...Object.fromEntries(sectionKeys.map(key => [key, normalizeResumeItems(sections?.[key])])),
  }, null, 2);
}
