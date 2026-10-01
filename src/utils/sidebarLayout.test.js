import test from "node:test";
import assert from "node:assert/strict";
import {
  isVisible,
  normalizeSidebarResponse,
  selectVisibleGroups,
  toVisibilityFlag,
} from "./sidebarLayout.js";

test("sidebar visibility follows is_visible even when is_active disagrees", () => {
  const groups = normalizeSidebarResponse([{
    id: "group",
    module: "profile_groups",
    group_name: "People",
    rank: "a0",
    is_visible: "1",
    is_active: false,
    data: [
      { id: "hidden", module: "profile_modules", rank: "a0", is_visible: "0", is_active: true },
      { id: "shown", module: "profile_modules", rank: "a1", is_visible: "1", is_active: false },
    ],
  }]);

  assert.equal(groups[0].is_visible, true);
  assert.equal(groups[0].data[0].is_visible, false);
  assert.deepEqual(selectVisibleGroups(groups)[0].data.map((item) => item.id), ["shown"]);
  assert.equal(toVisibilityFlag(false), 0);
});

test("visible alias works for older responses without consulting is_active", () => {
  assert.equal(isVisible({ visible: false, is_active: true }), false);
  assert.equal(isVisible({ is_active: false }), true);
  assert.equal(isVisible({ is_visible: false, visible: true }), false);
});
