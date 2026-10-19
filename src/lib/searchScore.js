// Ranking for searchable lists (cmdk `filter`). Unlike cmdk's default fuzzy
// match, letters must appear together, so "china" doesn't match "South
// Georgia and the South Sandwich Islands". Higher scores sort first; 0 hides.

const fold = (text = "") =>
  String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function textScore(text, query) {
  const value = fold(text);
  if (value === query) return 1;
  if (value.startsWith(query)) return 0.9;
  if (value.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))) return 0.7;
  return value.includes(query) ? 0.4 : 0;
}

// `labels` match fully; `codes` (short aliases such as "IN") only match exactly,
// so typing "ch" doesn't pull in every country whose code starts with CH.
export function searchScore(query, labels = [], codes = []) {
  const wanted = fold(query);
  if (!wanted) return 1;
  if (codes.some((code) => fold(code) === wanted)) return 1;
  return Math.max(0, ...labels.map((label) => textScore(label, wanted)));
}
