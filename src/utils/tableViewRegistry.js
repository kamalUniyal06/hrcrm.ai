/**
 * Which module/view pairs the table editor can open.
 *
 * There is no "list every published view" endpoint, so the set is derived
 * from the Sidebar global-component response, which is the same payload the
 * live navigation is built from. Every entity link there carries the two keys
 * the Flexibility read needs:
 *
 *     /entity/{module_key}/list/{view_key}
 *
 * That keeps the editor in step with the app: a module that is reachable in
 * the sidebar is editable here, and one that is not does not appear.
 *
 * Derived, not hardcoded, and deliberately not filtered by `is_active`: a
 * module switched off in the sidebar still has a published table view whose
 * columns someone may need to fix before turning it back on. Inactive entries
 * are flagged instead of dropped.
 *
 * Not every listed module has a published table view. `deals` and `contacts`
 * do; some navigation targets answer 404. Nothing is probed up front - the
 * contract is read when a view is selected and a 404 is reported against that
 * view rather than silently hiding it.
 */

import { isActive } from "./sidebarLayout";

/** Fallback when the sidebar payload cannot be read at all. */
export const DEFAULT_VIEW_KEY = "table";

/**
 * Pull `{ moduleKey, viewKey }` out of an entity navigation path.
 *
 * Accepts the two shapes the sidebar uses and ignores everything else, such
 * as `/view-reports`, which is a page rather than an entity view.
 *
 *   /entity/deals/list/table  ->  { moduleKey: "deals", viewKey: "table" }
 *   /entity/deals/view        ->  { moduleKey: "deals", viewKey: "table" }
 */
export function parseEntityNavigation(navigation) {
  if (typeof navigation !== "string" || !navigation.trim()) {
    return null;
  }

  /* Drop any query string and normalize the slashes. */
  const path = navigation.trim().split("?")[0];

  const segments = path.split("/").filter(Boolean);

  if (segments.length < 2 || segments[0].toLowerCase() !== "entity") {
    return null;
  }

  const moduleKey = segments[1];

  if (!moduleKey) {
    return null;
  }

  /* /entity/:key/list/:view */
  if (segments.length >= 4 && segments[2].toLowerCase() === "list") {
    return { moduleKey, viewKey: segments[3] || DEFAULT_VIEW_KEY };
  }

  /* /entity/:key/view and /entity/:key */
  if (segments.length === 2 || segments[2].toLowerCase() === "view") {
    return { moduleKey, viewKey: DEFAULT_VIEW_KEY };
  }

  /* /entity/:key/create, /entity/:key/:id/edit and friends are not list views. */
  return null;
}

/**
 * Every editable table view in the sidebar payload, in sidebar order.
 *
 * The payload already arrives in rank order, groups then modules, so the
 * order here is the order the user sees in the nav. Nothing is re-sorted and
 * no rank is compared, because this list is presentation only - it is not a
 * scope that gets written back.
 *
 * Duplicates are collapsed on `moduleKey:viewKey`. Several sidebar entries
 * can point at the same view; the first one wins and the rest are recorded
 * as aliases so the label stays recognisable.
 */
export function collectTableViews(sidebarPayload) {
  const groups = Array.isArray(sidebarPayload)
    ? sidebarPayload
    : Array.isArray(sidebarPayload?.data)
      ? sidebarPayload.data
      : [];

  const seen = new Map();

  groups.forEach((group) => {
    const modules = Array.isArray(group?.data) ? group.data : [];

    modules.forEach((module) => {
      const parsed = parseEntityNavigation(module?.navigation);

      if (!parsed) {
        return;
      }

      const id = `${parsed.moduleKey}:${parsed.viewKey}`;

      if (seen.has(id)) {
        seen.get(id).aliases.push(module?.name ?? parsed.moduleKey);

        return;
      }

      seen.set(id, {
        id,

        moduleKey: parsed.moduleKey,
        viewKey: parsed.viewKey,

        /* Sidebar label, replaced by the contract's own label once read. */
        label: module?.name ?? parsed.moduleKey,

        /* Where it sits in the nav, for grouping the picker. */
        groupName: group?.group_name ?? "",

        /* The SugarBean behind it, for reference only. */
        sourceModule: module?.module_name ?? null,

        /* Sidebar visibility, shown as a hint rather than used as a filter. */
        sidebarActive: isActive(module) && isActive(group),

        aliases: [],
      });
    });
  });

  return [...seen.values()];
}

/**
 * Group the flat list for rendering, preserving sidebar order in both the
 * group sequence and the views inside each group.
 */
export function groupTableViews(views) {
  const order = [];
  const byGroup = new Map();

  (Array.isArray(views) ? views : []).forEach((view) => {
    const key = view.groupName || "Other";

    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      order.push(key);
    }

    byGroup.get(key).push(view);
  });

  return order.map((groupName) => ({
    groupName,
    views: byGroup.get(groupName),
  }));
}

/**
 * Sibling view keys for a module, taken from the contract that was read.
 *
 * `config.view.available` is where the live payload lists them. The registry
 * only knows the view the sidebar links to, so this is what surfaces a
 * module's other views once one of them has been opened.
 */
export function viewKeysFromContract(model, fallbackViewKey = DEFAULT_VIEW_KEY) {
  const keys = Array.isArray(model?.availableViewKeys)
    ? model.availableViewKeys.filter(Boolean)
    : [];

  if (!keys.length) {
    return [fallbackViewKey];
  }

  return keys.includes(fallbackViewKey) ? keys : [fallbackViewKey, ...keys];
}

/** Stable id for a module/view pair, matching `collectTableViews`. */
export const viewId = (moduleKey, viewKey) => `${moduleKey}:${viewKey}`;
