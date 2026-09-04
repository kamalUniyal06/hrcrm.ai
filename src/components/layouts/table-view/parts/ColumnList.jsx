/**
 * The column list, in published rank order, with drag-to-reorder.
 *
 * Reordering is disabled - not just visually, but at the SortableContext -
 * whenever a write is in flight or the rank data is invalid. In both cases the
 * neighbours a new rank would be calculated from cannot be trusted: they would
 * be read off an order the server has not accepted.
 *
 * Ranks are shown as the opaque strings they are. They are never rendered as
 * a position number, because that is exactly the mistake that leads to
 * guessing a rank from the visual index.
 */

import React from "react";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { GripVertical, Loader2, Lock } from "lucide-react";

import { Badge, Toggle } from "./Primitives";

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

    disabled: reorderDisabled,

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
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(column)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
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
        py-2
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
          cursor-grab
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

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium text-foreground">
            {column.label}
          </span>

          <Badge tone="neutral">{column.type}</Badge>

          {!column.visible && <Badge tone="warning">hidden</Badge>}
        </div>

        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
          {column.accessor}
        </p>
      </div>

      {/* WIDTH */}

      <span
        className="
          w-12
          shrink-0
          text-right
          font-mono
          text-[10px]
          text-muted-foreground
        "
        title={`${column.width}px wide`}
      >
        {column.width}px
      </span>

      {/* RANK - opaque string, never a position number */}

      <span
        className="
          w-14
          shrink-0
          truncate
          text-right
          font-mono
          text-[9px]
          text-muted-foreground
        "
        title={column.rank ? `rank ${column.rank}` : "no rank"}
      >
        {column.rank ?? "—"}
      </span>

      {/* BUSY / VISIBILITY */}

      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      ) : (
        <Toggle
          checked={column.visible}
          disabled={!visibilityWritable}
          onChange={() => onToggleVisible(column)}
          label={`Show ${column.label}`}
        />
      )}
    </div>
  );
}

/* =========================================================================
   LIST
   ========================================================================= */

/**
 * Columns are only ever compared inside this one view, so the collision
 * detection is restricted to column droppables. Nothing else on the page is a
 * valid drop target.
 */
const collisionDetectionStrategy = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.data?.current?.type === "column",
    ),
  });

export default function ColumnList({
  columns,
  allColumns,
  selection,
  onSelect,
  onToggleVisible,
  onMove,
  busyAccessor,
  reorderDisabled,
  searching,
}) {
  const [dragging, setDragging] = React.useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  /**
   * A filtered list cannot be reordered: the neighbours on screen are not the
   * neighbours in the view, so a rank calculated from them would put the
   * column somewhere the user did not ask for.
   */
  const dragDisabled = reorderDisabled || searching;

  const handleDragEnd = ({ active, over }) => {
    setDragging(null);

    if (!over || active.id === over.id) {
      return;
    }

    /* Indexes are resolved against the FULL list, never the filtered one. */
    const destinationIndex = allColumns.findIndex(
      (column) => column.accessor === over.id,
    );

    if (destinationIndex === -1) {
      return;
    }

    onMove(active.id, destinationIndex);
  };

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
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={({ active }) => setDragging(active.data.current)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={columns.map((column) => column.accessor)}
        strategy={verticalListSortingStrategy}
        disabled={dragDisabled}
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
              reorderDisabled={dragDisabled}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {dragging?.accessor ? (
          <div
            className="
              rounded-lg
              border
              border-primary/30
              bg-card
              px-3
              py-2
              shadow-xl
            "
          >
            <p className="font-mono text-xs font-medium text-foreground">
              {dragging.accessor}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
