import { inspectRankScope } from "./rank";
import { between, RighteeUiRank } from "./uiRank";

import {
  buildPresentationMutation,
  readPresentationEntry,
  TableLayoutError,
  UI_FIELD_MODULE,
} from "./tableLayout";

const clone = (value) =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const esc = (value) =>
  String(value ?? "").replaceAll("~", "~0").replaceAll("/", "~1");

export const nodeKey = (node) =>
  String(node?.id ?? node?.accessor ?? node?.name ?? node?.label ?? "");

export const rankEntry = (node) => node?.presentation?.rank ?? null;

/* =========================================================================
   PRESENTATION
   ========================================================================= */

/**
 * One normalized presentation entry for a layout node.
 *
 * Deliberately the SAME normalizer the table editor uses. A detail node's
 * `presentation` block has the same shape as a column's - `{ currentValue,
 * recordId, mutation }` per property - so sharing it means one definition of
 * `writable`, one set of typed value columns, and no chance of the two editors
 * disagreeing about whether something can be written.
 *
 * Before this, the detail editor read `node.presentation.visible.mutation`
 * directly and never asked whether the property was writable at all: an edit to
 * a read-only property was accepted in the UI and only failed at publish.
 */
export const nodeEntry = (node, property) =>
  readPresentationEntry(node, property);

/** Whether the contract will let this node's property be written. */
export const nodeWritable = (node, property) =>
  Boolean(nodeEntry(node, property).writable);

/**
 * Which property holds this node's display name.
 *
 * Sections carry `title`; tabs and fields carry `label`. Rather than assume,
 * this prefers whichever one the contract actually returned a mutation for, and
 * falls back to the key the node itself uses so the name is still displayed
 * (read-only) when neither is writable.
 */
export function namePropertyFor(node, scopeType) {
  const preferred =
    scopeType === "section" || node?.title !== undefined ? "title" : "label";

  const other = preferred === "title" ? "label" : "title";

  if (nodeWritable(node, preferred)) return preferred;
  if (nodeWritable(node, other)) return other;

  return preferred;
}

/**
 * The properties the inspector offers for one node, in display order.
 *
 * `rank` is absent on purpose: it is an opaque generated string set by
 * dragging, and there is nothing useful to type into it.
 */
export function nodeProperties(node, scopeType, viewKey) {
  const name = namePropertyFor(node, scopeType);

  /*
   * `editable` describes inline editing on a record page. A create form has no
   * such distinction - every field is an input - so it is omitted there.
   *
   * `required` and `placeholder` stay. Those are form concepts, and a create
   * form is exactly where they matter most.
   */
  const creating = viewKey === "create";

  if (scopeType === "section") {
    return creating
      ? [name, "visible", "columns"]
      : [name, "visible", "columns", "editable"];
  }

  if (scopeType === "field") {
    return creating
      ? [name, "visible", "required", "placeholder"]
      : [name, "visible", "editable", "required", "placeholder"];
  }

  return [name, "visible"];
}

/**
 * Build the mutation for any writable property of any node.
 *
 * Delegates to the table editor's builder, which clones the mutation the
 * contract supplied and sets only its typed `value_*` field. Nothing about the
 * property path, the record id or the expected value is assembled here.
 */
export function nodeMutation(node, property, value) {
  return buildPresentationMutation(node, property, value);
}

/* =========================================================================
   FIELD TYPES
   ========================================================================= */

/**
 * SuiteCRM vardef type -> the type a DETAIL or CREATE field carries.
 *
 * Deliberately not `mapVardefType` from tableLayout. The two renderers have
 * different vocabularies, and the compiled contract proves it: a detail dropdown
 * is `select` where a table column is `enum`, a detail checkbox is `boolean`
 * where a column is `bool`, and long text is `textarea` where a column is just
 * `text`. Publishing a column type into a detail layout would hand the renderer
 * a type it has no case for.
 *
 * Every value here is one the contract demonstrably uses. Anything unmapped
 * becomes `text`, which renders the value as-is - a deliberate downgrade rather
 * than a guess, because a wrong specialised renderer shows an error where plain
 * text shows the data.
 */
const DETAIL_FIELD_TYPES = {
  varchar: "text",
  name: "text",
  char: "text",
  string: "text",
  id: "text",

  text: "textarea",
  longtext: "textarea",
  html: "textarea",

  email: "email",
  url: "url",
  phone: "phone",

  enum: "select",
  dynamicenum: "select",
  radioenum: "select",
  multienum: "select",
  relate: "select",
  parent: "select",

  bool: "boolean",
  boolean: "boolean",

  int: "number",
  integer: "number",
  tinyint: "number",
  smallint: "number",
  long: "number",
  double: "number",
  float: "number",
  decimal: "number",

  currency: "currency",
  percent: "percent",

  /*
   * The contract shows no datetime variant among detail fields, only `date`.
   * A datetime therefore renders as a date and loses its time part, which is
   * visible and correctable, unlike an unknown type falling through.
   */
  date: "date",
  datetime: "date",
  datetimecombo: "date",
};

export function detailFieldType(vardefType) {
  const key = String(vardefType ?? "").trim().toLowerCase();

  return DETAIL_FIELD_TYPES[key] ?? "text";
}

/* =========================================================================
   STRUCTURAL: ADD A FIELD
   ========================================================================= */

/**
 * Payload for the guarded `outr_ui_fields` create that publishes a new field
 * into a detail, edit or create layout.
 *
 * Same mechanism as the table editor's column create: `publish_to_view` arms the
 * backend hook, which locks the view, verifies `expected_config_version`, clones
 * the active definition, generates the rank, validates the vardef source, builds
 * the replacement revision and publishes it in one transaction. No write plan is
 * assembled here.
 *
 * Two things about this payload are counter-intuitive enough to be worth stating,
 * because both were wrong in the first version of this function:
 *
 *   1. `target_block_id` is the SECTION id - `contact_information`, not
 *      `contact_tabs`. A detail layout needs no tab or block id at all: the
 *      section is unique within the view, so it fully identifies the
 *      destination. There is no `target_tab_id` and no `target_section_id`.
 *
 *   2. `vardef_type` is the RAW SuiteCRM type, e.g. `varchar`. The type the
 *      renderer uses is a separate value and lives in `placement_json.type`,
 *      e.g. `text`. They are not the same vocabulary and must not be conflated -
 *      the backend validates the vardef against the bean using the raw one.
 *
 * `placement_json` carries the field as it should first appear, read off the
 * staged node so that a flag toggled before Repair is what gets published.
 */
export function buildDetailFieldCreatePayload({
  accessor,
  label,
  renderType,
  vardefType,
  visible = true,
  editable = true,
  readonly = false,
  required = false,
  placeholder = "",
  sectionId,
  sourceModule,
  moduleKey,
  viewKey,
  expectedConfigVersion,
}) {
  const trimmedAccessor = String(accessor ?? "").trim();
  const trimmedLabel = String(label ?? "").trim();

  if (!trimmedAccessor) {
    throw new TableLayoutError("a new field needs a source field");
  }

  if (!trimmedLabel) {
    throw new TableLayoutError("a new field needs a label");
  }

  if (!vardefType) {
    throw new TableLayoutError(
      "a new field needs the vardef type reported by the module field list",
    );
  }

  if (!sourceModule) {
    throw new TableLayoutError(
      "a new field needs the source module from the Flexibility response",
    );
  }

  if (!expectedConfigVersion) {
    throw new TableLayoutError(
      "a structural change needs the configVersion that was just read",
    );
  }

  if (!sectionId) {
    throw new TableLayoutError("a new field needs the section to place it in");
  }

  return {
    action: "create",
    module: UI_FIELD_MODULE,
    data: {
      publish_to_view: true,

      target_module_key: moduleKey,
      target_view_key: viewKey,

      /* The section, which is what this key means for a detail layout. */
      target_block_id: sectionId,

      expected_config_version: expectedConfigVersion,

      source_module: sourceModule,
      source_field: trimmedAccessor,
      name: trimmedLabel,

      /* Raw SuiteCRM type. The renderer's type is in placement_json below. */
      vardef_type: vardefType,

      placement_json: JSON.stringify({
        accessor: trimmedAccessor,
        label: trimmedLabel,
        type: renderType || "text",
        visible: Boolean(visible),
        editable: Boolean(editable),
        readonly: Boolean(readonly),
        required: Boolean(required),
        placeholder: String(placeholder ?? ""),
      }),
    },
  };
}

export function visibilityMutation(contract, node, rankPath, nextVisible) {
  return nodeMutation(node, "visible", nextVisible);
}

export function rankMutation(contract, node, path, nextRank) {
  return nodeMutation(node, "rank", nextRank);
}

export function childrenAt(layout, scope) {
  if (scope.type === "block") return layout.blocks || [];
  const block = (layout.blocks || []).find((item) => nodeKey(item) === scope.blockId);
  if (scope.type === "tab") return block?.tabs || [];
  const tab = (block?.tabs || []).find((item) => nodeKey(item) === scope.tabId);
  if (scope.type === "section") return tab?.sections || [];
  const section = (tab?.sections || []).find((item) => nodeKey(item) === scope.sectionId);
  return section?.fields || [];
}

export function scopePath(scope, item) {
  const block = `/blocks/${esc(scope.blockId)}`;
  if (scope.type === "block") return `/blocks/${esc(nodeKey(item))}/rank`;
  if (scope.type === "tab") return `${block}/tabs/${esc(nodeKey(item))}/rank`;
  const tab = `${block}/tabs/${esc(scope.tabId)}`;
  if (scope.type === "section") return `${tab}/sections/${esc(nodeKey(item))}/rank`;
  return `${tab}/sections/${esc(scope.sectionId)}/fields/${esc(nodeKey(item))}/rank`;
}

export function replaceChildren(layout, scope, children) {
  const next = clone(layout);
  if (scope.type === "block") {
    next.blocks = children;
    return next;
  }
  const block = (next.blocks || []).find((item) => nodeKey(item) === scope.blockId);
  if (scope.type === "tab") block.tabs = children;
  else {
    const tab = (block.tabs || []).find((item) => nodeKey(item) === scope.tabId);
    if (scope.type === "section") tab.sections = children;
    else {
      const section = (tab.sections || []).find((item) => nodeKey(item) === scope.sectionId);
      section.fields = children;
    }
  }
  return next;
}

export function replaceNode(layout, scope, itemId, changes) {
  const children = childrenAt(layout, scope).map((item) =>
    nodeKey(item) === itemId ? { ...item, ...changes } : item,
  );
  return replaceChildren(layout, scope, children);
}

export function planMove(layout, scope, activeId, overId) {
  const current = childrenAt(layout, scope);
  const destination = current.findIndex((item) => nodeKey(item) === overId);
  const moved = current.find((item) => nodeKey(item) === activeId);
  if (!moved || destination < 0 || activeId === overId) return null;

  const report = inspectRankScope(current, {
    collection: scope.type,
    label: `${scope.type}s in ${scope.sectionId || scope.tabId || scope.blockId || "view"}`,
  });
  /*
   * Worded without "rank" on purpose. The ordering key is an implementation
   * detail the editor no longer shows anywhere, so a failure has to be
   * describable in terms of what the user can see and do.
   */
  if (!report.valid || report.unranked) {
    throw new Error(
      "The saved order of this group is incomplete, so it cannot be reordered. Reload the view and try again.",
    );
  }

  const reordered = [...current];
  const from = reordered.findIndex((item) => nodeKey(item) === activeId);
  const [active] = reordered.splice(from, 1);
  reordered.splice(Math.max(0, Math.min(destination, reordered.length)), 0, active);
  const landed = reordered.findIndex((item) => nodeKey(item) === activeId);
  const siblings = reordered.filter((item) => nodeKey(item) !== activeId);
  const { lower, upper } = RighteeUiRank.neighborRanksAt(siblings, landed);
  const nextRank = between(lower, upper);
  const ranked = reordered.map((item) =>
    nodeKey(item) === activeId ? { ...item, rank: nextRank } : item,
  );
  return { moved, nextRank, nextLayout: replaceChildren(layout, scope, ranked) };
}
