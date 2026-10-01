/**
 * What changed between the published layout and the one on screen.
 *
 * Two lists come back, and the distinction matters:
 *
 *   changes  property edits to nodes that already exist server-side. Each one
 *            has a presentation mutation behind it, so each one is publishable.
 *
 *   creates  nodes the user added. The compiled detail/create contract returns
 *            no create affordance for a layout node, so these cannot be
 *            published at all.
 *
 * They used to be conflated into a count that aborted the whole publish. One
 * new field meant unrelated visibility and order edits could not go out either,
 * and the only way to recover was to discard everything. Separating them lets
 * `repair` publish what it can and report precisely what it could not.
 */

import { childrenAt, nodeKey } from "@/utils/detailEditLayout";

/** The display name of a node, whichever key it keeps it under. */
export const titleOf = (item) =>
  item?.title || item?.label || item?.accessor || item?.id || "";

/**
 * A row's identity, unique per node AND per position.
 *
 * The same accessor can legitimately appear in two sections, so the scope has to
 * be part of the id or dnd-kit would treat the two rows as one droppable.
 *
 * Lives here rather than in NodeTree because it is a plain function, and a file
 * that exports both components and helpers breaks fast refresh.
 */
export const rowIdFor = (scope, itemId) =>
  [scope.type, scope.blockId, scope.tabId, scope.sectionId, itemId]
    .filter(Boolean)
    .join(":");

export const idFor = (scope, item) => rowIdFor(scope, nodeKey(item));

/**
 * The scope a node's children live in, or null when the node is a leaf.
 *
 * Only a `tabs` block has children; a plain block is a leaf, which is why a
 * block can never be a container for tabs it does not declare.
 */
export function nextScope(scope, item) {
  const id = nodeKey(item);

  if (scope.type === "block") {
    return item.type === "tabs" ? { type: "tab", blockId: id } : null;
  }

  if (scope.type === "tab") {
    return { type: "section", blockId: scope.blockId, tabId: id };
  }

  if (scope.type === "section") {
    return {
      type: "field",
      blockId: scope.blockId,
      tabId: scope.tabId,
      sectionId: id,
    };
  }

  return null;
}

/**
 * Properties worth comparing, per scope type.
 *
 * Wider than what the inspector offers: both `label` and `title` are compared
 * for every node because which one a node uses is a property of the node, and a
 * node that carries neither simply reports no change for both.
 *
 * This list is the reason an edit publishes at all. The diff used to cover only
 * `visible` and `rank`, so any other property could be changed in the UI and
 * would then be silently dropped at publish time.
 */
const DIFFABLE = {
  block: ["label", "title", "visible", "rank"],
  tab: ["label", "title", "visible", "rank"],
  section: ["label", "title", "visible", "columns", "editable", "rank"],
  field: [
    "label",
    "title",
    "visible",
    "editable",
    "readonly",
    "required",
    "placeholder",
    "rank",
  ],
};

/**
 * Compare one property the way the renderer reads it.
 *
 * `visible` is absent-means-true, so `undefined` and `true` are the same value
 * and toggling twice is correctly no change at all. The booleans that default
 * off get plain coercion, where `undefined` and `false` agree instead.
 */
function sameValue(property, left, right) {
  if (property === "visible") {
    return (left !== false) === (right !== false);
  }

  if (property === "editable" || property === "readonly" || property === "required") {
    return Boolean(left) === Boolean(right);
  }

  if (property === "columns") {
    return Number(left ?? 0) === Number(right ?? 0);
  }

  if (property === "rank") {
    return left === right;
  }

  return String(left ?? "") === String(right ?? "");
}

export function collectDraftChanges(serverLayout, draftLayout) {
  const changes = [];
  const creates = [];

  const visit = (scope) => {
    const serverItems = childrenAt(serverLayout, scope);
    const draftItems = childrenAt(draftLayout, scope);

    const serverById = new Map(
      serverItems.map((item) => [nodeKey(item), item]),
    );

    draftItems.forEach((draftItem) => {
      const serverItem = serverById.get(nodeKey(draftItem));

      if (!serverItem) {
        /*
         * Children are not visited. A new section's fields are part of the same
         * unpublishable subtree, and listing each of them separately would
         * report one user action as several failures.
         */
        creates.push({
          scope,
          itemId: nodeKey(draftItem),
          label: titleOf(draftItem),
          type: scope.type,
        });

        return;
      }

      (DIFFABLE[scope.type] ?? []).forEach((property) => {
        if (sameValue(property, serverItem[property], draftItem[property])) {
          return;
        }

        changes.push({
          scope,
          itemId: nodeKey(draftItem),
          property,
          value: draftItem[property],
        });
      });

      const childScope = nextScope(scope, draftItem);

      if (childScope) visit(childScope);
    });
  };

  visit({ type: "block" });

  return { changes, creates };
}

/** Every field accessor already placed anywhere in the layout. */
export function placedFieldAccessors(layout) {
  const placed = new Set();

  (layout?.blocks ?? []).forEach((block) => {
    (block?.tabs ?? []).forEach((tab) => {
      (tab?.sections ?? []).forEach((section) => {
        (section?.fields ?? []).forEach((field) => {
          const key = nodeKey(field);

          if (key) placed.add(key);
        });
      });
    });
  });

  return placed;
}
