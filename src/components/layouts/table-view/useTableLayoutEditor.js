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
  buildFieldCreatePayload,
  buildPresentationMutation,
  clampWidth,
  existingAccessors,
  isNoOpChange,
  normalizeTableContract,
  COLUMN_PROPERTIES,
  PROPERTY_LABELS,
  STATUS_PROPERTIES,
  WRITABLE_PROPERTIES,
} from "@/utils/tableLayout";

import {
  describeMetadataWriteError as describeWriteError,
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
  const [savingPresentation, setSavingPresentation] = useState(false);
  const presentationLock = useRef(false);

  /** Missing or duplicated column ranks. Reordering is blocked while set. */
  const [rankError, setRankError] = useState(null);

  /** Missing or duplicated status ranks. */
  const [statusRankError, setStatusRankError] = useState(null);

  /**
   * Writes in flight. While non-zero the sync effect leaves local state
   * alone, so a refetch landing mid-request cannot undo the optimistic view.
   */
  const pendingWrites = useRef(0);

  const pendingMutations = useRef(new Map());
  const pendingCreates = useRef([]);
  const [, setDraftVersion] = useState(0);

  const mutationKey = useCallback(
    (draft) => JSON.stringify([draft?.kind, draft?.id, draft?.property]),
    [],
  );

  const stageMutation = useCallback(
    (draft) => {
      const key = mutationKey(draft);

      if (isNoOpChange(draft?.entry, draft?.value)) {
        pendingMutations.current.delete(key);
      } else {
        pendingMutations.current.set(key, draft);
      }

      setDraftVersion((version) => version + 1);
    },
    [mutationKey],
  );

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

      const hadDrafts =
        pendingMutations.current.size > 0 || pendingCreates.current.length > 0;
      pendingMutations.current.clear();
      pendingCreates.current = [];

      if (hadDrafts) {
        setDraftVersion((version) => version + 1);
      }
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
    if (
      sameView &&
      (pendingWrites.current > 0 ||
        pendingMutations.current.size > 0 ||
        pendingCreates.current.length > 0)
    ) {
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
    async ({ draft }) => {
      stageMutation(draft);
      return true;
    },
    [stageMutation],
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

      setColumns((current) =>
        current.map((item) =>
          item.accessor === column.accessor ? { ...item, visible: next } : item,
        ),
      );

      await runWrite({
        draft: {
          kind: "column",
          id: column.accessor,
          property: "visible",
          value: next,
          entry,
        },
      });
    },
    [assertWritable, runWrite],
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

      setColumns((current) =>
        current.map((item) =>
          item.accessor === column.accessor ? { ...item, width } : item,
        ),
      );

      await runWrite({
        draft: {
          kind: "column",
          id: column.accessor,
          property: "width",
          value: width,
          entry,
        },
      });
    },
    [assertWritable, runWrite],
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

      for (let index = 0; index < accessors.length; index += 1) {
        const target = columns.find(
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

        stageMutation({
          kind: "column",
          id: target.accessor,
          property: "rank",
          value: ranks[index],
          entry,
        });
      }
    },
    [columns, stageMutation],
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

          toast.success("Column order staged.");

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
          draft: {
            kind: "column",
            id: activeAccessor,
            property: "rank",
            value: nextRank,
            entry,
          },
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

      setStatuses((current) =>
        current.map((item) =>
          item.key === status.key ? { ...item, visible: next } : item,
        ),
      );

      await runWrite({
        draft: {
          kind: "status",
          id: status.key,
          property: "visible",
          value: next,
          entry,
        },
      });
    },
    [assertWritable, runWrite],
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

      setStatuses((current) =>
        current.map((item) =>
          item.key === status.key ? { ...item, icon: next } : item,
        ),
      );

      await runWrite({
        draft: {
          kind: "status",
          id: status.key,
          property: "icon",
          value: next,
          entry,
        },
      });
    },
    [assertWritable, runWrite],
  );

  /** Rewrite every status rank into fresh space when no midpoint remains. */
  const rebalanceStatuses = useCallback(
    async (displayOrder) => {
      const keys = displayOrder.map((status) => status.key);

      const ranks = RighteeUiRank.rebalanceAbove(
        statuses.map((status) => status.rank),
        keys.length,
      );

      for (let index = 0; index < keys.length; index += 1) {
        const target = statuses.find(
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

        stageMutation({
          kind: "status",
          id: target.key,
          property: "rank",
          value: ranks[index],
          entry,
        });
      }
    },
    [stageMutation, statuses],
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
          toast.success("Status order staged.");

          return;
        }

        setStatuses(
          reordered.map((status) =>
            status.key === activeKey ? { ...status, rank: nextRank } : status,
          ),
        );

        await runWrite({
          draft: {
            kind: "status",
            id: activeKey,
            property: "rank",
            value: nextRank,
            entry,
          },
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

      setView((current) => ({ ...current, visible: next }));

      await runWrite({
        draft: {
          kind: "view",
          id: viewKey,
          property: "visible",
          value: next,
          entry,
        },
      });
    },
    [assertWritable, runWrite, view, viewKey],
  );

  const setViewRank = useCallback(
    async (nextRank) => {
      const entry = view?.presentation?.rank;

      if (!assertWritable(entry, "Position for this view")) {
        return;
      }

      setView((current) => ({ ...current, rank: nextRank }));

      await runWrite({
        draft: {
          kind: "view",
          id: viewKey,
          property: "rank",
          value: nextRank,
          entry,
        },
      });
    },
    [assertWritable, runWrite, view, viewKey],
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

      pendingCreates.current.forEach((draft) => {
        taken.add(String(draft.accessor || draft.sourceField || "").trim());
      });

      const requested = String(accessor || sourceField || "").trim();

      if (taken.has(requested)) {
        toast.error(
          `"${requested}" is already a column in this view. Edit its visibility, width or position instead.`,
        );

        return false;
      }

      pendingCreates.current.push({
        label,
        sourceField,
        vardefType,
        width,
        visible,
        rankAfter,
        rankBefore,
        blockId,
        accessor: requested,
      });
      setDraftVersion((version) => version + 1);
      toast.success(`"${label}" staged. Click Repair to publish it.`);

      return true;
    },
    [model],
  );

  /**
   * Drop a staged create before it is published.
   *
   * Only ever removes from `pendingCreates`. A column that has already been
   * published is a different thing entirely - it lives in a revision and is
   * removed by editing the layout, not by discarding a draft - so nothing here
   * touches `columns`.
   */
  const removeStagedField = useCallback((accessor) => {
    const target = String(accessor ?? "").trim();

    const remaining = pendingCreates.current.filter(
      (draft) => draft.accessor !== target,
    );

    if (remaining.length === pendingCreates.current.length) {
      return false;
    }

    pendingCreates.current = remaining;
    setDraftVersion((version) => version + 1);

    return true;
  }, []);

  /* ------------------------------------------------------------- reload */

  const updatePresentation = useCallback(async (kind, id, changes) => {
    try {
      const target = kind === "column"
        ? columns.find((item) => item.accessor === id)
        : statuses.find((item) => item.key === id);
      // Every property the inspector can offer for this kind. `rank` is not in
      // here: it is staged by dragging, not by a control.
      const supportedProperties = kind === "column"
        ? COLUMN_PROPERTIES
        : STATUS_PROPERTIES;

      for (const [property, value] of Object.entries(changes)) {
        if (!supportedProperties.includes(property)) continue;

        const entry = target?.presentation?.[property];
        const what = PROPERTY_LABELS[property] ?? property;

        if (!assertWritable(entry, `${what} for "${target?.label ?? id}"`)) {
          return false;
        }

        stageMutation({ kind, id, property, value, entry });
      }

      if (kind === "column") {
        setColumns((current) =>
          current.map((item) =>
            item.accessor === id ? { ...item, ...changes } : item,
          ),
        );
      } else {
        setStatuses((current) =>
          current.map((item) =>
            item.key === id ? { ...item, ...changes } : item,
          ),
        );
      }

      toast.success(
        `${kind === "column" ? "Column" : "Status"} change staged.`,
      );
      return true;
    } catch (error) {
      toast.error(describeWriteError(error));
      return false;
    }
  }, [assertWritable, columns, stageMutation, statuses]);

  const repair = useCallback(async () => {
    if (
      presentationLock.current ||
      (!pendingMutations.current.size && !pendingCreates.current.length)
    ) {
      return true;
    }

    presentationLock.current = true;
    setSavingPresentation(true);
    pendingWrites.current += 1;

    try {
      let currentContract = contract;

      /*
       * One builder for every property, gated by what the owner allows.
       *
       * This used to be a table of per-property builder functions, which meant
       * a property the compiler DID return a mutation for still could not be
       * published unless someone had also added a builder for it here. The
       * gate is now the mutation itself: `buildPresentationMutation` throws if
       * the entry carries none.
       */
      const allowed = WRITABLE_PROPERTIES;

      for (const [key, draft] of [...pendingMutations.current.entries()]) {
        const currentModel = normalizeTableContract(currentContract, {
          moduleKey,
          viewKey,
        });
        const target = draft.kind === "column"
          ? currentModel?.columns.find((item) => item.accessor === draft.id)
          : draft.kind === "status"
            ? currentModel?.statuses.find((item) => item.key === draft.id)
            : currentModel?.view;
        const entry = target?.presentation?.[draft.property];
        const permitted = allowed[draft.kind]?.includes(draft.property);

        if (!target) {
          throw new Error("A changed layout item is no longer available. Discard and try again.");
        }

        if (!permitted || !entry?.writable) {
          throw new Error(
            `${PROPERTY_LABELS[draft.property] ?? draft.property} can no longer be changed for this ${draft.kind}.`,
          );
        }

        if (isNoOpChange(entry, draft.value)) {
          pendingMutations.current.delete(key);
          continue;
        }

        const result = await propertyWrite.mutateAsync({
          mutation: buildPresentationMutation(
            target,
            draft.property,
            draft.value,
          ),
          moduleKey,
          viewKey,
        });
        currentContract = result.contract;
        pendingMutations.current.delete(key);
      }

      while (pendingCreates.current.length) {
        const draft = pendingCreates.current[0];
        const currentModel = normalizeTableContract(currentContract, {
          moduleKey,
          viewKey,
        });

        if (
          currentModel.columns.some(
            (column) => column.accessor === draft.accessor,
          )
        ) {
          pendingCreates.current.shift();
          continue;
        }

        const payload = buildFieldCreatePayload({
          label: draft.label,
          sourceModule: currentModel.module,
          sourceField: draft.sourceField,
          vardefType: draft.vardefType,
          moduleKey: currentModel.moduleKey ?? moduleKey,
          viewKey: currentModel.viewKey ?? viewKey,
          expectedConfigVersion: currentModel.configVersion,
          blockId: draft.blockId,
          placement: {
            accessor: draft.accessor,
            type: draft.vardefType,
            width: draft.width,
            visible: draft.visible,
            rankAfter: draft.rankAfter,
            rankBefore: draft.rankBefore,
          },
        });
        const result = await fieldCreate.mutateAsync({
          payload,
          moduleKey,
          viewKey,
        });
        currentContract = result.contract;
        pendingCreates.current.shift();
      }

      setDraftVersion((version) => version + 1);
      setSettledWriteVersion((version) => version + 1);
      toast.success("Table layout repaired and published.");
      return true;
    } catch (error) {
      setDraftVersion((version) => version + 1);
      toast.error(describeWriteError(error));

      try {
        await refetchContractQuery();
      } catch {
        /* The query exposes the refresh error on the next render. */
      }

      return false;
    } finally {
      pendingWrites.current = Math.max(0, pendingWrites.current - 1);
      setSavingPresentation(false);
      presentationLock.current = false;
    }
  }, [contract, fieldCreate, moduleKey, propertyWrite, refetchContractQuery, viewKey]);

  const reload = useCallback(async () => {
    pendingWrites.current = 0;
    pendingMutations.current.clear();
    pendingCreates.current = [];
    setDraftVersion((version) => version + 1);

    await refetchContractQuery();
  }, [refetchContractQuery]);

  /* ------------------------------------------------------------- result */

  const writing =
    savingPresentation ||
    propertyWrite.isPending ||
    fieldCreate.isPending ||
    savingOrder ||
    savingStatusOrder;
  const dirty =
    pendingMutations.current.size > 0 || pendingCreates.current.length > 0;

  return {
    /* Data */
    model,
    view,
    columns,
    filteredColumns,
    statuses,
    filteredStatuses,

    /*
     * Creates staged but not yet published. Read straight off the ref: every
     * mutation of it bumps `draftVersion`, so this is recomputed on the same
     * render the change lands on, exactly like `dirty` below.
     *
     * Copied, for two reasons. A caller cannot reach in and drop a staged
     * create without going through `removeStagedField`, and `addField` pushes
     * onto the ref in place - handing out the same array identity every render
     * would let a memoized consumer miss the new entry entirely.
     */
    stagedFields: [...pendingCreates.current],

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
    dirty,

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
    updatePresentation,
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
    removeStagedField,
    repair,
    reload,
  };
}

export default useTableLayoutEditor;
