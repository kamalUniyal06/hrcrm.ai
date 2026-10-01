/**
 * Editor model for the published Flexibility table contract.
 *
 * ---------------------------------------------------------------------------
 * THE ONE RULE
 * ---------------------------------------------------------------------------
 *
 * Flexibility is read-only. It compiles the current published UI and, for the
 * presentation values it supports, hands back a ready-to-send SmartGateway
 * mutation sitting right next to the value being edited.
 *
 * So this module NEVER invents an owner id, a property path, a record id, an
 * expected value or a revision id. It deep-clones the mutation the server
 * returned beside the exact value the user touched, changes only that
 * mutation's typed `value_*` field, and hands it back. Everything else on the
 * payload travels through untouched.
 *
 * Two consequences that are easy to get wrong and are enforced here:
 *
 *   1. `expected_value_*` stays at the PREVIOUSLY RENDERED value, not the
 *      desired one. It is the optimistic-concurrency check. `withTypedValue`
 *      refuses to touch it.
 *
 *   2. A `create` mutation is never rewritten into an `update`. After a
 *      successful first write the contract is refetched and the server hands
 *      back the new record id plus an `update` mutation. Re-sending a stale
 *      `create` is rejected as a duplicate.
 *
 * `is_active: 1` on an outr_ui_properties row means "this override
 * participates". It is NOT the displayed visibility, which lives in
 * `value_boolean`. Nothing here uses `is_active` or `deleted` as a substitute
 * for hiding a view or a column.
 */

import {
  compareRankValues,
  isRankValue,
  orderByRank,
} from "./rank";

/* =========================================================================
   MODULES AND LIMITS
   ========================================================================= */

/** Presentation overrides for views and columns. */
export const UI_PROPERTY_MODULE = "outr_ui_properties";

/** Guarded field catalog. A create here can publish a revision. */
export const UI_FIELD_MODULE = "outr_ui_fields";

/** Column width bounds accepted by the backend, in pixels. */
export const WIDTH_MIN = 40;
export const WIDTH_MAX = 2000;

/**
 * The presentation values this editor can write, and the typed column each
 * one lives in. Anything not listed is rendered read-only rather than guessed
 * at.
 */
export const PRESENTATION_KINDS = {
  /*
   * The four this editor has always written.
   */
  visible: { valueField: "value_boolean", valueType: "boolean" },
  width: { valueField: "value_integer", valueType: "integer" },
  rank: { valueField: "value_text", valueType: "string" },
  icon: { valueField: "value_text", valueType: "string" },

  /*
   * Everything else a column or status carries.
   *
   * These used to be read as "structural flags, owned by the revision and
   * read-only here", and they were - but only because this map is the gate.
   * `toPresentation` builds entries for the keys listed HERE and discards the
   * rest, so a `presentation.sortable` block arriving with a mutation attached
   * was being thrown away before anything could ask whether it was writable.
   *
   * Listing them does not make them writable. `writable` is still
   * `Boolean(spec && mutation)`, so a property the compiler sends no mutation
   * for stays read-only and the inspector says so. What listing them does is
   * let the editor USE the mutation when there is one, instead of deciding in
   * advance that there never is.
   *
   * The typed column per property comes from the value's own type, which is
   * the same rule the documented four follow: a flag is `value_boolean`, a
   * pixel count is `value_integer`, text and JSON are `value_text`.
   */
  label: { valueField: "value_text", valueType: "string" },
  sortable: { valueField: "value_boolean", valueType: "boolean" },
  searchable: { valueField: "value_boolean", valueType: "boolean" },
  editable: { valueField: "value_boolean", valueType: "boolean" },
  resizable: { valueField: "value_boolean", valueType: "boolean" },
  minWidth: { valueField: "value_integer", valueType: "integer" },
  maxWidth: { valueField: "value_integer", valueType: "integer" },
  color: { valueField: "value_text", valueType: "string" },
  showAmount: { valueField: "value_boolean", valueType: "boolean" },

  /*
   * Carried by detail and create layout nodes rather than table columns.
   *
   * `title` is the display name of a section, where a tab or field uses
   * `label`. Both are listed because which one a node uses is a property of the
   * node, and the detail inspector resolves that per node rather than assuming.
   *
   * `columns` is a section's column count, not a list of columns.
   */
  title: { valueField: "value_text", valueType: "string" },
  columns: { valueField: "value_integer", valueType: "integer" },

  /*
   * Also carried by detail and create fields, all three with mutations.
   *
   * `readonly` is not the inverse of `editable`: the compiled contract sends
   * both, and a field can be editable in principle while readonly in this
   * view, so neither is derived from the other here.
   */
  readonly: { valueField: "value_boolean", valueType: "boolean" },
  required: { valueField: "value_boolean", valueType: "boolean" },
  placeholder: { valueField: "value_text", valueType: "string" },
};

/**
 * Properties the inspector offers, per owner, in the order they are shown.
 *
 * `rank` is absent on purpose. It is an opaque generated string, it is set by
 * dragging, and there is nothing useful to type into it.
 */
export const COLUMN_PROPERTIES = [
  "label",
  "visible",
  "width",
  "minWidth",
  "maxWidth",
  "resizable",
  "sortable",
  "searchable",
  "editable",
];

/*
 * `showAmount` is deliberately not here.
 *
 * It stays in PRESENTATION_KINDS because `toStatus` resolves it for the LIVE
 * table, which needs to know whether to total a currency field beside the
 * count. It is just not something this editor offers: the flag is only
 * meaningful when the layout also names an `amountKey`, and that is not
 * editable here, so a switch for it would let someone turn on a total with
 * nothing to total.
 */
export const STATUS_PROPERTIES = ["label", "visible", "icon", "color"];

/**
 * Everything a staged mutation may target, per owner.
 *
 * Wider than the inspector lists because `rank` is staged by dragging rather
 * than by a control, and `repair` has to be able to build it.
 */
export const WRITABLE_PROPERTIES = {
  column: [...COLUMN_PROPERTIES, "rank"],
  status: [...STATUS_PROPERTIES, "rank"],
  view: ["visible", "rank"],
};

/** Human wording for one property, for labels and error messages. */
export const PROPERTY_LABELS = {
  label: "Name",
  title: "Name",
  columns: "Columns per row",
  readonly: "Read only",
  required: "Required",
  placeholder: "Placeholder",
  visible: "Visible",
  width: "Width",
  minWidth: "Minimum width",
  maxWidth: "Maximum width",
  resizable: "Resizable",
  sortable: "Sortable",
  searchable: "Searchable",
  editable: "Editable inline",
  icon: "Icon",
  color: "Color",
  showAmount: "Show amount",
  rank: "Position",
};

/** Raised when the contract cannot support the edit that was asked for. */
export class TableLayoutError extends Error {
  constructor(message, details = {}) {
    super(message);

    this.name = "TableLayoutError";
    Object.assign(this, details);
  }
}

/* =========================================================================
   SCOPES
   ========================================================================= */

/**
 * Ranks are unique inside a scope and are only ever compared inside one.
 * The scope for table columns is a single view.
 */
export const columnScope = (moduleKey, viewKey) => ({
  collection: "ui_view_columns",
  label: `columns of ${moduleKey ?? "?"}/${viewKey ?? "?"}`,
  module_key: moduleKey ?? "",
  view_key: viewKey ?? "",
});

/** Status-stat ranks are unique inside one compiled view. */
export const statusScope = (moduleKey, viewKey) => ({
  collection: "ui_view_statuses",
  label: `status stats of ${moduleKey ?? "?"}/${viewKey ?? "?"}`,
  module_key: moduleKey ?? "",
  view_key: viewKey ?? "",
});

/* =========================================================================
   PRESENTATION ENTRIES
   ========================================================================= */

/**
 * Normalize one `{ currentValue, recordId, mutation }` entry.
 *
 * `writable` is false when the compiler did not attach a mutation, which is
 * how it says "this value is derived, not overridable". The editor renders
 * those as read-only instead of assembling a payload for them.
 */
function toPresentationEntry(raw, kind) {
  const spec = PRESENTATION_KINDS[kind];

  const mutation =
    raw && typeof raw.mutation === "object" && raw.mutation ? raw.mutation : null;

  return {
    kind,
    valueField: spec?.valueField ?? null,
    currentValue: raw ? raw.currentValue : undefined,
    recordId: raw?.recordId ?? null,
    mutation,
    writable: Boolean(spec && mutation),
  };
}

/** Normalize a whole `presentation` object into the kinds we understand. */
function toPresentation(raw) {
  const source = raw && typeof raw === "object" ? raw : {};

  return Object.keys(PRESENTATION_KINDS).reduce((accumulator, kind) => {
    accumulator[kind] = toPresentationEntry(source[kind], kind);

    return accumulator;
  }, {});
}

/**
 * Normalize one presentation entry off a RAW contract column or view.
 *
 * The layout editor normalizes a whole contract up front. The live table
 * renders the raw payload and only needs a single value at a time - the width
 * of the column being dragged - so it reads one entry through this instead.
 *
 * Both paths therefore share one normalizer and one set of write rules. If the
 * live table built its own payload the two could drift, and the drift would
 * show up as writes that the backend rejects.
 */
export function readPresentationEntry(owner, kind) {
  return toPresentationEntry(owner?.presentation?.[kind], kind);
}

/**
 * The value to show for a presentation kind.
 *
 * `currentValue` from the presentation block is authoritative because it is
 * what the compiler actually resolved. The plain column field is only a
 * fallback for a value with no presentation entry at all.
 */
export function presentationValue(entry, fallback) {
  return entry && entry.currentValue !== undefined && entry.currentValue !== null
    ? entry.currentValue
    : fallback;
}

/* =========================================================================
   CONTRACT -> EDITOR MODEL
   ========================================================================= */

/** Booleans arrive as true/1/"1" depending on the value column. */
const toBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value) !== "0" && String(value).toLowerCase() !== "false";
};

const toWholeNumber = (value, fallback) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

/** Width the backend will accept, clamped to the documented bounds. */
export function clampWidth(value, column) {
  const min = Math.max(WIDTH_MIN, toWholeNumber(column?.minWidth, WIDTH_MIN));
  const max = Math.min(WIDTH_MAX, toWholeNumber(column?.maxWidth, WIDTH_MAX));

  const width = toWholeNumber(value, min);

  /* A definition with min > max would otherwise produce an impossible range. */
  const upper = Math.max(min, max);

  return Math.max(min, Math.min(width, upper));
}

/** Normalize one column of `config.columns`. */
function toColumn(raw) {
  const presentation = toPresentation(raw?.presentation);

  const accessor = raw?.accessor ?? "";

  return {
    /* dnd-kit and React need a stable key; the accessor is the stable one. */
    id: accessor,
    accessor,

    type: raw?.type ?? "text",

    /*
     * Resolved presentation values.
     *
     * Every one of these reads the presentation entry first and the plain
     * definition field second, because `currentValue` is what the compiler
     * actually resolved. That was already true of visible/width/rank; the rest
     * were reading the definition directly, which meant an override would have
     * been stored and then not displayed.
     */
    label:
      String(presentationValue(presentation.label, raw?.label) ?? "").trim() ||
      accessor,
    visible: toBoolean(presentationValue(presentation.visible, raw?.visible), true),
    width: toWholeNumber(presentationValue(presentation.width, raw?.width), 220),
    rank: isRankValue(presentationValue(presentation.rank, raw?.rank))
      ? presentationValue(presentation.rank, raw?.rank)
      : null,

    minWidth: toWholeNumber(
      presentationValue(presentation.minWidth, raw?.minWidth),
      WIDTH_MIN,
    ),
    maxWidth: toWholeNumber(
      presentationValue(presentation.maxWidth, raw?.maxWidth),
      WIDTH_MAX,
    ),
    resizable: toBoolean(
      presentationValue(presentation.resizable, raw?.resizable),
      false,
    ),
    sortable: toBoolean(
      presentationValue(presentation.sortable, raw?.sortable),
      false,
    ),
    searchable: toBoolean(
      presentationValue(presentation.searchable, raw?.searchable),
      false,
    ),
    editable: toBoolean(
      presentationValue(presentation.editable, raw?.editable),
      false,
    ),

    presentation,

    /* Kept so the inspector can show the definition exactly as published. */
    definition: raw,
  };
}

/** Normalize an icon from either the resolved object or its stored JSON. */
export function normalizeStatusIcon(value) {
  let source = value;

  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      source = {};
    }
  }

  if (!source || typeof source !== "object") {
    source = {};
  }

  return {
    color: typeof source.color === "string" ? source.color : "",
    library: typeof source.library === "string" ? source.library : "",
    name: typeof source.name === "string" ? source.name : "",
  };
}

/** Normalize one item of `config.statusConfig`. */
function toStatus(raw) {
  const presentation = toPresentation(raw?.presentation);
  const key = raw?.key ?? "";

  return {
    /* Preserve legacy filters/click handlers used by the live status row. */
    ...raw,
    id: key,
    key,
    label:
      String(presentationValue(presentation.label, raw?.label) ?? "").trim() ||
      key,
    color: String(presentationValue(presentation.color, raw?.color) ?? ""),
    filters: raw?.filters ?? {},
    amountKey: raw?.amountKey ?? "",
    showAmount: toBoolean(
      presentationValue(presentation.showAmount, raw?.showAmount),
      false,
    ),
    visible: toBoolean(presentationValue(presentation.visible, raw?.visible), true),
    rank: isRankValue(presentationValue(presentation.rank, raw?.rank))
      ? presentationValue(presentation.rank, raw?.rank)
      : null,
    icon: normalizeStatusIcon(
      presentationValue(presentation.icon, raw?.icon),
    ),
    presentation,
    definition: raw,
  };
}

/**
 * Resolve, normalize and rank-order the status stats used by both the editor
 * and the live table. Keeping one path here is important: the compiler's
 * `presentation.*.currentValue` is authoritative over the plain fallback
 * fields, including when visibility resolves to `false`.
 */
export function normalizeStatusConfig(
  rawStatuses,
  { moduleKey, viewKey, onInvalidRanks } = {},
) {
  const statuses = (Array.isArray(rawStatuses) ? rawStatuses : []).map(toStatus);

  return orderByRank(statuses, statusScope(moduleKey, viewKey), {
    onInvalid: onInvalidRanks,
  });
}

/**
 * Turn a Flexibility response into the shape the editor holds in state.
 *
 * Columns come back in rank order. The backend already sends them ordered, so
 * the sort is a no-op for a clean payload; it earns its keep after an
 * optimistic reorder, where the array order and the ranks can disagree.
 *
 * `onInvalidRanks` is called with a report when a column has no rank or two
 * columns share one. Those columns still render, in the order the server
 * sent, but reordering is blocked until the data is repaired. No order is
 * invented.
 */
export function normalizeTableContract(
  contract,
  { moduleKey, viewKey, onInvalidRanks, onInvalidStatusRanks } = {},
) {
  if (!contract || typeof contract !== "object") {
    return null;
  }

  const rawColumns = Array.isArray(contract?.config?.columns)
    ? contract.config.columns
    : [];

  const columns = rawColumns.map(toColumn);

  const rawStatuses = Array.isArray(contract?.config?.statusConfig)
    ? contract.config.statusConfig
    : [];

  const scope = columnScope(
    contract.moduleKey ?? moduleKey,
    contract.viewKey ?? viewKey,
  );

  const { items: ordered, report } = orderByRank(columns, scope, {
    onInvalid: onInvalidRanks,
  });

  const { items: orderedStatuses, report: statusRankReport } =
    normalizeStatusConfig(rawStatuses, {
      moduleKey: contract.moduleKey ?? moduleKey,
      viewKey: contract.viewKey ?? viewKey,
      onInvalidRanks: onInvalidStatusRanks,
    });

  /*
   * `config.view.available` is where the real payload lists sibling views.
   * `availableViewKeys` is accepted too because the integration guide uses
   * that name, but nothing depends on it being present.
   */
  const availableViewKeys = Array.isArray(contract.availableViewKeys)
    ? contract.availableViewKeys
    : Array.isArray(contract?.config?.view?.available)
      ? contract.config.view.available
      : [];

  return {
    /* Identity, sent back verbatim on structural writes. */
    schemaVersion: contract.schemaVersion ?? null,
    configVersion: contract.configVersion ?? null,
    module: contract.module ?? null,
    moduleKey: contract.moduleKey ?? moduleKey ?? null,
    viewKey: contract.viewKey ?? viewKey ?? null,
    label: contract.label ?? contract.moduleKey ?? moduleKey ?? "View",

    availableViewKeys,

    /* View-level presentation, with its own mutations. */
    view: {
      visible: toBoolean(
        presentationValue(
          toPresentation(contract.presentation).visible,
          contract.visible,
        ),
        true,
      ),
      rank: presentationValue(
        toPresentation(contract.presentation).rank,
        contract.rank,
      ),
      presentation: toPresentation(contract.presentation),
    },

    /*
     * Resolved values for the module itself. The payload carries no mutations
     * here, so this is display-only; module activation goes through
     * outr_ui_modules.is_active, not through a presentation property.
     */
    modulePresentation: contract.modulePresentation ?? null,

    columns: ordered,

    statuses: orderedStatuses,

    rankReport: report,
    rankOrderable: Boolean(report?.valid) && !report?.unranked,

    statusRankReport,
    statusRankOrderable:
      Boolean(statusRankReport?.valid) && !statusRankReport?.unranked,

    /* Transient request state the compiler echoed back. */
    current: contract.current ?? null,

    /* The untouched payload, so mutations are always cloned from source. */
    raw: contract,
  };
}

/* =========================================================================
   MUTATION CLONING
   ========================================================================= */

/**
 * Deep copy, so nothing the editor sends can alias the react-query cache.
 *
 * Mutating a cached mutation object in place would leave the next render
 * showing an edit that was never stored.
 */
function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

/**
 * Clone the returned mutation and set only its typed value field.
 *
 * `expected_value_*` is deliberately left exactly as the server sent it. It
 * describes the value that was on screen, which is what makes the write
 * safe to reject when someone else got there first.
 */
export function withTypedValue(entry, nextValue) {
  if (!entry) {
    throw new TableLayoutError("no presentation entry was supplied");
  }

  if (!entry.writable) {
    /*
     * Named the way the UI names it. `entry.kind` is the contract's key, and
     * leaking it here put words like "rank" in front of users in editors that
     * deliberately never show the ordering key.
     */
    throw new TableLayoutError(
      `${PROPERTY_LABELS[entry.kind] ?? entry.kind} is not directly writable on this view; Flexibility returned no mutation for it`,
      { kind: entry.kind },
    );
  }

  const spec = PRESENTATION_KINDS[entry.kind];

  const mutation = deepClone(entry.mutation);

  if (!mutation.data || typeof mutation.data !== "object") {
    throw new TableLayoutError(
      `the ${entry.kind} mutation carries no data object`,
      { kind: entry.kind },
    );
  }

  if (mutation.action === "update" && !mutation.id) {
    throw new TableLayoutError(
      `the ${entry.kind} update mutation is missing the override record id`,
      { kind: entry.kind },
    );
  }

  mutation.data[spec.valueField] = nextValue;

  return mutation;
}

/**
 * True when the value on screen already matches, so there is nothing to send.
 *
 * Widths are compared as whole numbers and ranks as bytes; a boolean is
 * compared after the same coercion the renderer used.
 */
export function isNoOpChange(entry, nextValue) {
  const current = entry?.currentValue;

  if (entry?.kind === "visible") {
    return toBoolean(current, true) === toBoolean(nextValue, true);
  }

  if (entry?.kind === "width") {
    return toWholeNumber(current, null) === toWholeNumber(nextValue, null);
  }

  if (entry?.kind === "rank") {
    if (!isRankValue(current) || !isRankValue(nextValue)) {
      return false;
    }

    return compareRankValues(current, nextValue) === 0;
  }

  if (entry?.kind === "icon") {
    const currentIcon = normalizeStatusIcon(current);
    const nextIcon = normalizeStatusIcon(nextValue);

    return (
      currentIcon.color === nextIcon.color &&
      currentIcon.library === nextIcon.library &&
      currentIcon.name === nextIcon.name
    );
  }

  /*
   * The rest compare through the same coercion the renderer used, by declared
   * value type. A raw `===` would treat the 1 the backend stored and the true
   * the switch produced as a change and send a pointless write on every save.
   *
   * `visible` keeps its own branch above rather than joining the boolean case,
   * because its documented fallback for an absent value is `true` and the new
   * flags all default to `false`.
   */
  const spec = PRESENTATION_KINDS[entry?.kind];

  if (spec?.valueType === "boolean") {
    return toBoolean(current, false) === toBoolean(nextValue, false);
  }

  if (spec?.valueType === "integer") {
    return toWholeNumber(current, null) === toWholeNumber(nextValue, null);
  }

  if (spec?.valueType === "string") {
    return String(current ?? "") === String(nextValue ?? "");
  }

  return current === nextValue;
}

/* =========================================================================
   GENERIC PRESENTATION WRITE
   ========================================================================= */

/**
 * Put one value into the shape its typed column expects.
 *
 * Coercion is per property rather than per value type because two integer
 * properties can have different valid ranges: `width` is clamped to the
 * column's own min/max, while the min and max themselves are clamped to the
 * bounds the backend accepts.
 */
function coercePresentationValue(kind, value, target) {
  const spec = PRESENTATION_KINDS[kind];

  if (!spec) {
    throw new TableLayoutError(
      `${kind} is not a presentation property this editor knows how to write`,
      { kind },
    );
  }

  if (kind === "rank") {
    if (!isRankValue(value)) {
      throw new TableLayoutError(
        `a rank must be a non-empty string, received ${JSON.stringify(value)}`,
        { kind, rank: value },
      );
    }

    return value;
  }

  if (kind === "icon") {
    /* The contract owns the color; the picker only supplies library and name. */
    return JSON.stringify(
      normalizeStatusIcon({ color: target?.icon?.color ?? "", ...value }),
    );
  }

  if (kind === "width") {
    return clampWidth(value, target);
  }

  if (kind === "minWidth" || kind === "maxWidth") {
    return clampWidth(value, { minWidth: WIDTH_MIN, maxWidth: WIDTH_MAX });
  }

  if (kind === "label" || kind === "title") {
    const trimmed = String(value ?? "").trim();

    /*
     * A blank header is not a header. The backend would store it and the table
     * would render a nameless column, so it is refused here where the user can
     * still see the field they emptied.
     */
    if (!trimmed) {
      throw new TableLayoutError("a name cannot be empty", { kind });
    }

    return trimmed;
  }

  if (kind === "columns") {
    /*
     * A section lays its fields out in this many columns. Zero would render an
     * empty section and a large number would render unreadable slivers, so the
     * range is capped at what a detail pane can actually show.
     */
    const count = toWholeNumber(value, 1);

    return Math.max(1, Math.min(count, 4));
  }

  if (spec.valueType === "boolean") {
    return Boolean(value);
  }

  if (spec.valueType === "integer") {
    return toWholeNumber(value, 0);
  }

  return String(value ?? "");
}

/**
 * Build the mutation for any presentation property of any owner.
 *
 * One function instead of the per-property builders below, because the write
 * rule never varied: clone the mutation Flexibility returned for that property
 * and set its typed value. The old builders differed only in which coercion
 * ran first, which is now `coercePresentationValue`.
 *
 * This still cannot invent a write. `withTypedValue` throws when the entry
 * carries no mutation, so an unsupported property fails here rather than being
 * posted as a guess.
 */
export function buildPresentationMutation(target, kind, nextValue) {
  /*
   * Normalized, not read raw.
   *
   * `withTypedValue` needs `kind` and `writable`, and both are derived - the
   * contract only sends `{ recordId, currentValue, mutation }`. Passing
   * `target.presentation[kind]` straight through worked for the table editor,
   * whose model is normalized up front, and failed for every detail and create
   * node, which are held raw. It failed in the most confusing way possible
   * too: `writable` came back `undefined`, so a perfectly writable property
   * was rejected as unwritable, and `kind` came back `undefined`, so the
   * message named the property "undefined".
   */
  return withTypedValue(
    readPresentationEntry(target, kind),
    coercePresentationValue(kind, nextValue, target),
  );
}

/* =========================================================================
   HIGH LEVEL EDIT BUILDERS
   ========================================================================= */

/*
 * Named builders, kept as the vocabulary the editor reads in.
 *
 * They all delegate to `buildPresentationMutation` now. The coercion each one
 * used to do itself - clamping a width, validating a rank, serializing an icon
 * - moved into `coercePresentationValue`, so there is one place where a value
 * is turned into what its typed column expects and one place to look when a
 * write comes back rejected.
 */

/** Hide or show one column. Changes `value_boolean` only. */
export function buildColumnVisibilityMutation(column, nextVisible) {
  return buildPresentationMutation(column, "visible", nextVisible);
}

/** Resize one column. Changes `value_integer` only, clamped to bounds. */
export function buildColumnWidthMutation(column, nextWidth) {
  return buildPresentationMutation(column, "width", nextWidth);
}

/** Reposition one column. Changes `value_text` only, with a generated rank. */
export function buildColumnRankMutation(column, nextRank) {
  return buildPresentationMutation(column, "rank", nextRank);
}

/** Rename one column's header. */
export function buildColumnLabelMutation(column, nextLabel) {
  return buildPresentationMutation(column, "label", nextLabel);
}

/** Hide or show the whole view. */
export function buildViewVisibilityMutation(view, nextVisible) {
  return buildPresentationMutation(view, "visible", nextVisible);
}

/** Reposition the whole view among its siblings. */
export function buildViewRankMutation(view, nextRank) {
  return buildPresentationMutation(view, "rank", nextRank);
}

/** Hide or show one status stat. */
export function buildStatusVisibilityMutation(status, nextVisible) {
  return buildPresentationMutation(status, "visible", nextVisible);
}

/** Reposition one status stat with a generated opaque rank. */
export function buildStatusRankMutation(status, nextRank) {
  return buildPresentationMutation(status, "rank", nextRank);
}

/** Replace the icon JSON while preserving the icon color supplied by the contract. */
export function buildStatusIconMutation(status, nextIcon) {
  return buildPresentationMutation(status, "icon", nextIcon);
}

/** Rename one status stat. */
export function buildStatusLabelMutation(status, nextLabel) {
  return buildPresentationMutation(status, "label", nextLabel);
}

/* =========================================================================
   STRUCTURAL: ADD A COLUMN
   ========================================================================= */

/**
 * Payload for the guarded `outr_ui_fields` create that publishes a new
 * vardef-backed table column.
 *
 * The backend hook owns the whole write plan: it locks the view, verifies
 * `expected_config_version`, clones the active definition, generates the
 * column rank, validates the vardef source, builds the replacement revision
 * and publishes it in one transaction. Nothing about that is planned here.
 *
 * `publish_to_view: 1` is what arms the hook. Without it this is an ordinary
 * catalog write, which is why folder synchronization does not publish
 * revisions by accident.
 *
 * `sourceModule` must be the top-level `module` from the SAME contract read
 * that produced `expectedConfigVersion`, and `sourceField` must exist in that
 * bean's vardefs.
 */
export function buildFieldCreatePayload({
  label,
  sourceModule,
  sourceField,
  vardefType,
  moduleKey,
  viewKey,
  expectedConfigVersion,
  blockId = null,
  placement = {},
}) {
  const trimmedLabel = String(label ?? "").trim();
  const trimmedSourceField = String(sourceField ?? "").trim();

  if (!trimmedLabel) {
    throw new TableLayoutError("a new field needs a label");
  }

  if (!trimmedSourceField) {
    throw new TableLayoutError("a new field needs a source field");
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

  const accessor = String(placement.accessor || trimmedSourceField).trim();

  /*
   * `rank_after` / `rank_before` name existing column accessors. Sending
   * neither appends the column, which is what the backend does by default.
   */
  const placementJson = {
    accessor,
    label: trimmedLabel,
    type: placement.type || vardefType || "text",
    visible: placement.visible === undefined ? true : Boolean(placement.visible),
    width: clampWidth(placement.width ?? 240, {
      minWidth: placement.minWidth ?? WIDTH_MIN,
      maxWidth: placement.maxWidth ?? WIDTH_MAX,
    }),
    minWidth: toWholeNumber(placement.minWidth, 160),
    maxWidth: toWholeNumber(placement.maxWidth, 420),
    resizable: placement.resizable === undefined ? true : Boolean(placement.resizable),
    searchable: Boolean(placement.searchable),
    sortable: placement.sortable === undefined ? true : Boolean(placement.sortable),
    editable: Boolean(placement.editable),
  };

  if (placement.rankAfter) {
    placementJson.rank_after = placement.rankAfter;
  }

  if (placement.rankBefore) {
    placementJson.rank_before = placement.rankBefore;
  }

  const data = {
    name: trimmedLabel,
    source_module: sourceModule,
    source_field: trimmedSourceField,
    vardef_type: vardefType || placementJson.type,

    publish_to_view: 1,

    target_module_key: moduleKey,
    target_view_key: viewKey,

    expected_config_version: expectedConfigVersion,

    placement_json: JSON.stringify(placementJson),
  };

  /*
   * Only when the definition has more than one table block. It travels
   * outside placement_json, per the integration guide.
   */
  if (blockId) {
    data.target_block_id = blockId;
  }

  return {
    action: "create",
    module: UI_FIELD_MODULE,
    data,
  };
}

/**
 * Accessors already in the view. A create that reuses one is rejected by the
 * backend, so the editor checks first and points the user at the presentation
 * properties instead.
 */
export function existingAccessors(model) {
  return new Set((model?.columns ?? []).map((column) => column.accessor));
}

/* =========================================================================
   FIELD CATALOG -> COLUMN DEFAULTS
   ========================================================================= */

/**
 * SuiteCRM vardef type -> the render type the table understands.
 *
 * `vardef_type` is sent to the backend as-is, and it is also the column's
 * render type inside `placement_json`, so an unmapped SuiteCRM type would
 * reach the renderer and fall through to its default. Mapping here keeps that
 * decision visible instead of leaving it to whatever the table does with an
 * unknown type.
 *
 * Anything not listed becomes `text`, which every renderer can display. That
 * is a deliberate downgrade rather than a guess: a wrong specialised renderer
 * (a date parser fed a varchar, say) shows an error where plain text shows the
 * value.
 */
const VARDEF_TYPE_MAP = {
  /* Strings */
  varchar: "text",
  name: "text",
  char: "text",
  string: "text",
  id: "text",
  text: "text",
  longtext: "text",
  html: "text",
  password: "text",
  encrypt: "text",
  file: "text",
  image: "text",
  iframe: "text",

  /* Contactables */
  email: "email",
  url: "url",
  phone: "phone",

  /* Numerics */
  int: "integer",
  integer: "integer",
  tinyint: "integer",
  smallint: "integer",
  short: "integer",
  long: "integer",
  double: "number",
  float: "number",
  decimal: "number",
  currency: "currency",

  /* Temporal */
  date: "date",
  datetime: "datetime",
  datetimecombo: "datetime",
  time: "text",

  /* Booleans */
  bool: "bool",
  boolean: "bool",

  /* Lists */
  enum: "enum",
  dynamicenum: "enum",
  radioenum: "enum",
  multienum: "enum",

  /* References */
  relate: "relate",
  parent: "relate",
  assigned_user_name: "relate",
  fullname: "text",
};

/** The render type to publish for one vardef type. */
export function mapVardefType(type) {
  const key = String(type ?? "").trim().toLowerCase();

  return VARDEF_TYPE_MAP[key] ?? "text";
}

/**
 * Starting width per render type, in pixels.
 *
 * A checkbox column does not need the same room as an email address, and a
 * new column that arrives at a sensible width is one the user does not have
 * to go and fix. Every value is still editable in the inspector afterwards.
 */
const DEFAULT_WIDTHS = {
  bool: 110,
  integer: 130,
  number: 130,
  date: 150,
  currency: 150,
  enum: 170,
  datetime: 190,
  phone: 170,
  relate: 200,
  email: 240,
  url: 240,
  text: 220,
};

export function defaultColumnWidth(renderType) {
  return clampWidth(DEFAULT_WIDTHS[renderType] ?? 220, {
    minWidth: WIDTH_MIN,
    maxWidth: WIDTH_MAX,
  });
}

/**
 * Vardef types that describe a relationship or an internal flag rather than a
 * value, so they have nothing to render in a cell.
 *
 * `link` is the big one: it is a link field standing in for a whole related
 * collection, and the compiled contract has no way to show it as a column.
 * Offering it in the library would only produce creates the backend rejects.
 */
const NON_COLUMN_TYPES = new Set(["link", "relate_collection", "collection"]);

/** Bookkeeping columns that exist on every bean and are never displayed. */
const NON_COLUMN_NAMES = new Set(["deleted"]);

/** Whether one catalog entry can become a table column at all. */
export function isRenderableModuleField(field) {
  const name = String(field?.name ?? "").trim();

  if (!name) {
    return false;
  }

  if (NON_COLUMN_NAMES.has(name)) {
    return false;
  }

  return !NON_COLUMN_TYPES.has(String(field?.type ?? "").trim().toLowerCase());
}

/**
 * `first_name` -> `First Name`.
 *
 * Only a fallback. `get_module_fields` runs the label through SuiteCRM's
 * translator, but a field whose module ships no label for it comes back as the
 * raw `LBL_*` key, and showing that key as a column header is worse than
 * showing a tidied field name.
 */
function humanizeFieldName(name) {
  const words = String(name ?? "")
    .replace(/_c$/, "")
    .split("_")
    .filter(Boolean);

  if (!words.length) {
    return String(name ?? "");
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The header text to publish for one catalog entry. */
export function moduleFieldLabel(field) {
  const label = String(field?.label ?? "").trim();

  if (!label || /^lbl_/i.test(label)) {
    return humanizeFieldName(field?.name);
  }

  return label;
}

/**
 * Everything `addField` needs, derived from one catalog entry.
 *
 * This is what replaces the eight inputs the add-field dialog used to ask for.
 * The accessor is the vardef name, which is both what the compiled column is
 * keyed by and what the row data arrives under, so deriving it removes a
 * decision the user had no basis to make.
 *
 * `rankAfter` is the only caller-supplied part: it names the column to insert
 * behind, and `null` appends. The backend generates the rank either way.
 */
export function defaultsForModuleField(field, { rankAfter = null } = {}) {
  const sourceField = String(field?.name ?? "").trim();

  if (!sourceField) {
    throw new TableLayoutError("a field from the catalog needs a name");
  }

  const vardefType = mapVardefType(field?.type);

  return {
    label: moduleFieldLabel(field),
    sourceField,
    accessor: sourceField,
    vardefType,
    width: defaultColumnWidth(vardefType),
    visible: true,
    rankAfter,
    rankBefore: null,
    blockId: null,
  };
}
