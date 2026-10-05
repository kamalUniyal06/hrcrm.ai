/**
 * The Columns tab: the view's columns, the selected column's settings, and the
 * module's field library.
 *
 * One `DndContext` for the whole tab, because two different drags cross it and
 * they cannot be split across two contexts:
 *
 *   column      -> column    reorder, writes a rank
 *   library     -> column    stage a create, positioned behind that column
 *
 * The two are told apart by `active.data.current.type` rather than by which
 * list the pointer started in, and the collision detection is narrowed per
 * drag: a reorder may only land on a column, while a library field may also
 * land on the append zone. Letting a reorder see the append zone would send
 * `allColumns.findIndex` looking for an accessor that does not exist.
 */

import React, { useState } from "react";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { ArrowDownToLine, Columns3, Search, X } from "lucide-react";

import ColumnList from "./ColumnList";
import FieldLibrary from "@/components/layouts/shared/FieldLibrary";
import FieldTypeIcon from "@/components/layouts/shared/FieldTypeIcon";
import { InlineAlert } from "@/components/layouts/shared/Primitives";

/** Not an accessor, so it can never collide with a real column id. */
const APPEND_ID = "__column_append__";

/* =========================================================================
   COLLISION DETECTION
   ========================================================================= */

/**
 * Columns are only ever compared inside this one view, so the drop targets are
 * restricted to this tab's own droppables. Which ones are eligible depends on
 * what is being dragged.
 */
const collisionDetectionStrategy = (args) => {
  const dragging = args.active?.data?.current?.type;

  const allowed =
    dragging === "library-field"
      ? ["column", "column-append"]
      : ["column"];

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((container) =>
      allowed.includes(container.data?.current?.type),
    ),
  });
};

/* =========================================================================
   APPEND ZONE
   ========================================================================= */

/**
 * Drop target for "put it at the end".
 *
 * Always rendered rather than only during a drag: appearing mid-drag would
 * reflow the list under a pointer that is already moving, and the empty state
 * needs somewhere to drop onto too.
 */
function AppendZone({ armed }) {
  const { setNodeRef, isOver } = useDroppable({
    id: APPEND_ID,
    data: { type: "column-append" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        mt-2
        flex
        items-center
        justify-center
        gap-2
        rounded-lg
        border
        border-dashed
        px-3
        py-3
        text-xs
        transition-colors

        ${
          isOver
            ? "border-primary bg-primary/10 text-primary"
            : armed
              ? "border-primary/40 text-muted-foreground"
              : "border-border/70 text-muted-foreground/70"
        }
      `}
    >
      <ArrowDownToLine className="h-3.5 w-3.5" />
      Drop here to add at the end
    </div>
  );
}

/* =========================================================================
   PANE
   ========================================================================= */

export default function ColumnsPane({
  /* Column list */
  columns,
  allColumns,
  selection,
  onSelect,
  onToggleVisible,
  onMove,
  busyAccessor,
  reorderDisabled,
  disabled,
  search,
  onSearchChange,
  searching,
  rankError,

  /* Right pane */
  inspector,

  /* Field library */
  libraryOpen,
  module,
  library,
  inViewAccessors,
  stagedAccessors,
  stagedFields,
  onAddField,
  onRemoveStaged,
}) {
  const [dragging, setDragging] = useState(null);

  /** Column a dragged library field would be inserted behind. */
  const [insertAfter, setInsertAfter] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const draggingLibraryField = dragging?.type === "library-field";

  const reset = () => {
    setDragging(null);
    setInsertAfter(null);
  };

  const handleDragOver = ({ active, over }) => {
    if (active.data.current?.type !== "library-field") {
      return;
    }

    setInsertAfter(
      over?.data?.current?.type === "column" ? String(over.id) : null,
    );
  };

  const handleDragEnd = ({ active, over }) => {
    const type = active.data.current?.type;

    reset();

    if (!over) {
      return;
    }

    /* ----------------------------------------- library field -> new column */

    if (type === "library-field") {
      const field = active.data.current?.field;
      const overType = over.data.current?.type;

      if (!field) {
        return;
      }

      /*
       * `rank_after` names an existing accessor, so dropping onto a column
       * inserts behind it. The append zone sends null, which is the backend's
       * default placement.
       */
      if (overType === "column") {
        onAddField(field, String(over.id));
      } else if (overType === "column-append") {
        onAddField(field, null);
      }

      return;
    }

    /* -------------------------------------------------- column -> reorder */

    if (active.id === over.id) {
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={({ active }) => setDragging(active.data.current)}
      onDragCancel={reset}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div
        className={`
          min-h-[360px]
          layout-view-grid
          ${libraryOpen ? "layout-editor-grid--library" : "layout-editor-grid"}
        `}
      >
        {/* ---------------------------------------------------- COLUMN LIST */}

        <div className="flex min-h-0 min-w-0 flex-col bg-card">
          <div className="p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search columns..."
                aria-label="Search columns"
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-background
                  pl-9
                  pr-3
                  text-sm
                  outline-none
                  focus-visible:ring-2
                  focus-visible:ring-primary/40
                "
              />
            </div>

          </div>

          {rankError && (
            <div className="px-4 pb-3">
              <InlineAlert tone="warning" title="Reordering is unavailable">
                Reload this view to try again. You can still edit its settings.
              </InlineAlert>
            </div>
          )}

          {/*
            Staged creates are not in the list above: they have no rank and no
            presentation records until the backend publishes them, so there is
            nothing truthful to show in rank order. They are named here instead,
            and stay visible with the library closed.
          */}
          {stagedFields.length > 0 && (
            <div className="mx-4 mb-3 rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
              <p className="text-xs font-medium text-primary">
                {stagedFields.length}{" "}
                {stagedFields.length === 1 ? "field" : "fields"} staged
              </p>

              <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                They join the view when you click Repair.
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {stagedFields.map((draft) => (
                  <span
                    key={draft.accessor}
                    title={`${draft.accessor} · ${draft.vardefType} · ${draft.width}px`}
                    className="
                      inline-flex
                      items-center
                      gap-1
                      rounded-full
                      border
                      border-primary/30
                      bg-card
                      py-0.5
                      pl-2
                      pr-1
                      text-[10px]
                      font-medium
                      text-foreground
                    "
                  >
                    {draft.label}

                    <button
                      type="button"
                      onClick={() => onRemoveStaged(draft.accessor)}
                      disabled={disabled}
                      aria-label={`Remove ${draft.label} from this batch`}
                      className="
                        flex
                        h-4
                        w-4
                        items-center
                        justify-center
                        rounded-full
                        text-muted-foreground
                        transition-colors
                        hover:bg-destructive/10
                        hover:text-destructive
                        disabled:pointer-events-none
                        disabled:opacity-40
                      "
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="layout-view-scroll min-h-0 flex-1 max-h-[min(52vh,560px)] overflow-y-auto px-3 pb-4">
            <ColumnList
              columns={columns}
              selection={selection}
              onSelect={onSelect}
              onToggleVisible={onToggleVisible}
              busyAccessor={busyAccessor}
              reorderDisabled={reorderDisabled}
              disabled={disabled}
              searching={searching}
              insertAfterAccessor={insertAfter}
            />

            {libraryOpen && <AppendZone armed={draggingLibraryField} />}
          </div>
        </div>

        {/* ------------------------------------------------------ INSPECTOR */}

        <div className="min-h-0 min-w-0 bg-background">{inspector}</div>

        {/* -------------------------------------------------- FIELD LIBRARY */}

        {libraryOpen && (
          <div className="min-h-0 min-w-0 bg-card">
            <FieldLibrary
              module={module}
              fields={library.data}
              loading={library.isPending}
              refreshing={library.isFetching && !library.isPending}
              error={library.error}
              onRetry={library.refetch}
              inViewAccessors={inViewAccessors}
              stagedAccessors={stagedAccessors}
              onAdd={(field) => onAddField(field, null)}
              onRemoveStaged={onRemoveStaged}
              disabled={disabled}
              showDescription={false}
            />
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- DRAG OVERLAY */}

      <DragOverlay>
        {dragging?.type === "library-field" && dragging.field ? (
          <div
            className="
              flex
              items-center
              gap-2
              rounded-lg
              border
              border-primary/30
              bg-card
              px-3
              py-2
              shadow-xl
            "
          >
            <FieldTypeIcon type={dragging.field.type} />

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {dragging.field.label}
              </p>

              <p className="truncate font-mono text-[10px] leading-4 text-muted-foreground">
                {dragging.field.name}
              </p>
            </div>
          </div>
        ) : dragging?.accessor ? (
          <div
            className="
              flex
              items-center
              gap-2
              rounded-lg
              border
              border-primary/30
              bg-card
              px-3
              py-3
              shadow-xl
            "
          >
            <Columns3 className="h-4 w-4 text-muted-foreground" />

            <p className="font-mono text-sm font-medium text-foreground">
              {dragging.accessor}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
