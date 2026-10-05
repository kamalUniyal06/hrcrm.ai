/**
 * The column list, in published rank order, with drag-to-reorder.
 *
 * Reordering is disabled - not just visually, but at the SortableContext -
 * whenever a write is in flight or the rank data is invalid. In both cases the
 * neighbours a new rank would be calculated from cannot be trusted: they would
 * be read off an order the server has not accepted.
 *
 * Ordering metadata stays internal; rows show only editable presentation.
 *
 * THE DND CONTEXT IS NOT HERE. It lives in the parent `ColumnsPane`, because
 * the field library on the other side of the pane drags INTO this list, and a
 * draggable and its drop target have to share one context. `StatusList` still
 * owns its own context: nothing drags into it, so it has no reason to.
 */

import React from "react";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { GripVertical, Loader2, Lock } from "lucide-react";

import { Badge, Toggle } from "@/components/layouts/shared/Primitives";
import FieldTypeIcon from "@/components/layouts/shared/FieldTypeIcon";

/* =========================================================================
   ROW
   ========================================================================= */

function SortableColumn({
  column,
  selected,
  onSelect,
  onToggleVisible,
  busy,
  reorderDisabled,
  disabled = false,
  insertAfter = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.accessor,

    /*
     * Reordering and receiving are separate permissions here.
     *
     * A blocked reorder - a write in flight, invalid ranks, or an active
     * search - must not stop a library field being dropped onto this row. The
     * two are unrelated: a reorder needs the neighbours on screen to match the
     * neighbours in the view, while `rank_after` only names one accessor and
     * the backend generates the rank from it either way.
     *
     * Passing a plain boolean would disable both, which is what silently broke
     * placement while the list was filtered.
     */
    disabled: { draggable: reorderDisabled, droppable: false },

    data: {
      type: "column",
      accessor: column.accessor,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const visibilityWritable = column.presentation?.visible?.writable;
  const rankWritable = column.presentation?.rank?.writable;

  return (
    <div className="relative">
      <div
        ref={setNodeRef}
        style={style}
        onClick={() => onSelect(column)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onSelect(column);
          }
        }}
        className={`
          group
          flex
          cursor-pointer
          items-center
          gap-2
          rounded-lg
          border
          px-2
          py-3
          transition-colors

          ${
            selected
              ? "border-primary/40 bg-primary/[0.06]"
              : "border-transparent hover:bg-accent/60"
          }

          ${isDragging ? "opacity-50" : ""}

          ${column.visible ? "" : "opacity-60"}
        `}
      >
        {/* DRAG HANDLE */}

        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
          disabled={reorderDisabled || !rankWritable}
          title={
            !rankWritable
              ? "This column's position is not writable"
              : reorderDisabled
                ? "Reordering is unavailable right now"
                : `Drag to move ${column.label}`
          }
          aria-label={`Drag to move ${column.label}`}
          className="
            flex
            h-7
            w-5
            shrink-0
            touch-none cursor-grab
            items-center
            justify-center
            rounded-md
            text-muted-foreground/40
            hover:bg-accent
            hover:text-foreground
            active:cursor-grabbing
            disabled:cursor-not-allowed
            disabled:opacity-30
            disabled:hover:bg-transparent
          "
        >
          {rankWritable ? (
            <GripVertical className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
        </button>

        {/* LABEL */}

        <FieldTypeIcon type={column.type} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {column.label}
            </span>

            {column.dirty && <Badge tone="primary">Unsaved</Badge>}
            {!column.visible && <Badge tone="warning">hidden</Badge>}
          </div>
        </div>

        {/* BUSY / VISIBILITY */}

        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        ) : (
          <Toggle
            checked={column.visible}
            disabled={!visibilityWritable || disabled}
            onChange={() => onToggleVisible(column)}
            label={`Show ${column.label}`}
          />
        )}
      </div>

      {/*
        Where a dragged library field would land. Drawn under the row rather
        than as a border on it, so the row does not shift while the pointer
        moves across the list.
      */}
      {insertAfter && (
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -bottom-[3px]
            left-2
            right-2
            h-[3px]
            rounded-full
            bg-primary
          "
        />
      )}
    </div>
  );
}

/* =========================================================================
   LIST
   ========================================================================= */

export default function ColumnList({
  columns,
  selection,
  onSelect,
  onToggleVisible,
  busyAccessor,
  reorderDisabled,
  disabled = false,
  searching,
  insertAfterAccessor = null,
}) {
  if (!columns.length) {
    /*
     * Say which of the two it is. Reporting a search miss when the search box
     * is empty sends the reader looking for a filter that is not there.
     */
    return (
      <p className="px-2 py-8 text-center text-xs text-muted-foreground">
        {searching
          ? "No column matches the current search."
          : "This view has no columns."}
      </p>
    );
  }

  return (
    <SortableContext
      items={columns.map((column) => column.accessor)}
      strategy={verticalListSortingStrategy}
      disabled={{ draggable: reorderDisabled, droppable: false }}
    >
      <div className="space-y-0.5">
        {columns.map((column) => (
          <SortableColumn
            key={column.accessor}
            column={column}
            selected={
              selection?.type === "column" &&
              selection?.accessor === column.accessor
            }
            onSelect={onSelect}
            onToggleVisible={onToggleVisible}
            busy={busyAccessor === column.accessor}
            reorderDisabled={reorderDisabled}
            disabled={disabled}
            insertAfter={insertAfterAccessor === column.accessor}
          />
        ))}
      </div>
    </SortableContext>
  );
}
