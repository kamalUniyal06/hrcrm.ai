/**
 * Shared model for the sidebar layout coming out of:
 *
 *   index.php?entryPoint=flexibility&global_component_name=Sidebar
 *
 * Both the layout editor (settings/layout) and the live
 * sidebar read through here, so what you arrange in the
 * editor is exactly what renders in the app.
 *
 * Two backend fields drive everything:
 *
 *   rank       opaque ASCII string, ascending, binary order.
 *              Stored as `rank_key`, exposed as `rank`.
 *   is_visible 1 / 0. Whether it shows in the sidebar.
 *
 * The group and item module names come from each response record.
 *
 * `weight` is gone. Ordering is never numeric and never comes
 * from the array index - see src/utils/rank.js.
 *
 * Two scopes exist here, and ranks are only ever compared
 * inside one of them:
 *
 *   groups   the global group list
 *   modules  the modules of one group_name
 */

import { orderByRank, toRankedRecord } from "./rank.js";

/** The HR CRM metadata service used by the layout editors. */
export const getMetadataEndpoint = () => "https://flight.hrcrm.ai/index.php";

/** Scope descriptor: the global UI group list. */
export const groupScope = (module) => ({
  collection: module,
  label: "sidebar groups",
});

/**
 * Scope descriptor: UI modules inside one group.
 *
 * `group_name` is both the scope key and the column every
 * module move sends, so the backend knows which scope to
 * validate the neighbour IDs against.
 */
export const moduleScope = (groupName, module) => ({
  collection: module,
  label: `sidebar modules in group "${groupName ?? ""}"`,
  group_name: groupName ?? "",
});

/**
 * is_visible is authoritative. Older sidebar responses may expose the
 * same value as visible, so accept that alias while reading.
 *
 * Anything unrecognised counts as visible, so a record
 * never disappears from the sidebar because of an
 * unexpected value.
 */
export const isVisible = (record) => {
  const value = record?.is_visible ?? record?.visible;

  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value) !== "0" && String(value).toLowerCase() !== "false";
};

/**
 * The value to send for is_visible. The column is numeric.
 */
export const toVisibilityFlag = (visible) => (visible ? 1 : 0);

/**
 * Locally created records have no server row yet,
 * so they can never be written to.
 */
export const isPersistableId = (id) =>
  id !== null && id !== undefined && !String(id).startsWith("local-");

/**
 * Put the response into rank order and coerce rank and
 * is_visible and show_count into consistent types.
 *
 * We deliberately do NOT reassign ranks. The rank belongs to
 * the backend; the editor shows exactly what is stored.
 *
 * The backend already returns rank order, so the sort here is
 * a no-op for a clean response. It earns its keep after
 * optimistic reorders, where the cached array order and the
 * ranks can disagree.
 *
 * `onInvalid` is called with a report for any scope holding a
 * missing or duplicate rank, so the caller can surface it and
 * reload. Nothing is silently repositioned.
 */
export function normalizeSidebarResponse(response, { onInvalid } = {}) {
  const raw = Array.isArray(response) ? response : response?.data || [];

  const groups = raw.map(toRankedRecord);

  const ordered = orderByRank(groups, groupScope(groups[0]?.module), {
    onInvalid,
  }).items;

  return ordered.map((group) => {
    const fields = (Array.isArray(group.data) ? group.data : []).map(
      toRankedRecord,
    );

    const orderedFields = orderByRank(
      fields,
      moduleScope(group.group_name, fields[0]?.module),
      { onInvalid },
    ).items;

    return {
      ...group,

      is_visible: isVisible(group),

      data: orderedFields.map((item) => ({
        ...item,

        is_visible: isVisible(item),
        show_count: ["1", "true"].includes(String(item.show_count).toLowerCase()),
      })),
    };
  });
}

/**
 * Every rank problem across the whole sidebar payload, one
 * report per scope. Used to decide whether to show an error
 * and refetch.
 */
export function inspectSidebarRanks(groups) {
  const reports = [];

  const collect = (report) => {
    if (report && !report.valid) {
      reports.push(report);
    }
  };

  const list = Array.isArray(groups) ? groups : [];

  collect(orderByRank(list, groupScope(list[0]?.module)).report);

  list.forEach((group) => {
    collect(
      orderByRank(
        group?.data ?? [],
        moduleScope(group?.group_name, group?.data?.[0]?.module),
      ).report,
    );
  });

  return reports;
}

/**
 * Narrow normalized data down to what the live sidebar
 * should render.
 *
 * A group is dropped when it is hidden, and also when
 * every field inside it is hidden - an empty heading is
 * just noise.
 */
export function selectVisibleGroups(groups) {
  return groups
    .filter(isVisible)
    .map((group) => ({
      ...group,
      data: (group.data ?? []).filter(isVisible),
    }))
    .filter((group) => group.data.length > 0);
}
