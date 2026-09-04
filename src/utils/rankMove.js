/**
 * The one reorder flow, shared by the rank-ordered sidebar
 * collections and kept free of React so it can be tested
 * directly.
 *
 * A drag is a single ordinary SmartGateway `update`:
 *
 *   1. Build the desired local order in a copy.
 *   2. Read the IDs immediately before and after the moved
 *      record in that final order.
 *   3. Send one update carrying those two neighbour IDs and
 *      the destination scope.
 *   4. On confirmation, refetch the scope and display the
 *      order the server actually stored.
 *
 * React never generates a rank, never sends current_ranks and
 * never writes a rebalance. The backend generates the rank,
 * validates the destination scope, takes the lock, detects
 * stale neighbours, prevents duplicates and rebalances
 * transactionally if it needs to.
 *
 * The response confirms the write but carries no rank, so as
 * soon as it comes back the scope is refetched and the server's
 * order is what gets displayed. The optimistic order only
 * covers the gap between the drop and that confirmation, which
 * is why there is no flicker: by the time the refetch lands the
 * two orders agree.
 *
 * On failure the optimistic order is undone, the scope is
 * reloaded, and the user is told the ordering conflicted.
 * There is no retry, because a retry would need a rank React
 * is not allowed to invent.
 */

import { inspectRankScope, resolveMoveNeighborIds } from "./rank";

export const RANK_MOVE_OUTCOME = {
  MOVED: "moved",
  INVALID_SCOPE: "invalid_scope",
  FAILED: "failed",
};

/**
 * The local order has to be trustworthy before a move, because
 * the neighbour IDs are read off it. If the scope holds a
 * missing or duplicated rank then the array order is not the
 * server's order and the neighbours would be wrong.
 *
 * The moved record is exempt: its position was chosen by the
 * user, not derived from its rank.
 */
export function validateMoveScope(reordered, movedId, scope) {
  const siblings = (Array.isArray(reordered) ? reordered : []).filter(
    (item) => String(item?.id) !== String(movedId),
  );

  return inspectRankScope(siblings, scope);
}

/**
 * Run a move.
 *
 * plan:
 *   items        destination scope in its final visual order,
 *                moved record included
 *   movedId      id of the record that moved
 *   module       Sugar module, outr_ui_groups or outr_ui_modules
 *   scope        scope descriptor, for logs
 *   scopeFields  destination scope columns to send, e.g.
 *                { group_name: "Sales" }
 *
 * deps:
 *   requestMove({ module, id, previousId, nextId, scopeFields })
 *   syncScope()      refetch the scope after a confirmed write
 *   restoreOrder()   undo the optimistic order
 *   reloadScope()    refetch the affected scope after a failure
 *   isConflict(err)  was this an ordering conflict
 *   onSaving(bool)
 *   onError(message, err)
 *
 * Resolves with { outcome, previousId, nextId, synced, error? }.
 */
export async function performRankMove(plan, deps) {
  const {
    requestMove,
    syncScope,
    restoreOrder,
    reloadScope,
    isConflict = () => false,
    onSaving,
    onError,
  } = deps || {};

  const scopeReport = validateMoveScope(plan.items, plan.movedId, plan.scope);

  /*
   * A scope with a missing or duplicated rank, or one the
   * backend has not ranked at all, cannot be reordered: the
   * neighbour IDs would be read off an order that is not the
   * server's.
   */
  if (!scopeReport.valid || scopeReport.unranked) {
    console.error("[rank] refusing to move inside an invalid scope", {
      scope: scopeReport.scope,
      missing: scopeReport.missing,
      duplicates: scopeReport.duplicates,
      unranked: scopeReport.unranked,
    });

    const message = scopeReport.unranked
      ? `${scopeReport.scopeLabel} has no ranks yet, so it cannot be reordered here.`
      : `${scopeReport.scopeLabel} has invalid ordering data, so it cannot be reordered until that is fixed.`;

    onError?.(message);

    restoreOrder?.();

    await reloadScope?.("invalid-scope");

    return {
      outcome: RANK_MOVE_OUTCOME.INVALID_SCOPE,
      report: scopeReport,
      error: new Error(message),
    };
  }

  /*
   * Neighbours come from the final order with the moved record
   * taken out, so it can never be its own neighbour.
   */
  const { previousId, nextId } = resolveMoveNeighborIds(
    plan.items,
    plan.movedId,
  );

  onSaving?.(true);

  try {
    await requestMove({
      module: plan.module,
      id: plan.movedId,
      previousId,
      nextId,
      scopeFields: plan.scopeFields,
    });

    /*
     * Confirmed. The response carries no rank, so the new order
     * has to be read back from the server rather than inferred.
     * This is what replaces the optimistic order with the
     * authoritative one.
     */
    let synced = false;

    try {
      await syncScope?.("moved");

      synced = true;
    } catch (syncError) {
      /*
       * The move itself is stored, so this is not a failed
       * move and the optimistic order is not rolled back. The
       * scope is just still showing the optimistic order and
       * will catch up on the next fetch.
       */
      console.error("[rank] move saved but the scope could not be reloaded", {
        scope: plan.scope,
        module: plan.module,
        id: plan.movedId,
        error: syncError,
      });
    }

    return {
      outcome: RANK_MOVE_OUTCOME.MOVED,
      previousId,
      nextId,
      synced,
    };
  } catch (error) {
    const conflict = isConflict(error);

    console.error("[rank] move rejected", {
      scope: plan.scope,
      module: plan.module,
      id: plan.movedId,
      previousId,
      nextId,
      conflict,
      error,
    });

    /* Discard the optimistic order, then take the server's. */
    restoreOrder?.();

    await reloadScope?.(conflict ? "conflict" : "failed");

    onError?.(
      conflict
        ? "Someone else changed this order. The list has been reloaded, please try the move again."
        : error?.message || "Could not save the new order. The list has been reloaded.",
      error,
    );

    return {
      outcome: RANK_MOVE_OUTCOME.FAILED,
      previousId,
      nextId,
      error,
    };
  } finally {
    onSaving?.(false);
  }
}
