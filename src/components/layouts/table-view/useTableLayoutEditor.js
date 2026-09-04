/**
 * All of the table layout editor's state and every write it performs.
 *
 * The write contract, in one place so the components never have to think
 * about it:
 *
 *   - Read the contract for the selected module/view.
 *   - For a presentation edit, clone the mutation that came back beside the
 *     exact value being edited, change only its typed `value_*` field, POST
 *     it, then read the contract back.
 *   - For a structural change, send the guarded `outr_ui_fields` create with
 *     the `configVersion` from the read that is currently on screen.
 *
 * Nothing here invents an owner id, a property path, a record id, an expected
 * value or a revision id, and nothing rewrites a `create` mutation into an
 * `update`. After a successful write the refetch supplies the new record id
 * and the matching update payload.
 *
 * Optimistic state exists only to cover the gap between a click and the
 * refetch that confirms it. It is rolled back on rejection and always
 * replaced by the server's answer, never merged with it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import toast from "react-hot-toast";

import { reorderCopy } from "@/utils/rank";

import {
  RighteeUiRank,
  UiRankError,
  between,
} from "@/utils/uiRank";

import {
  buildColumnRankMutation,
  buildColumnVisibilityMutation,
  buildColumnWidthMutation,
  buildFieldCreatePayload,
  buildStatusIconMutation,
  buildStatusRankMutation,
  buildStatusVisibilityMutation,
  buildViewRankMutation,
  buildViewVisibilityMutation,
  clampWidth,
  existingAccessors,
  isNoOpChange,
  normalizeTableContract,
} from "@/utils/tableLayout";

import {
  describeMetadataWriteError as describeWriteError,
  isStaleReadError,
} from "@/api/flexibility.api";

import {
  useCreateTableField,
  useUiPropertyWrite,
  useViewContract,
} from "@/queries/flexibility.queries";

/* =========================================================================
   HOOK
   ========================================================================= */

export function useTableLayoutEditor({ moduleKey, viewKey }) {
  /* ---------------------------------------------------------------- read */

  const {
    data: contract,
    isPending: contractPending,
    isFetching: contractFetching,
    error: contractError,
    refetch: refetchContractQuery,
  } = useViewContract(moduleKey, viewKey);

  /* --------------------------------------------------------------- write */

  const propertyWrite = useUiPropertyWrite();
  const fieldCreate = useCreateTableField();

  /* --------------------------------------------------------------- state */

  /**
   * Columns as displayed. Seeded from the server model and briefly ahead of
   * it while a write is in flight.
   */
  const [columns, setColumns] = useState([]);

  /** Status stats as displayed, ordered by their presentation ranks. */
  const [statuses, setStatuses] = useState([]);

  /** View-level presentation as displayed. */
  const [view, setView] = useState(null);

  const [selection, setSelection] = useState(null);

  const [search, setSearch] = useState("");

  /** Held for the whole of a reorder, so two drags cannot interleave. */
  const [savingOrder, setSavingOrder] = useState(false);

  /** Held for the whole of a status reorder. */
  const [savingStatusOrder, setSavingStatusOrder] = useState(false);

  /** Accessor currently being written, for per-row spinners. */
  const [busyAccessor, setBusyAccessor] = useState(null);

  /** Status key currently being written. */
  const [busyStatusKey, setBusyStatusKey] = useState(null);

  /** Missing or duplicated column ranks. Reordering is blocked while set. */
  const [rankError, setRankError] = useState(null);

  /** Missing or duplicated status ranks. */
  const [statusRankError, setStatusRankError] = useState(null);

  /**
   * Writes in flight. While non-zero the sync effect leaves local state
   * alone, so a refetch landing mid-request cannot undo the optimistic view.
   */
  const pendingWrites = useRef(0);

  /** Re-run server-to-local sync after the final in-flight write settles. */
  const [settledWriteVersion, setSettledWriteVersion] = useState(0);

  /* ------------------------------------------------------- server -> local */

  const model = useMemo(() => {
    if (!contract) {
      return null;
    }

    const reports = [];
    const statusReports = [];

    const normalized = normalizeTableContract(contract, {
      moduleKey,
      viewKey,
      onInvalidRanks: (report) => reports.push(report),
      onInvalidStatusRanks: (report) => statusReports.push(report),
    });

    return {
      ...normalized,
      rankReports: reports,
      statusRankReports: statusReports,
    };
  }, [contract, moduleKey, viewKey]);

  /**
   * Server payload -> local state.
   *
   * This is deliberately ONE effect covering both "the contract arrived" and
   * "the user picked a different view". It used to be two, and they raced:
   * React runs effects in declaration order within a commit, so on any commit
   * where both fired, the reset wiped the state the sync had just written.
   *
   * That happened whenever `model` was already available on the first commit,
   * which is the normal case when the contract is still in the react-query
   * cache - mounting the tab client-side, or returning to a view visited in
   * the last few minutes. A hard reload emptied the cache, so the first commit
   * had no model, the sync bailed out, and the bug hid itself. Hence "it only
   * works after refreshing".
   *
   * Keying off the view identity instead of ordering removes the race: there
   * is one code path, and it decides what to do by comparing the view the
   * local state belongs to against the view being asked for.
   */
  const syncedKey = useRef(null);

  useEffect(() => {
    const key = `${moduleKey ?? ""}:${viewKey ?? ""}`;

    const sameView = syncedKey.current === key;

    /*
     * A different view. Any optimistic state belongs to the one just left, so
     * it is abandoned rather than carried across.
     */
    if (!sameView) {
      pendingWrites.current = 0;
    }

    /*
     * The contract for this view has not arrived. Clear the previous view's
     * columns so they cannot sit under the new view's heading, but leave
     * already-synced state alone - a background refetch briefly has no data
     * and must not blank the editor.
     */
    if (!model) {
      if (!sameView) {
        syncedKey.current = null;

        setColumns([]);
        setStatuses([]);
        setView(null);
        setSelection(null);
        setRankError(null);
        setStatusRankError(null);
        setBusyAccessor(null);
        setBusyStatusKey(null);
        setSavingOrder(false);
        setSavingStatusOrder(false);
      }

      return;
    }

    /*
     * A write is in flight against this same view, so this payload predates
     * the optimistic state and must not replace it.
     */
    if (sameView && pendingWrites.current > 0) {
      return;
    }

    syncedKey.current = key;

    setColumns(model.columns);
    setStatuses(model.statuses);
    setView(model.view);

    setRankError(
      model.rankOrderable
        ? null
        : {
            reports: model.rankReports,
            unranked: Boolean(model.rankReport?.unranked),
            message: model.rankReport?.unranked
              ? "These columns have no ranks yet, so they cannot be reordered here."
              : "Column ordering data is invalid, so reordering is disabled until it is fixed.",
          },
    );

    setStatusRankError(
      model.statusRankOrderable || model.statuses.length === 0
        ? null
        : {
            reports: model.statusRankReports,
            unranked: Boolean(model.statusRankReport?.unranked),
            message: model.statusRankReport?.unranked
              ? "These status stats have no ranks yet, so they cannot be reordered here."
              : "Status ordering data is invalid, so reordering is disabled until it is fixed.",
          },
    );

    setSelection((current) => {
      /* A new view starts on its own settings, not the last view's column. */
      if (!sameView) {
        return { type: "view" };
      }

      if (current?.type === "view") {
        return current;
      }

      /* Keep the selected column if it survived the refetch. */
      if (
        current?.type === "column" &&
        model.columns.some((column) => column.accessor === current.accessor)
      ) {
        return current;
      }

      if (
        current?.type === "status" &&
        model.statuses.some((status) => status.key === current.key)
      ) {
        return current;
      }

      return { type: "view" };
    });
  }, [model, moduleKey, settledWriteVersion, viewKey]);

  /* ------------------------------------------------------------ selection */

  const selectedColumn = useMemo(() => {
    if (selection?.type !== "column") {
      return null;
    }

    return (
      columns.find((column) => column.accessor === selection.accessor) ?? null
    );
  }, [columns, selection]);

  const selectedStatus = useMemo(() => {
    if (selection?.type !== "status") {
      return null;
    }

    return statuses.find((status) => status.key === selection.key) ?? null;
  }, [selection, statuses]);

  const filteredColumns = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return columns;
    }

    return columns.filter(
      (column) =>
        column.label?.toLowerCase().includes(query) ||
        column.accessor?.toLowerCase().includes(query) ||
        column.type?.toLowerCase().includes(query),
    );
  }, [columns, search]);

  const filteredStatuses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return statuses;
    }

    return statuses.filter(
      (status) =>
        status.label?.toLowerCase().includes(query) ||
        status.key?.toLowerCase().includes(query) ||
        status.icon?.name?.toLowerCase().includes(query),
    );
  }, [search, statuses]);

  /* ------------------------------------------------------------- plumbing */

  /**
   * Every presentation write goes through here, so the bookkeeping that keeps
   * the refetch from clobbering optimistic state lives in exactly one place.
   *
   * `restore` puts the previous local state back when the write is rejected.
   * The refetch that the mutation performs then overwrites it with the
   * server's answer, so the editor never sits on a value that was not stored.
   */
  const runWrite = useCallback(
    async ({ mutation, restore, accessor = null, statusKey = null }) => {
      pendingWrites.current += 1;

      if (accessor) {
        setBusyAccessor(accessor);
      }

      if (statusKey) {
        setBusyStatusKey(statusKey);
      }

      try {
        await propertyWrite.mutateAsync({ mutation, moduleKey, viewKey });

        return true;
      } catch (error) {
        restore?.();

        toast.error(describeWriteError(error));

        /*
         * A stale read means the payloads still on screen are no longer
         * valid. The mutation refetches on success only, so the reload is
         * forced here.
         */
        if (isStaleReadError(error)) {
          try {
            await refetchContractQuery();
          } catch {
            /* Reported by the query itself. */
          }
        }

        return false;
      } finally {
        pendingWrites.current = Math.max(0, pendingWrites.current - 1);

        if (pendingWrites.current === 0) {
          setSettledWriteVersion((version) => version + 1);
        }

        if (accessor) {
          setBusyAccessor(null);
        }

        if (statusKey) {
          setBusyStatusKey(null);
        }
      }
    },
    [moduleKey, propertyWrite, refetchContractQuery, viewKey],
  );

  /** Guard shared by every edit path. */
  const assertWritable = useCallback((entry, what) => {
    if (!entry?.writable) {
      toast.error(
        `${what} is not directly writable on this view. Flexibility returned no mutation for it.`,
      );

      return false;
    }

    return true;
  }, []);

  /* ------------------------------------------------- column visibility */

  const setColumnVisible = useCallback(
    async (column, nextVisible) => {
      const entry = column?.presentation?.visible;

      if (!assertWritable(entry, `Visibility for "${column?.label}"`)) {
        return;
      }

      const next = Boolean(nextVisible);

      if (isNoOpChange(entry, next)) {
        return;
      }

      const previous = columns;

      /* Optimistic. */
      setColumns((current) =>
        current.map((item) =>
          item.accessor === column.accessor ? { ...item, visible: next } : item,
        ),
      );

      await runWrite({
        mutation: buildColumnVisibilityMutation(column, next),
        restore: () => setColumns(previous),
        accessor: column.accessor,
      });
    },
    [assertWritable, columns, runWrite],
  );

  const toggleColumnVisible = useCallback(
    (column) => setColumnVisible(column, !column?.visible),
    [setColumnVisible],
  );

  /* ------------------------------------------------------ column width */

  const setColumnWidth = useCallback(
    async (column, nextWidth) => {
      const entry = column?.presentation?.width;

      if (!assertWritable(entry, `Width for "${column?.label}"`)) {
        return;
      }

      const width = clampWidth(nextWidth, column);

      if (isNoOpChange(entry, width)) {
        return;
      }

      const previous = columns;

      setColumns((current) =>
        current.map((item) =>
          item.accessor === column.accessor ? { ...item, width } : item,
        ),
      );

      await runWrite({
        mutation: buildColumnWidthMutation(column, width),
        restore: () => setColumns(previous),
        accessor: column.accessor,
      });
    },
    [assertWritable, columns, runWrite],
  );

  /* ----------------------------------------------------------- reorder */

  /**
   * Rewrite every column's rank into fresh space above the occupied
   * interval.
   *
   * This is the documented rebalance response: when the fractional space
   * between two neighbours cannot be subdivided, the whole displayed order is
   * replaced rather than the moved item alone.
   *
   * Each write is sent against the contract returned by the previous one,
   * because after the first write the earlier mutation payloads are stale.
   * That is also why this cannot be parallelised.
   */
  const rebalance = useCallback(
    async (displayOrder) => {
      const accessors = displayOrder.map((column) => column.accessor);

      const ranks = RighteeUiRank.rebalanceAbove(
        columns.map((column) => column.rank),
        accessors.length,
      );

      let currentContract = contract;

      for (let index = 0; index < accessors.length; index += 1) {
        const normalized = normalizeTableContract(currentContract, {
          moduleKey,
          viewKey,
        });

        const target = normalized?.columns.find(
          (column) => column.accessor === accessors[index],
        );

        if (!target) {
          continue;
        }

        const entry = target.presentation?.rank;

        if (!entry?.writable) {
          throw new Error(
            `Rank for "${target.label}" is not writable, so the order cannot be rebalanced.`,
          );
        }

        if (isNoOpChange(entry, ranks[index])) {
          continue;
        }

        pendingWrites.current += 1;

        try {
          const result = await propertyWrite.mutateAsync({
            mutation: buildColumnRankMutation(target, ranks[index]),
            moduleKey,
            viewKey,
          });

          currentContract = result.contract;
        } finally {
          pendingWrites.current = Math.max(0, pendingWrites.current - 1);
        }
      }
    },
    [columns, contract, moduleKey, propertyWrite, viewKey],
  );

  /**
   * Move a column to a new position.
   *
   * The rank is calculated between the two columns that will surround it,
   * using the same fractional-indexing algorithm as the backend. The visual
   * position is never turned into an index or a weight.
   */
  const moveColumn = useCallback(
    async (activeAccessor, destinationIndex) => {
      if (savingOrder) {
        return;
      }

      if (rankError) {
        toast.error(rankError.message);

        return;
      }

      const moved = columns.find(
        (column) => column.accessor === activeAccessor,
      );

      if (!moved) {
        return;
      }

      const entry = moved.presentation?.rank;

      if (!assertWritable(entry, `Position for "${moved.label}"`)) {
        return;
      }

      const previous = columns;

      const reordered = reorderCopy(columns, activeAccessor, destinationIndex);

      const landedIndex = reordered.findIndex(
        (column) => column.accessor === activeAccessor,
      );

      if (landedIndex === -1) {
        return;
      }

      /* Neighbours are read with the moved column taken out. */
      const siblings = reordered.filter(
        (column) => column.accessor !== activeAccessor,
      );

      const { lower, upper } = RighteeUiRank.neighborRanksAt(
        siblings,
        landedIndex,
      );

      setSavingOrder(true);

      try {
        let nextRank;

        try {
          nextRank = between(lower, upper);
        } catch (error) {
          if (!(error instanceof UiRankError)) {
            throw error;
          }

          /*
           * The space between the neighbours is gone, or the neighbours came
           * off an order the server never accepted. Either way one write
           * cannot fix it, so the whole order is rewritten.
           */
          console.warn(
            "[ui-metadata] falling back to a full rank rebalance",
            { lower, upper, error },
          );

          setColumns(reordered);

          await rebalance(reordered);

          toast.success("Column order rebalanced.");

          return;
        }

        /* Optimistic: show the new order and the rank it will carry. */
        setColumns(
          reordered.map((column) =>
            column.accessor === activeAccessor
              ? { ...column, rank: nextRank }
              : column,
          ),
        );

        await runWrite({
          mutation: buildColumnRankMutation(moved, nextRank),
          restore: () => setColumns(previous),
          accessor: activeAccessor,
        });
      } catch (error) {
        setColumns(previous);

        toast.error(describeWriteError(error));

        try {
          await refetchContractQuery();
        } catch {
          /* Reported by the query itself. */
        }
      } finally {
        setSavingOrder(false);
      }
    },
    [
      assertWritable,
      columns,
      rankError,
      rebalance,
      refetchContractQuery,
      runWrite,
      savingOrder,
    ],
  );

  /* ------------------------------------------------ status presentation */

  const setStatusVisible = useCallback(
    async (status, nextVisible) => {
      const entry = status?.presentation?.visible;

      if (!assertWritable(entry, `Visibility for "${status?.label}"`)) {
        return;
      }

      const next = Boolean(nextVisible);

      if (isNoOpChange(entry, next)) {
        return;
      }

      const previous = statuses;

      setStatuses((current) =>
        current.map((item) =>
          item.key === status.key ? { ...item, visible: next } : item,
        ),
      );

      await runWrite({
        mutation: buildStatusVisibilityMutation(status, next),
        restore: () => setStatuses(previous),
        statusKey: status.key,
      });
    },
    [assertWritable, runWrite, statuses],
  );

  const toggleStatusVisible = useCallback(
    (status) => setStatusVisible(status, !status?.visible),
    [setStatusVisible],
  );

  const setStatusIcon = useCallback(
    async (status, selection) => {
      const entry = status?.presentation?.icon;

      if (!assertWritable(entry, `Icon for "${status?.label}"`)) {
        return;
      }

      const next = {
        color: status?.icon?.color ?? "",
        library: selection?.library ?? "",
        name: selection?.name ?? "",
      };

      if (isNoOpChange(entry, next)) {
        return;
      }

      const previous = statuses;

      setStatuses((current) =>
        current.map((item) =>
          item.key === status.key ? { ...item, icon: next } : item,
        ),
      );

      await runWrite({
        mutation: buildStatusIconMutation(status, next),
        restore: () => setStatuses(previous),
        statusKey: status.key,
      });
    },
    [assertWritable, runWrite, statuses],
  );

  /** Rewrite every status rank into fresh space when no midpoint remains. */
  const rebalanceStatuses = useCallback(
    async (displayOrder) => {
      const keys = displayOrder.map((status) => status.key);

      const ranks = RighteeUiRank.rebalanceAbove(
        statuses.map((status) => status.rank),
        keys.length,
      );

      let currentContract = contract;

      for (let index = 0; index < keys.length; index += 1) {
        const normalized = normalizeTableContract(currentContract, {
          moduleKey,
          viewKey,
        });

        const target = normalized?.statuses.find(
          (status) => status.key === keys[index],
        );

        if (!target) {
          continue;
        }

        const entry = target.presentation?.rank;

        if (!entry?.writable) {
          throw new Error(
            `Rank for "${target.label}" is not writable, so the status order cannot be rebalanced.`,
          );
        }

        if (isNoOpChange(entry, ranks[index])) {
          continue;
        }

        pendingWrites.current += 1;

        try {
          const result = await propertyWrite.mutateAsync({
            mutation: buildStatusRankMutation(target, ranks[index]),
            moduleKey,
            viewKey,
          });

          currentContract = result.contract;
        } finally {
          pendingWrites.current = Math.max(0, pendingWrites.current - 1);
        }
      }
    },
    [contract, moduleKey, propertyWrite, statuses, viewKey],
  );

  const moveStatus = useCallback(
    async (activeKey, destinationIndex) => {
      if (savingStatusOrder) {
        return;
      }

      if (statusRankError) {
        toast.error(statusRankError.message);

        return;
      }

      const moved = statuses.find((status) => status.key === activeKey);

      if (!moved) {
        return;
      }

      const entry = moved.presentation?.rank;

      if (!assertWritable(entry, `Position for "${moved.label}"`)) {
        return;
      }

      const previous = statuses;
      const reordered = reorderCopy(statuses, activeKey, destinationIndex);
      const landedIndex = reordered.findIndex(
        (status) => status.key === activeKey,
      );

      if (landedIndex === -1) {
        return;
      }

      const siblings = reordered.filter((status) => status.key !== activeKey);
      const { lower, upper } = RighteeUiRank.neighborRanksAt(
        siblings,
        landedIndex,
      );

      setSavingStatusOrder(true);
      setBusyStatusKey(activeKey);

      try {
        let nextRank;

        try {
          nextRank = between(lower, upper);
        } catch (error) {
          if (!(error instanceof UiRankError)) {
            throw error;
          }

          console.warn(
            "[ui-metadata] falling back to a full status rank rebalance",
            { lower, upper, error },
          );

          setStatuses(reordered);
          await rebalanceStatuses(reordered);
          toast.success("Status order rebalanced.");

          return;
        }

        setStatuses(
          reordered.map((status) =>
            status.key === activeKey ? { ...status, rank: nextRank } : status,
          ),
        );

        await runWrite({
          mutation: buildStatusRankMutation(moved, nextRank),
          restore: () => setStatuses(previous),
          statusKey: activeKey,
        });
      } catch (error) {
        setStatuses(previous);
        toast.error(describeWriteError(error));

        try {
          await refetchContractQuery();
        } catch {
          /* Reported by the query itself. */
        }
      } finally {
        setSavingStatusOrder(false);
        setBusyStatusKey(null);
      }
    },
    [
      assertWritable,
      rebalanceStatuses,
      refetchContractQuery,
      runWrite,
      savingStatusOrder,
      statusRankError,
      statuses,
    ],
  );

  /* --------------------------------------------------- view presentation */

  const setViewVisible = useCallback(
    async (nextVisible) => {
      const entry = view?.presentation?.visible;

      if (!assertWritable(entry, "Visibility for this view")) {
        return;
      }

      const next = Boolean(nextVisible);

      if (isNoOpChange(entry, next)) {
        return;
      }

      const previous = view;

      setView((current) => ({ ...current, visible: next }));

      await runWrite({
        mutation: buildViewVisibilityMutation(view, next),
        restore: () => setView(previous),
      });
    },
    [assertWritable, runWrite, view],
  );

  const setViewRank = useCallback(
    async (nextRank) => {
      const entry = view?.presentation?.rank;

      if (!assertWritable(entry, "Position for this view")) {
        return;
      }

      if (isNoOpChange(entry, nextRank)) {
        return;
      }

      const previous = view;

      setView((current) => ({ ...current, rank: nextRank }));

      await runWrite({
        mutation: buildViewRankMutation(view, nextRank),
        restore: () => setView(previous),
      });
    },
    [assertWritable, runWrite, view],
  );

  /* ------------------------------------------------------- add a column */

  /**
   * Publish a new vardef-backed column.
   *
   * `source_module` and `expected_config_version` both come from the read
   * that is on screen, so they describe the same state the user was looking
   * at. The backend does the rest inside one transaction.
   */
  const addField = useCallback(
    async ({
      label,
      sourceField,
      vardefType,
      width,
      visible,
      rankAfter,
      rankBefore,
      blockId,
      accessor,
    }) => {
      if (!model) {
        return false;
      }

      const taken = existingAccessors(model);

      const requested = String(accessor || sourceField || "").trim();

      if (taken.has(requested)) {
        toast.error(
          `"${requested}" is already a column in this view. Edit its visibility, width or position instead.`,
        );

        return false;
      }

      try {
        const payload = buildFieldCreatePayload({
          label,
          sourceModule: model.module,
          sourceField,
          vardefType,
          moduleKey: model.moduleKey ?? moduleKey,
          viewKey: model.viewKey ?? viewKey,
          expectedConfigVersion: model.configVersion,
          blockId,
          placement: {
            accessor: requested,
            type: vardefType,
            width,
            visible,
            rankAfter,
            rankBefore,
          },
        });

        pendingWrites.current += 1;

        try {
          await fieldCreate.mutateAsync({ payload, moduleKey, viewKey });
        } finally {
          pendingWrites.current = Math.max(0, pendingWrites.current - 1);
        }

        toast.success(`"${label}" published to this view.`);

        return true;
      } catch (error) {
        toast.error(describeWriteError(error));

        if (isStaleReadError(error)) {
          try {
            await refetchContractQuery();
          } catch {
            /* Reported by the query itself. */
          }
        }

        return false;
      }
    },
    [fieldCreate, model, moduleKey, refetchContractQuery, viewKey],
  );

  /* ------------------------------------------------------------- reload */

  const reload = useCallback(async () => {
    pendingWrites.current = 0;

    await refetchContractQuery();
  }, [refetchContractQuery]);

  /* ------------------------------------------------------------- result */

  const writing =
    propertyWrite.isPending ||
    fieldCreate.isPending ||
    savingOrder ||
    savingStatusOrder;

  return {
    /* Data */
    model,
    view,
    columns,
    filteredColumns,
    statuses,
    filteredStatuses,

    /* Read state */
    contractPending,
    contractFetching,
    contractError,

    /* Write state */
    writing,
    savingOrder,
    savingStatusOrder,
    busyAccessor,
    busyStatusKey,
    publishing: fieldCreate.isPending,

    /* Problems */
    rankError,
    statusRankError,

    /* Selection */
    selection,
    setSelection,
    selectedColumn,
    selectedStatus,

    /* Search */
    search,
    setSearch,

    /* Actions */
    toggleColumnVisible,
    setColumnVisible,
    setColumnWidth,
    moveColumn,
    toggleStatusVisible,
    setStatusVisible,
    setStatusIcon,
    moveStatus,
    setViewVisible,
    setViewRank,
    addField,
    reload,
  };
}

export default useTableLayoutEditor;
