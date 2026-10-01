import { apiRequest, http } from "../services/api";
import { FETCH_GPC_X_API_KEY } from "../store/constants";
import { getMetadataEndpoint } from "../utils/sidebarLayout";
import { buildSidebarProfileMoveRequest } from "../utils/sidebarProfileMove";

/** Profile mappings store membership in ui_group_id, not a Sugar relationship. */
export const moveSidebarProfileModule = async (plan) => {
  const request = buildSidebarProfileMoveRequest(plan);
  let response;
  try {
    response = await http({
      endpoint: getMetadataEndpoint(),
      method: "POST",
      body: request,
    });
  } catch (error) {
    const payload = error?.response?.data;
    throw new Error(
      payload?.error || payload?.message || error?.message || "Profile module move failed.",
    );
  }
  if (!response || response.success !== true) {
    throw new Error(
      response?.error || response?.message || "The profile module move was rejected by smart_gateway.",
    );
  }
  return response;
};

const requestGroupModuleRelationship = async ({
  action,
  groupId,
  moduleId,
  groupModule,
  itemModule,
}) => {
  if (!groupModule || !itemModule) {
    throw new Error("The sidebar response did not provide group and item module names.");
  }
  const response = await http({
    endpoint: getMetadataEndpoint(),
    method: "POST",
    body: {
      order_by: "",
      action,
      module: groupModule,
      id: groupId,
      related_module: itemModule,
      related_id: moduleId,
      relationship_name: `${groupModule}_${itemModule}_1`,
    },
  });

  if (!response || response.success !== true) {
    throw new Error(
      `Sidebar relationship ${action} failed for group ${groupId} and module ${moduleId}: ${response?.error || "unexpected response from smart_gateway"}`,
    );
  }

  return response;
};

export const moveSidebarModuleRelationship = async ({
  moduleId,
  sourceGroupId,
  targetGroupId,
  groupModule,
  itemModule,
}) => {
  if (!moduleId || !sourceGroupId || !targetGroupId) {
    throw new Error("Moving a sidebar module requires module, source group, and target group ids.");
  }
  if (String(sourceGroupId) === String(targetGroupId)) {
    return { success: true, unchanged: true };
  }

  await requestGroupModuleRelationship({
    action: "remove_relationship",
    groupId: sourceGroupId,
    moduleId,
    groupModule,
    itemModule,
  });

  try {
    return await requestGroupModuleRelationship({
      action: "add_relationship",
      groupId: targetGroupId,
      moduleId,
      groupModule,
      itemModule,
    });
  } catch (error) {
    try {
      await requestGroupModuleRelationship({
        action: "add_relationship",
        groupId: sourceGroupId,
        moduleId,
        groupModule,
        itemModule,
      });
    } catch (restoreError) {
      error.restoreError = restoreError;
      error.message = `${error.message} The original group relationship could not be restored: ${restoreError.message}`;
    }
    throw error;
  }
};

export async function fetchSidebar(email) {
  const loginEmail = email?.trim();
  if (!loginEmail)
    throw new Error("Your login email is required to load the sidebar.");
  const response = await apiRequest({
    endpoint: "https://flight.hrcrm.ai/index.php",
    params: { entryPoint: "sidebar", _: Date.now() },
    headers: { "X-Api-Key": FETCH_GPC_X_API_KEY },
  });
  if (response?.success === false || response?.status === false)
    throw new Error(response.error || response.message || "Could not load the sidebar.");
  const groups = Array.isArray(response) ? response : response?.data;
  if (!Array.isArray(groups))
    throw new Error("The sidebar returned an unexpected response.");
  return Array.isArray(response) ? groups : { ...response, data: groups };
}

// contact.api.js

export const getSidebarStats = async ({
  email,
  queries = [],
}) => {
  const params = email ? { email } : {};

  return http({
    method: "POST",
    params: { ...params },
    body: {
      action: "get_stats",
      queries: queries,
    },
  });
};
