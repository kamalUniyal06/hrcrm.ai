import test from "node:test";
import assert from "node:assert/strict";
import { dussehraInviteDue, dussehraSeasonKey, isDussehraSeason, rememberDussehraInvite } from "./dussehraSeason.js";

const FESTIVAL = new Date("2026-10-20T06:00:00Z");

test("the home header offers the celebration only around Dussehra (IST)", () => {
  assert.equal(isDussehraSeason(FESTIVAL), true);
  assert.equal(isDussehraSeason(new Date("2026-10-17T00:00:00+05:30")), true);
  assert.equal(isDussehraSeason(new Date("2026-10-23T23:59:00+05:30")), true);
  assert.equal(isDussehraSeason(new Date("2026-10-16T23:59:00+05:30")), false);
  assert.equal(isDussehraSeason(new Date("2026-10-24T00:00:00+05:30")), false);
  assert.equal(isDussehraSeason(new Date("2026-12-25T12:00:00Z")), false);
  assert.equal(dussehraSeasonKey(new Date("2026-10-22T10:00:00+05:30")), "2026-10-20");
  assert.equal(dussehraSeasonKey(new Date("2026-12-25T12:00:00Z")), null);
});

test("the invite shows once per festival, and not outside the season", () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    assert.equal(dussehraInviteDue(FESTIVAL), true);
    rememberDussehraInvite(FESTIVAL);
    assert.equal(dussehraInviteDue(FESTIVAL), false);
    assert.equal(dussehraInviteDue(new Date("2026-10-22T10:00:00+05:30")), false, "same festival, later day");
    // A remembered answer from an earlier year doesn't silence this one.
    values.set("dussehra-invite", "2025-10-02");
    assert.equal(dussehraInviteDue(FESTIVAL), true);
    assert.equal(dussehraInviteDue(new Date("2026-12-25T12:00:00Z")), false);
    rememberDussehraInvite(new Date("2026-12-25T12:00:00Z"));
    assert.equal(values.get("dussehra-invite"), "2025-10-02", "nothing is stored out of season");
  } finally {
    delete globalThis.localStorage;
  }
});

test("without storage the invite stays hidden instead of repeating", () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  try {
    assert.equal(dussehraInviteDue(FESTIVAL), false);
    assert.doesNotThrow(() => rememberDussehraInvite(FESTIVAL));
  } finally {
    delete globalThis.localStorage;
  }
});
