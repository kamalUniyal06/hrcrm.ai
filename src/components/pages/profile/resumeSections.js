const sectionKeys = ["education", "experiences", "skills"];

export function normalizeResumeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => item !== null && item !== undefined).map(item => {
    if (typeof item !== "object" || Array.isArray(item)) return { details: String(item) };
    return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)]));
  });
}

// Keep the existing human-readable description storage while separating it in the UI.
export function readResumeSections(description = "") {
  const sections = { education: [], experiences: [], skills: [] };
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
  return [about, ...sectionKeys.flatMap(key => {
    const records = normalizeResumeItems(sections?.[key]).map(item => Object.entries(item)
      .filter(([, value]) => value.trim()).map(([label, value]) => `${label}: ${value.replaceAll("\n", "\n  ")}`).join("\n")).filter(Boolean);
    return records.length ? [`${key.toUpperCase()}\n${records.join("\n\n")}`] : [];
  })].filter(Boolean).join("\n\n");
}
