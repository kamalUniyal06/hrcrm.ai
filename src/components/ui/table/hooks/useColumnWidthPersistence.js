/**
 * Save a column width to the CRM when the user finishes dragging it.
 *
 * The width the table renders is a published presentation value, the same one
 * the Table View layout editor edits. So a resize here is not local UI state -
 * it is a metadata write, and it follows the identical contract:
 *
 *   copy the mutation Flexibility returned beside the width
 *     -> change only its typed `value_integer`
 *       -> POST smart_gateway
 *         -> re-read the layout
 *
 * Nothing is invented: no owner id, no property path, no record id, and
 * `expected_value_integer` stays at the value that was on screen. The payload
 * is built by the same `withTypedValue` the editor uses, so the two cannot
 * drift apart.
 *
 * ---------------------------------------------------------------------------
 * WHY THE WRITES ARE SERIALISED
 * ---------------------------------------------------------------------------
 *
 * A drag ends in well under the time a write plus its re-read takes, so a user
 * adjusting two edges in quick succession can easily finish a second drag while
 * the first is still in flight.
 *
 * That matters because `expected_value_integer` comes from the layout payload.
 * Until the re-read lands, that payload still describes the pre-write width, so
 * a second write built from it carries a stale expected value and the backend
 * rejects it - correctly, since optimistic concurrency is the whole point.
 *
 * So writes are queued per column, latest value wins. A drag that lands mid
 * flight is remembered and sent once the re-read has refreshed the payload,
 * and intermediate values are dropped because only the width the user stopped
 * on is worth storing.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import toast from "react-hot-toast";

import {
  describeMetadataWriteError,
  isStaleReadError,
} from "@/api/flexibility.api";

import { useLivePresentationWrite } from "@/queries/flexibility.queries";

import {
  clampWidth,
  readPresentationEntry,
  withTypedValue,
} from "@/utils/tableLayout";

export default function useColumnWidthPersistence({
  columns,
  moduleKey,
  viewKey = "table",
  applyWidth,
}) {
  const write = useLivePresentationWrite();

  /** Columns with a write in flight, for the header's saving indicator. */
  const [savingColumns, setSavingColumns] = useState(() => new Set());

  const inFlight = useRef(new Set());
  const queued = useRef(new Map());

  /*
   * Read through refs so a commit always builds its payload from the CURRENT
   * layout. The write is fired from a pointerup handler, and a queued write
   * runs after a re-read, both of which can outlive the render they were
   * created in.
   */
  const columnsRef = useRef(columns);
  const applyWidthRef = useRef(applyWidth);

  useEffect(() => {
    columnsRef.current = columns;
    applyWidthRef.current = applyWidth;
  }, [applyWidth, columns]);

  const markSaving = useCallback((accessor, saving) => {
    setSavingColumns((current) => {
      const next = new Set(current);

      if (saving) {
        next.add(accessor);
      } else {
        next.delete(accessor);
      }

      return next;
    });
  }, []);

  /* Self-referencing through a ref, so the queue can drain itself. */
  const sendRef = useRef(null);

  const send = useCallback(
    async (accessor, nextWidth, previousWidth) => {
      const column = (columnsRef.current ?? []).find(
        (candidate) => candidate.accessor === accessor,
      );

      if (!column) {
        return;
      }

      const entry = readPresentationEntry(column, "width");

      /*
       * Flexibility returned no mutation for this width, which is how it says
       * the value is derived rather than overridable. The drag still works, it
       * just is not stored - and it is not worth a toast on every release.
       */
      if (!entry.writable) {
        return;
      }

      const width = clampWidth(nextWidth, column);

      /* Already what the server holds. */
      if (Number(entry.currentValue) === width) {
        return;
      }

      inFlight.current.add(accessor);
      markSaving(accessor, true);

      try {
        await write.mutateAsync({
          mutation: withTypedValue(entry, width),
          moduleKey,
          viewKey,
        });
      } catch (error) {
        /*
         * Put the pre-drag width back. On a stale read the re-read inside the
         * mutation never ran, so this is the only thing keeping the header from
         * showing a width the CRM does not have.
         */
        if (previousWidth !== undefined && previousWidth !== null) {
          applyWidthRef.current?.(accessor, previousWidth);
        }

        toast.error(describeMetadataWriteError(error));

        /* Drop anything queued for this column; it was built on a bad read. */
        queued.current.delete(accessor);

        if (isStaleReadError(error)) {
          /*
           * The payload on screen is out of date. Nothing to do beyond the
           * rollback: the mutation already invalidated the caches, so the next
           * render reads fresh values.
           */
        }
      } finally {
        inFlight.current.delete(accessor);
        markSaving(accessor, false);

        const pending = queued.current.get(accessor);

        if (pending) {
          queued.current.delete(accessor);

          sendRef.current?.(
            accessor,
            pending.width,
            pending.previousWidth,
          );
        }
      }
    },
    [markSaving, moduleKey, viewKey, write],
  );

  sendRef.current = send;

  /**
   * Called once per finished drag, never during one.
   *
   * `previousWidth` is the width the drag started from, so a rejected write can
   * be rolled back to something the CRM actually holds.
   */
  const commitColumnWidth = useCallback(
    (accessor, nextWidth, previousWidth) => {
      if (!accessor || !moduleKey) {
        return;
      }

      if (inFlight.current.has(accessor)) {
        /*
         * Latest wins. Keep the ORIGINAL previousWidth so a rollback lands on
         * the last value the server confirmed, not on an intermediate drag.
         */
        const existing = queued.current.get(accessor);

        queued.current.set(accessor, {
          width: nextWidth,
          previousWidth: existing
            ? existing.previousWidth
            : previousWidth,
        });

        return;
      }

      send(accessor, nextWidth, previousWidth);
    },
    [moduleKey, send],
  );

  return {
    commitColumnWidth,
    savingColumns,
    isSavingWidth: savingColumns.size > 0,
  };
}
