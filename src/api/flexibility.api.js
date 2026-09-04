/**
 * The two endpoints a SmartGateway metadata client needs.
 *
 *   READ   index.php?entryPoint=flexibility     compiled, published UI
 *   WRITE  index.php?entryPoint=smart_gateway   metadata mutations
 *
 * Flexibility is read-only. Request parameters only change transient current
 * state, never anything stored. Every write goes through smart_gateway using
 * the SmartGateway token the app already holds - `http()` in
 * src/services/api.js signs and attaches `X-Api-Token` on each call.
 *
 * `X-Api-Key` is the optional Flexibility READ credential and is unrelated.
 * No token is manufactured here and no signing secret is referenced.
 *
 * The scope and administrator identity the metadata hooks require are claims
 * inside that existing token, not a second endpoint or a second login. There
 * is no UI Builder page, no SuiteCRM browser session and no CSRF token in
 * this path.
 */

import { apiRequest, http } from "../services/api";

/**
 * Same host the sidebar metadata is read and written through. `http()`
 * appends `?entryPoint=smart_gateway` itself.
 */
export const METADATA_ENDPOINT = "https://gagan.guestpostcrm.com/index.php";

/** Contract version the reader asks for. */
export const FLEXIBILITY_API_VERSION = "v1";

/* =========================================================================
   ERRORS
   ========================================================================= */

/** A metadata write did not happen. */
export class UiMetadataError extends Error {
  constructor(message, { cause, response, code, kind } = {}) {
    super(message);

    this.name = "UiMetadataError";
    this.cause = cause;
    this.response = response;
    this.code = code;
    this.kind = kind;
  }
}

/**
 * Classify a rejection so the editor can say what to do about it.
 *
 * These map onto the documented failure signals. The distinction that matters
 * to the UI is "your read is stale, refetch and rebuild" versus "this write
 * was never going to work".
 */
const ERROR_KINDS = [
  {
    kind: "token",
    patterns: [
      "missing token",
      "invalid signature",
      "token expired",
      "unauthor",
      "forbidden",
      "scope",
    ],
  },
  {
    kind: "stale_value",
    patterns: [
      "previously rendered value",
      "expected_value",
      "expected value",
      "optimistic",
    ],
  },
  {
    kind: "stale_config",
    patterns: [
      "configuration changed",
      "expected_config_version",
      "config version",
    ],
  },
  {
    kind: "duplicate",
    patterns: ["duplicate", "already exists", "stale write"],
  },
  {
    kind: "immutable",
    patterns: ["immutable", "published revision"],
  },
  {
    kind: "repair",
    patterns: ["requiresrepair", "quick repair", "schema is incomplete"],
  },
];

export function classifyMetadataError(error) {
  if (error?.kind) {
    return error.kind;
  }

  const status = error?.response?.status ?? error?.status;

  if (status === 401 || status === 403) {
    return "token";
  }

  if (status === 409 || status === 412) {
    return "stale_value";
  }

  const haystack = [
    error?.message,
    error?.code,
    error?.response?.data?.error,
    error?.response?.data?.message,
    error?.response?.data?.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const match = ERROR_KINDS.find((entry) =>
    entry.patterns.some((pattern) => haystack.includes(pattern)),
  );

  return match?.kind ?? "unknown";
}

/** True when the client's read is out of date and must be taken again. */
export function isStaleReadError(error) {
  const kind = classifyMetadataError(error);

  return kind === "stale_value" || kind === "stale_config" || kind === "duplicate";
}

/**
 * A rejection, phrased so the reader knows what to do next.
 *
 * Shared by the layout editor and by the resize-to-save on the live table, so
 * the same failure never gets explained two different ways. The distinction
 * that matters is "your read is stale, it has been refreshed, try again"
 * against "this will not work until something else changes".
 */
export function describeMetadataWriteError(error) {
  switch (classifyMetadataError(error)) {
    case "token":
      return "The SmartGateway token was rejected. Reload the page to get a fresh one, then try again.";

    case "stale_value":
      return "Someone changed this first. The layout has been reloaded, please make the change again.";

    case "stale_config":
      return "The layout changed after it was read. It has been reloaded, please try again.";

    case "duplicate":
      return "That override already exists. The layout has been reloaded, please try again.";

    case "immutable":
      return "Published revisions cannot be edited directly.";

    case "repair":
      return "The CRM needs a Quick Repair and Rebuild before this can be saved.";

    default:
      return error?.message || "The change could not be saved.";
  }
}

/* =========================================================================
   READ
   ========================================================================= */

/**
 * Read the published contract for one module/view.
 *
 * Goes through `apiRequest` rather than a bare axios.get for the same two
 * reasons the sidebar read does:
 *
 *   1. `apiRequest` appends `db_name` and `dash_user_email`. Writes already
 *      send `db_name`, so a read without it can answer from a different
 *      database than the one just written to and the change would never show
 *      up.
 *
 *   2. This is a plain GET, so the browser is free to serve it from its HTTP
 *      cache. A cached response would hand back the pre-write state and
 *      quietly undo the edit on screen. `_` busts that per request.
 *
 * ETag revalidation via `If-None-Match` is deliberately not used here: the
 * editor needs the body on every read, including the refetch straight after a
 * write, and a 304 would leave it without one.
 */
export const fetchViewContract = async ({ moduleKey, viewKey = "table" }) => {
  if (!moduleKey) {
    throw new UiMetadataError("a contract read needs a module_key");
  }

  const data = await apiRequest({
    endpoint: METADATA_ENDPOINT,
    params: {
      entryPoint: "flexibility",
      api_version: FLEXIBILITY_API_VERSION,
      module_key: moduleKey,
      view_key: viewKey,
      _: Date.now(),
    },
  });

  if (!data || typeof data !== "object") {
    throw new UiMetadataError(
      `no contract returned for ${moduleKey}/${viewKey}`,
      { kind: "empty" },
    );
  }

  return data;
};

/* =========================================================================
   WRITE
   ========================================================================= */

/**
 * Send one mutation exactly as Flexibility returned it, with the caller's
 * typed value already set.
 *
 * `order_by: ""` is the documented compatibility field for direct
 * SmartGateway payloads and is spread first so a mutation can never lose it.
 *
 * smart_gateway answers 200 even when nothing was written, so the body is
 * what decides success. A handler that dies part way through returns an empty
 * body, which would otherwise sail through as a silent no-op.
 */
export const sendUiMutation = async (mutation) => {
  if (!mutation?.action || !mutation?.module) {
    throw new UiMetadataError(
      "a metadata mutation needs an action and a module",
      { kind: "invalid" },
    );
  }

  if (mutation.action === "update" && !mutation.id) {
    throw new UiMetadataError(
      `an update to ${mutation.module} needs the record id from the returned mutation`,
      { kind: "invalid" },
    );
  }

  let response;

  try {
    response = await http({
      endpoint: METADATA_ENDPOINT,
      method: "POST",
      body: {
        order_by: "",
        ...mutation,
      },
    });
  } catch (error) {
    const payload = error?.response?.data;

    const reason =
      payload?.error || payload?.message || error?.message || "network error";

    throw new UiMetadataError(
      `${mutation.action} on ${mutation.module} failed: ${reason}`,
      {
        cause: error,
        response: error?.response,
        code: payload?.code,
        kind: classifyMetadataError(error),
      },
    );
  }

  if (!response || response.success !== true) {
    const reason =
      response?.error ||
      response?.message ||
      (response
        ? "unexpected response from smart_gateway"
        : `no response body, the ${mutation.module} handler did not complete`);

    const error = new UiMetadataError(
      `${mutation.action} on ${mutation.module} failed: ${reason}`,
      { response, code: response?.code },
    );

    error.kind = classifyMetadataError({
      message: reason,
      code: response?.code,
      response: { data: response },
    });

    throw error;
  }

  return response;
};

/**
 * Create the guarded `outr_ui_fields` record that publishes a new table
 * column.
 *
 * The response envelope is the ordinary generic one; it only comes back after
 * publication has finished, and the returned id is both the catalog field id
 * and the id bound to the new revision placement. On any failure the backend
 * rolls back both the catalog row and the replacement revision, so there is
 * nothing to clean up here.
 */
export const createTableField = async (payload) => sendUiMutation(payload);

/**
 * Activate or deactivate a sidebar module.
 *
 * `is_active` is the module's own operational state on outr_ui_modules. It is
 * not a substitute for view or column visibility, which is `value_boolean` on
 * the returned presentation mutation.
 */
export const setModuleActive = async ({ id, active }) => {
  if (!id) {
    throw new UiMetadataError("a module activation needs the ui module id");
  }

  return sendUiMutation({
    action: "update",
    module: "outr_ui_modules",
    id,
    data: { is_active: active ? 1 : 0 },
  });
};
