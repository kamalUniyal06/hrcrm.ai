import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSidebarProfileMoveRequest,
  isSidebarProfilePair,
  planSidebarProfileMove,
} from "./sidebarProfileMove.js";

const response = {
  profile: { id: "profile-1" },
  data: [
    {
      id: "source-mapping",
      ui_group_id: "underlying-source",
      module: "outr_ui_sidebar_profile_groups",
      group_name: "Source",
      rank: "a0",
      data: [{
        id: "module-mapping",
        ui_module_id: "underlying-module",
        module: "outr_ui_sidebar_profile_modules",
        rank: "a0",
        is_visible: false,
      }],
    },
    {
      id: "destination-mapping",
      ui_group_id: "underlying-destination",
      module: "outr_ui_sidebar_profile_groups",
      group_name: "Destination",
      rank: "a1",
      data: [
        { id: "before", module: "outr_ui_sidebar_profile_modules", rank: "a0" },
        { id: "after", module: "outr_ui_sidebar_profile_modules", rank: "a1" },
      ],
    },
  ],
};

const move = (overrides = {}) => planSidebarProfileMove({
  response,
  expectedProfileId: "profile-1",
  moduleId: "module-mapping",
  destinationGroupId: "destination-mapping",
  destinationUiGroupId: "underlying-destination",
  desiredIds: ["before", "module-mapping", "after"],
  ...overrides,
});

test("profile move uses mapping id, underlying group id, and a unique destination rank", () => {
  const plan = move();
  assert.equal(plan.rankKey, "a0V");
  assert.deepEqual(buildSidebarProfileMoveRequest(plan), {
    action: "update",
    module: "outr_ui_sidebar_profile_modules",
    id: "module-mapping",
    data: { ui_group_id: "underlying-destination", rank_key: "a0V" },
  });
  assert.equal(isSidebarProfilePair(
    "outr_ui_sidebar_profile_groups", "outr_ui_sidebar_profile_modules",
  ), true);
  assert.equal(isSidebarProfilePair("outr_ui_groups", "outr_ui_modules"), false);
});

test("profile move rejects a different profile or a destination mapping id used as ui_group_id", () => {
  assert.throws(() => move({ expectedProfileId: "another-profile" }), /profile changed/);
  assert.throws(() => move({ destinationUiGroupId: "destination-mapping" }), /no longer belongs/);
  assert.throws(() => move({ destinationGroupId: "unknown" }), /no longer belongs/);
});

test("profile move keeps an appended rank unique in the destination", () => {
  const plan = move({ desiredIds: ["before", "after", "module-mapping"] });
  assert.equal(plan.rankKey, "a2");
  assert.ok(!response.data[1].data.some((item) => item.rank === plan.rankKey));
});

test("a retried move detects that the mapping is already in the destination", () => {
  const refreshed = structuredClone(response);
  const [mapping] = refreshed.data[0].data.splice(0, 1);
  refreshed.data[1].data.splice(1, 0, { ...mapping, rank: "a0V" });
  assert.equal(move({ response: refreshed }).alreadyMoved, true);
});
