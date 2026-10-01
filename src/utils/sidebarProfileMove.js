import { normalizeSidebarResponse } from "./sidebarLayout.js";
import { RankScopeError, inspectRankScope } from "./rank.js";
import { UiRankError, between, neighborRanksAt } from "./uiRank.js";

export const PROFILE_GROUP_MODULE = "outr_ui_sidebar_profile_groups";
export const PROFILE_ITEM_MODULE = "outr_ui_sidebar_profile_modules";

export const isSidebarProfilePair = (groupModule, itemModule) =>
  groupModule === PROFILE_GROUP_MODULE && itemModule === PROFILE_ITEM_MODULE;

/** Plan a profile mapping move from a fresh response of the same profile. */
export function planSidebarProfileMove({
  response,
  expectedProfileId,
  moduleId,
  destinationGroupId,
  destinationUiGroupId,
  desiredIds,
}) {
  if (!expectedProfileId || String(response?.profile?.id) !== String(expectedProfileId)) {
    throw new Error("The sidebar profile changed. Reload it before moving a module.");
  }
  if (!moduleId || !destinationGroupId || !destinationUiGroupId) {
    throw new Error("A profile move needs the module mapping and destination group ids.");
  }

  const groups = normalizeSidebarResponse(response);
  const destination = groups.find(
    (group) =>
      String(group.id) === String(destinationGroupId) &&
      String(group.ui_group_id) === String(destinationUiGroupId) &&
      group.module === PROFILE_GROUP_MODULE,
  );
  if (!destination) {
    throw new Error("The destination group no longer belongs to this sidebar profile.");
  }

  const source = groups.find((group) =>
    (group.data ?? []).some((item) => String(item.id) === String(moduleId)),
  );
  const mapping = source?.data.find((item) => String(item.id) === String(moduleId));
  if (!mapping || mapping.module !== PROFILE_ITEM_MODULE) {
    throw new Error("The module profile mapping no longer exists in this sidebar profile.");
  }
  if (String(source.id) === String(destination.id)) {
    return { alreadyMoved: true, moduleId, destination };
  }

  const order = (desiredIds ?? []).map(String);
  const movedIndex = order.indexOf(String(moduleId));
  if (movedIndex < 0) {
    throw new Error("The module is missing from the destination draft order.");
  }

  const siblings = destination.data ?? [];
  const report = inspectRankScope(siblings, {
    collection: PROFILE_ITEM_MODULE,
    ui_group_id: destinationUiGroupId,
  });
  if (!report.valid) throw new RankScopeError(report);

  const positions = new Map(siblings.map((item, index) => [String(item.id), index]));
  const nextId = order.slice(movedIndex + 1).find((id) => positions.has(id));
  const previousId = [...order.slice(0, movedIndex)].reverse().find((id) => positions.has(id));
  const insertionIndex = nextId
    ? positions.get(nextId)
    : previousId
      ? positions.get(previousId) + 1
      : siblings.length;
  const { lower, upper } = neighborRanksAt(siblings, insertionIndex);

  let rankKey;
  let appendedForSpace = false;
  try {
    rankKey = between(lower, upper);
  } catch (error) {
    if (!(error instanceof UiRankError)) throw error;
    rankKey = between(siblings.at(-1)?.rank ?? null, null);
    appendedForSpace = true;
  }
  if (siblings.some((item) => item.rank === rankKey)) {
    throw new Error("The destination rank is already in use. Reload and try again.");
  }

  return {
    moduleId: String(moduleId),
    destinationUiGroupId: String(destinationUiGroupId),
    rankKey,
    appendedForSpace,
  };
}

export function buildSidebarProfileMoveRequest(plan) {
  if (!plan?.moduleId || !plan?.destinationUiGroupId || !plan?.rankKey) {
    throw new Error("The profile move is missing its mapping id, group id, or rank.");
  }
  return {
    action: "update",
    module: PROFILE_ITEM_MODULE,
    id: plan.moduleId,
    data: {
      ui_group_id: plan.destinationUiGroupId,
      rank_key: plan.rankKey,
    },
  };
}
