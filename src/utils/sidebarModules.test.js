import test from "node:test";
import assert from "node:assert/strict";
import { resolveSidebarModules } from "./sidebarModules.js";

test("uses sidebar profile module names supplied by the response", () => {
  const response = {
    status: true,
    level: "module",
    data: [
      {
        module: "outr_ui_sidebar_profile_groups",
        data: [{ module: "outr_ui_sidebar_profile_modules" }],
      },
      {
        module: "outr_ui_sidebar_profile_groups",
        data: [],
      },
    ],
  };

  assert.deepEqual(resolveSidebarModules(response), {
    groupModule: "outr_ui_sidebar_profile_groups",
    itemModule: "outr_ui_sidebar_profile_modules",
  });
});

test("missing or conflicting response types cannot choose a write target", () => {
  assert.deepEqual(resolveSidebarModules([]), {
    groupModule: null,
    itemModule: null,
  });
  assert.throws(
    () => resolveSidebarModules([
      { module: "group_a", data: [{ module: "item_a" }] },
      { module: "group_b", data: [{ module: "item_a" }] },
    ]),
    /conflicting/,
  );
});
