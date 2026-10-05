import test from "node:test";
import assert from "node:assert/strict";
import { roundDropAction, roundKeyboardCoordinates } from "./interviewDrag.js";

const record = Object.freeze({ id: "interview-1", candidate_id: "candidate-1", description: "Round 1", interview_status: "Pending" });

test("a cross-round drop prepares feedback without changing the source interview", () => {
  assert.deepEqual(roundDropAction(record, "  Technical   discussion  "), {
    record, action: "Pass", targetRound: "Technical discussion",
  });
  assert.equal(record.description, "Round 1");
  assert.equal(record.interview_status, "Pending");
});

test("same-round and outside drops do not open feedback", () => {
  for (const destination of [" ROUND  1 ", "", " ", undefined, null])
    assert.equal(roundDropAction(record, destination), null);
});

test("completed, deleted and unidentified interviews cannot start a move", () => {
  for (const interview of [null, {}, { ...record, id: "" }, { ...record, candidate_id: "" }, { ...record, deleted: "1" },
    ...["Pass", "passed", " Fail ", "Failed"].map((interview_status) => ({ ...record, interview_status }))])
    assert.equal(roundDropAction(interview, "Round 2"), null);
  assert.ok(roundDropAction({ id: "email-only", email: "person@example.com", description: "Round 1" }, "Round 2"));
  assert.ok(roundDropAction({ id: "related", hrc_candidates_hrc_interviews_1hrc_candidates_ida: "candidate-1", description: "Round 1" }, "Round 2"));
});

function keyboardContext(over = null) {
  const rounds = [
    { id: "round:final", data: { current: { type: "interview-round", group: { index: 4 } } } },
    { id: "unrelated", data: { current: { type: "other" } } },
    { id: "round:screening", data: { current: { type: "interview-round", group: { index: 0 } } } },
    { id: "round:technical", data: { current: { type: "interview-round", group: { index: 2 } } } },
  ];
  return {
    active: { data: { current: { group: { key: "screening" } } } },
    over: over ? { id: `round:${over}` } : null,
    collisionRect: { width: 280, height: 240 },
    droppableContainers: { getEnabled: () => rounds },
    droppableRects: new Map([
      ["round:screening", { left: 10, top: 30, width: 300, height: 500 }],
      ["round:technical", { left: 330, top: 30, width: 300, height: 420 }],
      ["round:final", { left: 650, top: 30, width: 300, height: 300 }],
    ]),
  };
}

function key(code) {
  return { code, prevented: false, preventDefault() { this.prevented = true; } };
}

test("keyboard movement selects adjacent visible rounds instead of hidden or unrelated targets", () => {
  for (const code of ["ArrowRight", "ArrowDown"]) {
    const event = key(code);
    assert.deepEqual(roundKeyboardCoordinates(event, { context: keyboardContext() }), { x: 340, y: 120 });
    assert.equal(event.prevented, true);
    assert.deepEqual(roundKeyboardCoordinates(key(code), { context: keyboardContext("technical") }), { x: 660, y: 60 });
  }
  for (const code of ["ArrowLeft", "ArrowUp"])
    assert.deepEqual(roundKeyboardCoordinates(key(code), { context: keyboardContext("technical") }), { x: 20, y: 160 });
});

test("stacked mobile rounds are reachable with the same keyboard controls", () => {
  const context = keyboardContext();
  context.droppableRects.set("round:technical", { left: 10, top: 550, width: 300, height: 420 });
  assert.deepEqual(roundKeyboardCoordinates(key("ArrowDown"), { context }), { x: 20, y: 640 });
});

test("keyboard edges, unavailable measurements and non-arrow keys do not select a round", () => {
  assert.equal(roundKeyboardCoordinates(key("ArrowLeft"), { context: keyboardContext() }), undefined);
  assert.equal(roundKeyboardCoordinates(key("ArrowRight"), { context: keyboardContext("final") }), undefined);
  assert.equal(roundKeyboardCoordinates(key("ArrowDown"), { context: keyboardContext("removed") }), undefined);
  const context = keyboardContext();
  context.droppableRects.delete("round:technical");
  assert.equal(roundKeyboardCoordinates(key("ArrowRight"), { context }), undefined);
  context.collisionRect = null;
  assert.equal(roundKeyboardCoordinates(key("ArrowRight"), { context }), undefined);
  const event = key("Escape");
  assert.equal(roundKeyboardCoordinates(event, { context: keyboardContext() }), undefined);
  assert.equal(event.prevented, false);
});
