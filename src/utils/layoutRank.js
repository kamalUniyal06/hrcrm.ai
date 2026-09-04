/**
 * Rank ordering for the runtime layout metadata served by:
 *
 *   index.php?entryPoint=flexibility&api_version=v1
 *
 * The flexibility endpoint returns records already in rank
 * order, so ordering here is normally a no-op. It matters
 * because these payloads live in a react-query cache that gets
 * merged and re-read, and because a `rank` that disagrees with
 * the array position is a data problem worth surfacing rather
 * than rendering around.
 *
 * Scope rule, straight from the backend contract: ranks are
 * unique only inside their immediate parent collection. The
 * fields of one section, the tabs of one tabs-block, the
 * columns of one table. Never across two parents.
 *
 * READ ONLY. Nothing here writes a rank. These collections are
 * revision-owned, so their order changes through the canonical
 * UI-definition publish workflow, never through the positional
 * sidebar move contract in src/api/rank.api.js.
 */

import { orderByRank } from "./rank";

/**
 * Scope descriptor for a nested definition collection.
 *
 * `parentId` is the id of the immediate parent - the block,
 * tab, section or revision the collection hangs off. It is
 * part of the scope identity, so two sections' field lists are
 * never compared against each other.
 */
export const definitionScope = (collection, parentId) => ({
  collection,
  label: `${collection} of ${parentId || "layout root"}`,
  parent: parentId || "",
});

/**
 * Order one nested definition collection.
 *
 * Returns the ordered array. Invalid scopes are logged and
 * returned in the server's own order; nothing is placed by
 * weight or by index.
 */
export function orderDefinitions(items, collection, parentId, options) {
  if (!Array.isArray(items)) {
    return [];
  }

  return orderByRank(items, definitionScope(collection, parentId), options)
    .items;
}

/**
 * Visible, rank-ordered blocks of a layout.
 *
 * The filter runs first so a hidden block cannot influence the
 * scope report.
 */
export function orderLayoutBlocks(layout, options) {
  const blocks = (Array.isArray(layout?.blocks) ? layout.blocks : []).filter(
    (block) => block?.visible !== false,
  );

  return orderDefinitions(
    blocks,
    "blocks",
    layout?.viewKey || layout?.module || "layout",
    options,
  );
}

/** Visible, rank-ordered fields of a block, tab or section. */
export function orderLayoutFields(parent, options) {
  const fields = (Array.isArray(parent?.fields) ? parent.fields : []).filter(
    (field) => field?.visible !== false,
  );

  return orderDefinitions(fields, "fields", parent?.id, options);
}

/** Rank-ordered tabs of a tabs block. */
export function orderLayoutTabs(parent, options) {
  return orderDefinitions(parent?.tabs, "tabs", parent?.id, options);
}

/** Rank-ordered sections of a tab. */
export function orderLayoutSections(parent, options) {
  return orderDefinitions(parent?.sections, "sections", parent?.id, options);
}

/** Rank-ordered actions of a header, block or row. */
export function orderLayoutActions(parent, options) {
  return orderDefinitions(parent?.actions, "actions", parent?.id, options);
}

/** Rank-ordered columns of a list or table block. */
export function orderLayoutColumns(parent, options) {
  return orderDefinitions(parent?.columns, "columns", parent?.id, options);
}

/** Rank-ordered statuses of a status collection. */
export function orderLayoutStatuses(parent, options) {
  return orderDefinitions(parent?.statuses, "statuses", parent?.id, options);
}

/** Rank-ordered filter columns of a filter definition. */
export function orderLayoutFilterColumns(parent, options) {
  return orderDefinitions(
    parent?.filterColumns ?? parent?.filter_columns,
    "filter_columns",
    parent?.id,
    options,
  );
}
