/**
 * Everything this view lets you change about one column.
 *
 * The controls are driven by the contract, not by this file: each row is live
 * only if Flexibility returned a mutation for that property on this column, and
 * read-only with a reason if it did not. So the same inspector correctly
 * describes a view where only visibility is overridable and one where the name,
 * the flags and the width bounds all are.
 *
 * Edits go into the draft layer and are published by Repair.
 */

import React from "react";

import { BoolRow, CapabilitySummary, NumberRow, TextRow } from "@/components/layouts/shared/PropertyRows";
import FieldTypeIcon from "@/components/layouts/shared/FieldTypeIcon";

import { COLUMN_PROPERTIES, WIDTH_MAX, WIDTH_MIN } from "@/utils/tableLayout";

export default function ColumnInspector({
  column,
  onPatch,
  busy,
}) {
  const entry = (property) => column.presentation?.[property];
  const set = (property) => (value) => onPatch({ [property]: value });

  /* Show the name error in the field before Repair attempts to publish it. */
  const labelInvalid = !String(column.label ?? "").trim();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <FieldTypeIcon type={column.type} />

          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">
              {column.label}
            </h3>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <CapabilitySummary item={column} properties={COLUMN_PROPERTIES} />

        <TextRow
          property="label"
          value={column.label}
          entry={entry("label")}
          busy={busy}
          onChange={set("label")}
          placeholder="Column header"
          error={labelInvalid ? "A name is required." : null}
        />

        <BoolRow
          property="visible"
          value={column.visible}
          entry={entry("visible")}
          busy={busy}
          onChange={set("visible")}
          title="Show column"
        />

        <BoolRow
          property="sortable"
          value={column.sortable}
          entry={entry("sortable")}
          busy={busy}
          onChange={set("sortable")}
        />

        <BoolRow
          property="searchable"
          value={column.searchable}
          entry={entry("searchable")}
          busy={busy}
          onChange={set("searchable")}
        />

        <BoolRow
          property="editable"
          value={column.editable}
          entry={entry("editable")}
          busy={busy}
          onChange={set("editable")}
          title="Editable inline"
        />

        <BoolRow
          property="resizable"
          value={column.resizable}
          entry={entry("resizable")}
          busy={busy}
          onChange={set("resizable")}
        />

        <NumberRow
          property="width"
          value={column.width}
          entry={entry("width")}
          busy={busy}
          onCommit={set("width")}
          min={column.minWidth ?? WIDTH_MIN}
          max={column.maxWidth ?? WIDTH_MAX}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberRow
            property="minWidth"
            value={column.minWidth}
            entry={entry("minWidth")}
            busy={busy}
            onCommit={set("minWidth")}
          />

          <NumberRow
            property="maxWidth"
            value={column.maxWidth}
            entry={entry("maxWidth")}
            busy={busy}
            onCommit={set("maxWidth")}
          />
        </div>
      </div>
    </div>
  );
}
