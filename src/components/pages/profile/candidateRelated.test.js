import test from "node:test";
import assert from "node:assert/strict";
import { loadCandidateRelated } from "./candidateRelated.js";
import { readResumeSections, updateResumeAbout } from "./resumeSections.js";

test("each profile section fetches only the selected candidate's CRM relationship", async () => {
  for (const [section, module] of [["skills", "hrc_skills"], ["experiences", "hrc_experience"], ["education", "hrc_education"]]) {
    const result = await loadCandidateRelated(async (body) => {
      assert.deepEqual(body, {
        action: "fetch_related", module: "hrc_candidates", id: "candidate-a",
        related_module: module, page: 1, per_page: 20,
      });
      return { success: true, records: [{ id: "related-1", name: "Record", version: 3 }], total: 1 };
    }, "candidate-a", section);
    assert.deepEqual(result, [{ id: "related-1", name: "Record", version: "3" }]);
  }
});

test("profile relationships include later pages and exclude deleted records", async () => {
  const pages = [];
  const result = await loadCandidateRelated(async (body) => {
    pages.push(body.page);
    assert.equal(body.id, "candidate-a");
    return {
      success: true,
      records: body.page === 1
        ? [{ id: "first", name: "JavaScript" }, { id: "removed", deleted: "1" }]
        : [{ id: "later", name: "React" }],
      pagination: { total: 21, per_page: 20, total_pages: 2 },
    };
  }, "candidate-a", "skills");
  assert.deepEqual(pages, [1, 2]);
  assert.deepEqual(result.map((record) => record.id), ["first", "later"]);
});

test("invalid selectors and failed later pages cannot become empty or partial successful sections", async () => {
  for (const [id, section] of [["", "skills"], ["candidate-a", "unknown"]]) {
    await assert.rejects(loadCandidateRelated(() => { throw new Error("Unexpected request"); }, id, section), /saved candidate/);
  }
  await assert.rejects(loadCandidateRelated(async (body) => body.page === 1
    ? { success: true, records: [{ id: "first" }], total_pages: 2 }
    : { success: false, error: "Permission denied" }, "candidate-a", "education"), /Permission denied/);
  await assert.rejects(loadCandidateRelated(async () => ({ success: true, records: null }), "candidate-a", "experiences"));
  assert.deepEqual(await loadCandidateRelated(async () => ({ success: true, records: [], total: 0 }), "candidate-b", "skills"), []);
});

test("editing a parsed resume introduction preserves its candidate data and all resume sections", () => {
  const original = { content: { candidate: { summary: "Old summary", email: "candidate@example.com" }, skills: [{ name: "React" }], experiences: [{ company: "Acme" }], education: [{ institution: "University" }] }, source: "resume" };
  const updated = JSON.parse(updateResumeAbout(JSON.stringify(original), "New introduction"));
  assert.deepEqual(updated, { ...original, content: { ...original.content, candidate: { ...original.content.candidate, description: "New introduction" } } });
  const cleared = updateResumeAbout(JSON.stringify(updated), "");
  assert.equal(readResumeSections(cleared).about, "");
  assert.equal(readResumeSections(cleared).sections.skills[0].name, "React");
});

test("plain, structured and legacy introductions remain editable without dropping history", () => {
  assert.equal(updateResumeAbout("Old introduction", "New introduction"), "New introduction");
  const structured = { about: "Old", skills: [{ name: "React" }], custom: "Keep" };
  assert.deepEqual(JSON.parse(updateResumeAbout(JSON.stringify(structured), "New")), { ...structured, about: "New" });
  const legacy = "Old introduction\n\nSKILLS\nname: React";
  const updated = readResumeSections(updateResumeAbout(legacy, "New introduction"));
  assert.equal(updated.about, "New introduction");
  assert.deepEqual(updated.sections.skills, [{ name: "React" }]);
});
