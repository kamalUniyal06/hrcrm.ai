/**
 * The layout tree: blocks, tabs, sections and fields, with drag to reorder.
 *
 * Two kinds of drag land here, and they are told apart by
 * `active.data.current.type` rather than by where the pointer started:
 *
 *   node          -> node     reorder inside one scope, writes an order value
 *   library-field -> section  place a new field, staged as a create
 *
 * The ordering key is never displayed. It is an opaque generated string that
 * the user cannot usefully read or type, and showing it invited the question of
 * how to edit it - which the answer to is "drag the row".
 *
 * The DndContext is NOT here. It lives in Views.jsx, because the field library
 * on the other side of the pane drags into this tree and a draggable and its
 * drop target have to share one context.
 */

import React, { useState } from "react";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ChevronDown, ChevronRight, GripVertical, Lock, Settings2 } from "lucide-react";

import { Badge, Toggle } from "@/components/layouts/shared/Primitives";
import FieldTypeIcon from "@/components/layouts/shared/FieldTypeIcon";
import { childrenAt, nodeKey, nodeWritable } from "@/utils/detailEditLayout";

import { idFor, nextScope, titleOf } from "./draftChanges";

/* =========================================================================
   ROW
   ========================================================================= */

function SortableNode({
  item,
  scope,
  layout,
  selected,
  disabled,
  newKeys,
  dropTargetId,
  onSelect,
  onToggle,
}) {
  const rowId = idFor(scope, item);
  const isNew = Boolean(newKeys?.has(rowId));
  const dropTarget = dropTargetId === rowId;

  const [open, setOpen] = useState(true);

  const sortable = useSortable({
    id: rowId,

    /*
     * Reordering and receiving are separate permissions. A blocked reorder - a
     * save in flight, or an active search whose filtered neighbours would give
     * a wrong position - must not stop a library field being dropped here.
     */
    disabled: { draggable: disabled, droppable: false },

    data: { type: "node", scope, itemId: nodeKey(item) },
  });

  const childScope = nextScope(scope, item);
  const children = childScope ? childrenAt(layout, childScope) : [];

  const active =
    selected?.itemId === nodeKey(item) &&
    JSON.stringify(selected.scope) === JSON.stringify(scope);

  const isContainer = scope.type !== "field";
  const hidden = item.visible === false;

  /*
   * Gated on the contract, not just on `disabled`.
   *
   * A `tabs` block arrives with no `presentation` block at all, so neither its
   * visibility nor its position can be written. An ungated toggle there staged a
   * change that no mutation existed for, and the whole publish then threw on it
   * - taking every unrelated edit down with it.
   */
  const visibleWritable = nodeWritable(item, "visible");
  const rankWritable = nodeWritable(item, "rank");

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={`
        ${isContainer ? "overflow-hidden rounded-xl border bg-card" : "rounded-lg"}
        ${active ? "border-primary/40 bg-primary/[0.03] shadow-sm" : isContainer ? "border-border" : ""}
        ${sortable.isDragging ? "opacity-40" : ""}
        ${dropTarget ? "ring-2 ring-primary ring-offset-1" : ""}
      `}
    >
      <div
        onClick={() => onSelect(scope, item)}
        className={`
          layout-tree-row
          flex
          cursor-pointer
          items-center
          gap-2
          px-2
          ${isContainer ? "py-2.5" : "py-2 hover:bg-accent/60"}
        `}
      >
        <button
          type="button"
          {...sortable.attributes}
          {...sortable.listeners}
          onClick={(event) => event.stopPropagation()}
          disabled={disabled || !rankWritable}
          title={
            !rankWritable
              ? "This item's position is not writable on this view"
              : disabled
                ? "Reordering is unavailable right now"
                : `Drag to move ${titleOf(item)}`
          }
          aria-label={`Drag to move ${titleOf(item)}`}
          className="
            grid
            h-7
            w-5
            shrink-0
            touch-none
            cursor-grab
            place-items-center
            rounded
            text-muted-foreground/40
            hover:bg-accent
            hover:text-foreground
            active:cursor-grabbing
            disabled:cursor-not-allowed
            disabled:opacity-30
          "
        >
          {rankWritable ? (
            <GripVertical className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
        </button>

        {isContainer ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground">
            <Settings2 className="h-4 w-4" />
          </span>
        ) : (
          <FieldTypeIcon type={item.type} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className={`
                ${isContainer ? "text-sm font-semibold" : "text-xs font-medium"}
                truncate
                ${hidden ? "opacity-45" : ""}
              `}
            >
              {titleOf(item)}
            </p>

            {isNew && <Badge tone="primary">Added</Badge>}
            {hidden && <Badge tone="warning">hidden</Badge>}
          </div>

          <p className="truncate text-[10px] text-muted-foreground">
            {isContainer
              ? `${children.length} ${childScope?.type || "item"}${children.length === 1 ? "" : "s"}`
              : item.accessor}
          </p>
        </div>

        <Toggle
          checked={item.visible !== false}
          disabled={disabled || !visibleWritable}
          onChange={() => onToggle(scope, item)}
          label={`Show ${titleOf(item)}`}
        />

        {isContainer && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((value) => !value);
            }}
            aria-label={open ? `Collapse ${titleOf(item)}` : `Expand ${titleOf(item)}`}
            aria-expanded={open}
            className="grid h-7 w-7 place-items-center rounded hover:bg-accent"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      {isContainer && open && childScope && (
        <div className="border-t border-border px-2 py-1.5">
          <ScopeList
            scope={childScope}
            layout={layout}
            selected={selected}
            disabled={disabled}
            newKeys={newKeys}
            dropTargetId={dropTargetId}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   LIST
   ========================================================================= */

export function ScopeList({
  scope,
  layout,
  selected,
  disabled,
  newKeys,
  dropTargetId,
  onSelect,
  onToggle,
}) {
  const items = childrenAt(layout, scope);

  return (
    <SortableContext
      items={items.map((item) => idFor(scope, item))}
      strategy={verticalListSortingStrategy}
      disabled={{ draggable: disabled, droppable: false }}
    >
      <div className={scope.type === "field" ? "space-y-0.5" : "space-y-2"}>
        {items.map((item) => (
          <SortableNode
            key={idFor(scope, item)}
            item={item}
            scope={scope}
            layout={layout}
            selected={selected}
            disabled={disabled}
            newKeys={newKeys}
            dropTargetId={dropTargetId}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
      </div>
    </SortableContext>
  );
}

export default ScopeList;
