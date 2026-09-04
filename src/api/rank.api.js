/**
 * Sidebar reordering: one ordinary SmartGateway `update` per
 * drag.
 *
 * React does not generate ranks. It says where the record
 * landed, as a pair of neighbour record IDs, and the backend
 * owns everything that follows:
 *
 *   - rank generation
 *   - destination-scope validation
 *   - concurrency locking
 *   - stale-neighbour detection
 *   - duplicate prevention
 *   - transactional rebalance
 *   - persistence
 *
 * There is no rank_between call, no UiBuilderAjax call, no
 * current_ranks payload, no client-side fractional-rank
 * algorithm and no client-driven rebalance. Two browsers
 * dragging in the same scope cannot collide, because neither
 * one picks a value.
 *
 * The success response does NOT carry the generated rank. The
 * optimistic order stands until the next ordinary fetch
 * returns authoritative rank_key values.
 *
 * This positional contract covers outr_ui_groups and
 * outr_ui_modules only. Revision-owned components and fields
 * keep going through the canonical UI-definition publish
 * workflow.
 */

import { http } from "../services/api";

/**
 * Same host the layout metadata is read and written through.
 * `http` appends `?entryPoint=smart_gateway`.
 */
const METADATA_ENDPOINT = "https://gagan.guestpostcrm.com/index.php";

/** Flag that turns an ordinary update into a positional move. */
export const RANK_MOVE_FLAG = "rank_move_requested";

/** A move could not be stored. */
export class RankMoveError extends Error {
  constructor(message, { cause, response, code } = {}) {
    super(message);

    this.name = "RankMoveError";
    this.cause = cause;
    this.response = response;
    this.code = code;
  }
}

/**
 * Was the move rejected because the scope changed underneath
 * it?
 *
 * The backend detects stale neighbours and duplicate ranks, so
 * a losing drag comes back as a conflict. Nothing is retried
 * with a client-generated rank; the scope is reloaded and the
 * user repeats the move.
 */
const CONFLICT_PATTERNS = [
  "conflict",
  "duplicate",
  "stale",
  "out of date",
  "moved",
  "rank_conflict",
  "rank_stale",
  "neighbour",
  "neighbor",
  "version mismatch",
];

export function isRankConflictError(error) {
  if (!error) {
    return false;
  }

  const status = error.response?.status ?? error.status;

  if (status === 409 || status === 412) {
    return true;
  }

  const code = String(error.code ?? "").toLowerCase();

  if (
    code === "rank_conflict" ||
    code === "rank_stale" ||
    code === "conflict" ||
    code === "duplicate"
  ) {
    return true;
  }

  const message = String(error.message ?? "").toLowerCase();

  return CONFLICT_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Move one record to a position, described by its neighbours.
 *
 * `scopeFields` carries the destination scope columns. For UI
 * modules that is always `group_name`, sent on every move and
 * not just cross-group ones, so the backend can validate the
 * destination scope without inferring it.
 *
 * smart_gateway answers 200 even when nothing was written, so
 * the body is what decides success.
 */
export async function requestRankMove({
  module,
  id,
  previousId,
  nextId,
  scopeFields = {},
}) {
  if (!module || !id) {
    throw new RankMoveError("a rank move needs a module and a record id");
  }

  if (previousId && String(previousId) === String(id)) {
    throw new RankMoveError(
      `record ${id} cannot be its own previous neighbour`,
    );
  }

  if (nextId && String(nextId) === String(id)) {
    throw new RankMoveError(`record ${id} cannot be its own next neighbour`);
  }

  let response;

  try {
    response = await http({
      endpoint: METADATA_ENDPOINT,
      method: "POST",
      body: {
        action: "update",
        module,
        id,
        data: {
          /* Destination scope first, e.g. { group_name }. */
          ...scopeFields,

          [RANK_MOVE_FLAG]: 1,

          /* Empty string means "no neighbour on this side". */
          rank_previous_id: previousId || "",
          rank_next_id: nextId || "",
        },
      },
    });
  } catch (error) {
    throw new RankMoveError(
      `rank move failed for ${module}/${id}: ${
        error?.message || "network error"
      }`,
      { cause: error, code: error?.response?.data?.code },
    );
  }

  if (!response || response.success !== true) {
    const reason =
      response?.error ||
      (response
        ? "unexpected response from smart_gateway"
        : `no response body, the ${module} update handler did not complete`);

    throw new RankMoveError(
      `rank move failed for ${module}/${id}: ${reason}`,
      { response, code: response?.code },
    );
  }

  /*
   * No rank comes back, by design. Nothing is written into
   * local state from this response.
   */
  return response;
}
