/**
 * Every field on the module, ready to become a column.
 *
 * This replaces the add-field dialog. The dialog asked the user to type a
 * `source_field` from memory and pick a `vardef_type` off a list, then found
 * out at publish time whether either was right - the backend validates
 * `source_field` against the bean's vardefs, so a typo was a rejected write.
 * Here the vardefs ARE the list, so the source field cannot be wrong and the
 * type is derived from it rather than guessed.
 *
 * Adding stages a create; it does not publish. That is unchanged - the whole
 * point of staging is that several fields go out under one Repair, against one
 * `expected_config_version`, and the user can drop any of them first. Staged
 * rows are marked here rather than only announced in a toast, because a change
 * you cannot see is a change you cannot undo.
 *
 * Fields already in the view are shown and disabled instead of filtered out.
 * "It is already there" is the answer to "why can I not add this", and hiding
 * the row leaves the question open.
 */

import React, { useMemo, useState } from "react";

import { useDraggable } from "@dnd-kit/core";

import {
  Check,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import { Badge, GhostButton, InlineAlert } from "@/components/layouts/shared/Primitives";
import FieldTypeIcon from "./FieldTypeIcon";


import {
  isRenderableModuleField,
  mapVardefType,
  moduleFieldLabel,
} from "@/utils/tableLayout";

/* =========================================================================
   ROW
   ========================================================================= */

function LibraryField({
  field,
  state,
  onAdd,
  onRemoveStaged,
  disabled,
  itemNoun,
  dropTargetLabel,
}) {
  const inView = state === "in-view";
  const staged = state === "staged";

  /* Only an addable field is draggable; the other two have nowhere to go. */
  const draggable = !inView && !staged && !disabled;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${field.name}`,
    disabled: !draggable,
    data: {
      type: "library-field",
      field,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex
        items-center
        gap-2
        rounded-lg
        border
        px-2
        py-2
        transition-colors

        ${
          staged
            ? "border-primary/40 bg-primary/[0.06]"
            : "border-transparent hover:bg-accent/60"
        }

        ${isDragging ? "opacity-50" : ""}

        ${inView ? "opacity-55" : ""}
      `}
    >
      {/* DRAG HANDLE */}

      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={!draggable}
        title={
          inView
            ? `Already a ${itemNoun} in this view`
            : staged
              ? "Already staged for this view"
              : `Drag ${field.label} into the ${dropTargetLabel}`
        }
        aria-label={`Drag ${field.label} into the ${dropTargetLabel}`}
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
          disabled:opacity-0
        "
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <FieldTypeIcon type={field.type} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {field.label}
          </span>

          {staged && <Badge tone="primary">Staged</Badge>}

          {inView && (
            <Badge tone="neutral">
              <Check className="h-2.5 w-2.5" /> In view
            </Badge>
          )}
        </div>

        <p
          className="truncate font-mono text-[10px] leading-4 text-muted-foreground"
          title={`${field.name} · ${field.type || "unknown"}`}
        >
          {field.name}
        </p>
      </div>

      {/* ACTION */}

      {staged ? (
        <button
          type="button"
          onClick={() => onRemoveStaged(field.name)}
          disabled={disabled}
          title={`Remove ${field.label} from this batch`}
          aria-label={`Remove ${field.label} from this batch`}
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-md
            text-muted-foreground
            transition-colors
            hover:bg-destructive/10
            hover:text-destructive
            disabled:pointer-events-none
            disabled:opacity-40
          "
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onAdd(field)}
          disabled={inView || disabled}
          title={
            inView
              ? `${field.label} is already a ${itemNoun}`
              : `Add ${field.label} to the end of this view`
          }
          aria-label={`Add ${field.label} to this view`}
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-md
            border
            border-border
            text-muted-foreground
            transition-colors
            hover:border-primary/40
            hover:bg-primary/10
            hover:text-primary
            disabled:pointer-events-none
            disabled:border-transparent
            disabled:opacity-0
          "
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* =========================================================================
   PANEL
   ========================================================================= */

export default function FieldLibrary({
  module,
  fields,
  loading,
  error,
  onRetry,
  refreshing = false,
  inViewAccessors,
  stagedAccessors,
  onAdd,
  onRemoveStaged,
  disabled = false,

  /*
   * Wording, so the same panel can serve a table (fields become columns,
   * dropped onto a column list) and a detail layout (fields become fields,
   * dropped onto a section). Defaults keep the table call site unchanged.
   */
  itemNoun = "column",
  dropTargetLabel = "column list",
  showDescription = true,
  hint = "Click + to append, or drag a field onto the column list to place it. Width and type are set from the field; adjust them after publishing.",
}) {
  const [query, setQuery] = useState("");

  /*
   * Types that cannot be rendered at all are dropped once, here, rather than
   * at every use: the counts in the header have to describe the list that is
   * actually on screen.
   */
  const renderable = useMemo(
    () => (fields ?? []).filter(isRenderableModuleField),
    [fields],
  );

  const needle = query.trim().toLowerCase();

  const visible = useMemo(() => {
    const decorated = renderable.map((field) => ({
      ...field,
      label: moduleFieldLabel(field),
      renderType: mapVardefType(field.type),
    }));

    if (!needle) {
      return decorated;
    }

    /* Name as well as label: people search for the vardef they know. */
    return decorated.filter((field) =>
      [field.label, field.name, field.type].some((value) =>
        String(value ?? "").toLowerCase().includes(needle),
      ),
    );
  }, [needle, renderable]);

  const available = renderable.filter(
    (field) =>
      !inViewAccessors.has(field.name) && !stagedAccessors.has(field.name),
  ).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Available fields
            </p>

            {showDescription && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {module
                  ? `${available} of ${renderable.length} not yet in this view`
                  : "Waiting for the view"}
              </p>
            )}
          </div>

          <GhostButton
            icon={RotateCcw}
            onClick={onRetry}
            busy={refreshing}
            disabled={!module || refreshing}
            title={`Re-read the ${module || "module"} fields`}
          />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${module || "module"} fields...`}
            aria-label="Search available fields"
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

        {showDescription && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>

      {/*
        Narrow layouts keep a list cap while panes stack. Side-by-side layout
        editors remove that cap and use the shared grid height.
      */}
      <div className="layout-view-scroll custom-scrollbar min-h-0 flex-1 max-h-[min(60vh,640px)] overflow-y-auto px-3 py-3">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {module} fields...
          </div>
        )}

        {!loading && error && (
          <InlineAlert
            tone="warning"
            title="Could not load the field list"
            actions={
              <GhostButton icon={RotateCcw} onClick={onRetry}>
                Try again
              </GhostButton>
            }
          >
            {error.message}
          </InlineAlert>
        )}

        {!loading && !error && !visible.length && (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            {needle
              ? "No field matches the current search."
              : `${module || "This module"} reports no usable fields.`}
          </p>
        )}

        {/* The row needs the wording too, for its tooltips. */}

        {!loading && !error && visible.length > 0 && (
          <div className="space-y-0.5">
            {visible.map((field) => (
              <LibraryField
                key={field.name}
                field={field}
                state={
                  inViewAccessors.has(field.name)
                    ? "in-view"
                    : stagedAccessors.has(field.name)
                      ? "staged"
                      : "addable"
                }
                onAdd={onAdd}
                onRemoveStaged={onRemoveStaged}
                disabled={disabled}
                itemNoun={itemNoun}
                dropTargetLabel={dropTargetLabel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
