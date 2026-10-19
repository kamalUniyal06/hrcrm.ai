import test from "node:test";
import assert from "node:assert/strict";
import { searchScore } from "./searchScore.js";

test("matches rank exact, then prefix, then word start, then anywhere", () => {
  const exact = searchScore("china", ["China"]);
  const prefix = searchScore("ind", ["India"]);
  const word = searchScore("korea", ["Korea, Republic of"]) && searchScore("republic", ["Korea, Republic of"]);
  const inside = searchScore("dia", ["India"]);
  assert.equal(exact, 1);
  assert.ok(prefix > word && word > inside && inside > 0);
});

test("letters must be together, not scattered", () => {
  assert.equal(searchScore("china", ["South Georgia and the South Sandwich Islands"]), 0);
  assert.equal(searchScore("china", ["Saint Helena, Ascension and Tristan da Cunha"]), 0);
});

test("codes match only exactly; accents and case are ignored", () => {
  assert.equal(searchScore("in", ["India"], ["IN"]), 1);
  assert.equal(searchScore("ch", ["Switzerland"], ["CH"]), 1);
  assert.equal(searchScore("c", ["Switzerland"], ["CH"]), 0);
  assert.equal(searchScore("COTE", ["Côte d'Ivoire"]), 0.9);
  assert.equal(searchScore("", ["Anything"]), 1);
});
