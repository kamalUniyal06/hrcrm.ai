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

test("sidebar counts accept API flag formats and default to hidden", () => {
  const flags = [true, 1, "1", "true", false, 0, "0", "false", null, undefined];
  const groups = normalizeSidebarResponse([{
    id: "group",
    module: "profile_groups",
    group_name: "People",
    rank: "a0",
    data: flags.map((show_count, index) => ({
      id: `item-${index}`,
      module: "profile_modules",
      rank: `a${index}`,
      show_count,
    })),
  }]);

  assert.deepEqual(
    groups[0].data.map((item) => item.show_count),
    [true, true, true, true, false, false, false, false, false, false],
  );
  assert.deepEqual(
    selectVisibleGroups(groups)[0].data
      .filter((item) => item.show_count === true)
      .map((item) => item.id),
    ["item-0", "item-1", "item-2", "item-3"],
  );
});
