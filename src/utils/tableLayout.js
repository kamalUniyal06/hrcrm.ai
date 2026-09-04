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
  visible: { valueField: "value_boolean", valueType: "boolean" },
  width: { valueField: "value_integer", valueType: "integer" },
  rank: { valueField: "value_text", valueType: "string" },
  icon: { valueField: "value_text", valueType: "string" },
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

    label: raw?.label ?? accessor,
    type: raw?.type ?? "text",

    /* Resolved presentation values. */
    visible: toBoolean(presentationValue(presentation.visible, raw?.visible), true),
    width: toWholeNumber(presentationValue(presentation.width, raw?.width), 220),
    rank: isRankValue(presentationValue(presentation.rank, raw?.rank))
      ? presentationValue(presentation.rank, raw?.rank)
      : null,

    /* Structural flags, owned by the revision and read-only here. */
    minWidth: toWholeNumber(raw?.minWidth, WIDTH_MIN),
    maxWidth: toWholeNumber(raw?.maxWidth, WIDTH_MAX),
    resizable: toBoolean(raw?.resizable, false),
    sortable: toBoolean(raw?.sortable, false),
    searchable: toBoolean(raw?.searchable, false),
    editable: toBoolean(raw?.editable, false),

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
    label: raw?.label ?? key,
    color: raw?.color ?? "",
    filters: raw?.filters ?? {},
    amountKey: raw?.amountKey ?? "",
    showAmount: toBoolean(raw?.showAmount, false),
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
    throw new TableLayoutError(
      `${entry.kind} is not directly writable on this view; Flexibility returned no mutation for it`,
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

  return current === nextValue;
}

/* =========================================================================
   HIGH LEVEL EDIT BUILDERS
   ========================================================================= */

/** Hide or show one column. Changes `value_boolean` only. */
export function buildColumnVisibilityMutation(column, nextVisible) {
  return withTypedValue(column?.presentation?.visible, Boolean(nextVisible));
}

/** Resize one column. Changes `value_integer` only, clamped to bounds. */
export function buildColumnWidthMutation(column, nextWidth) {
  return withTypedValue(
    column?.presentation?.width,
    clampWidth(nextWidth, column),
  );
}

/** Reposition one column. Changes `value_text` only, with a generated rank. */
export function buildColumnRankMutation(column, nextRank) {
  if (!isRankValue(nextRank)) {
    throw new TableLayoutError(
      `a column rank must be a non-empty string, received ${JSON.stringify(nextRank)}`,
      { rank: nextRank },
    );
  }

  return withTypedValue(column?.presentation?.rank, nextRank);
}

/** Hide or show the whole view. */
export function buildViewVisibilityMutation(view, nextVisible) {
  return withTypedValue(view?.presentation?.visible, Boolean(nextVisible));
}

/** Reposition the whole view among its siblings. */
export function buildViewRankMutation(view, nextRank) {
  if (!isRankValue(nextRank)) {
    throw new TableLayoutError(
      `a view rank must be a non-empty string, received ${JSON.stringify(nextRank)}`,
      { rank: nextRank },
    );
  }

  return withTypedValue(view?.presentation?.rank, nextRank);
}

/** Hide or show one status stat. */
export function buildStatusVisibilityMutation(status, nextVisible) {
  return withTypedValue(status?.presentation?.visible, Boolean(nextVisible));
}

/** Reposition one status stat with a generated opaque rank. */
export function buildStatusRankMutation(status, nextRank) {
  if (!isRankValue(nextRank)) {
    throw new TableLayoutError(
      `a status rank must be a non-empty string, received ${JSON.stringify(nextRank)}`,
      { rank: nextRank },
    );
  }

  return withTypedValue(status?.presentation?.rank, nextRank);
}

/** Replace the icon JSON while preserving the icon color supplied by the contract. */
export function buildStatusIconMutation(status, nextIcon) {
  const icon = normalizeStatusIcon({
    color: status?.icon?.color ?? "",
    ...nextIcon,
  });

  return withTypedValue(status?.presentation?.icon, JSON.stringify(icon));
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
