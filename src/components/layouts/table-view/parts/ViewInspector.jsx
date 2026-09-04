/**
 * The right-hand panel for the view itself.
 *
 * Two writable values, both from the top-level `presentation` block:
 * whether the view is visible and where it ranks among its siblings.
 *
 * Hiding a view is not the same as deactivating a record. This panel writes
 * `value_boolean` on the view's visibility override; it never touches
 * `is_active` or `deleted`. Module activation is a different record
 * (outr_ui_modules) and belongs to the Sidebar editor.
 */

import React from "react";

import { Database, Info, Table2 } from "lucide-react";

import {
  Badge,
  InlineAlert,
  ReadOnlyValue,
  Section,
  SwitchRow,
} from "./Primitives";

export default function ViewInspector({ model, view, onToggleVisible, busy }) {
  const visibleEntry = view?.presentation?.visible;

  const hiddenCount = model.columns.filter((column) => !column.visible).length;

  return (
    <div className="flex h-full flex-col">
      {/* HEADER */}

      <div className="shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-border
              bg-muted/30
            "
          >
            <Table2 className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              View
            </p>

            <h3 className="mt-1 truncate text-base font-semibold text-foreground">
              {model.label}
            </h3>

            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {model.moduleKey}/{model.viewKey ?? "table"}
            </p>
          </div>
        </div>
      </div>

      {/* BODY */}

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          {/* --------------------------------------------- PRESENTATION */}

          <Section
            title="Presentation"
            description="Saved as an override on this view. No new revision is published."
          >
            <div className="space-y-3">
              <SwitchRow
                title="Show this view"
                description={
                  visibleEntry?.writable
                    ? "Stored in value_boolean on the view's visibility override, not in is_active."
                    : "Flexibility returned no mutation for this value, so it cannot be changed here."
                }
                checked={Boolean(view?.visible)}
                disabled={!visibleEntry?.writable}
                busy={busy}
                onChange={() => onToggleVisible(!view?.visible)}
              />

              <ReadOnlyValue
                label="View rank"
                value={view?.rank}
                mono
                hint="Opaque, byte-ordered position among this module's views."
              />
            </div>
          </Section>

          {/* ---------------------------------------------------- SOURCE */}

          <Section
            title="Source"
            description="Sent back verbatim when a new column is published."
          >
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyValue
                label="Source module"
                value={model.module}
                mono
                hint="The SugarBean whose vardefs supply the columns."
              />

              <ReadOnlyValue
                label="Config version"
                value={model.configVersion}
                mono
                hint="Sent as expected_config_version on structural changes."
              />
            </div>

            <div className="mt-3">
              <ReadOnlyValue
                label="Schema version"
                value={model.schemaVersion}
                mono
              />
            </div>
          </Section>

          {/* ---------------------------------------------------- COLUMNS */}

          <Section title="Columns" description="What this view currently renders.">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="primary">{model.columns.length} total</Badge>

              <Badge tone="success">
                {model.columns.length - hiddenCount} visible
              </Badge>

              {hiddenCount > 0 && <Badge tone="warning">{hiddenCount} hidden</Badge>}
            </div>
          </Section>

          {/* ------------------------------------------ SIBLING VIEWS */}

          {model.availableViewKeys?.length > 1 && (
            <Section
              title="Other views"
              description="Published under the same module key."
            >
              <div className="flex flex-wrap gap-1.5">
                {model.availableViewKeys.map((key) => (
                  <Badge
                    key={key}
                    mono
                    tone={key === (model.viewKey ?? "table") ? "primary" : "neutral"}
                  >
                    {key}
                  </Badge>
                ))}
              </div>

              <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                This editor writes table views. Other view types are listed for
                reference.
              </p>
            </Section>
          )}

          {/* -------------------------------------- MODULE PRESENTATION */}

          {model.modulePresentation && (
            <Section
              title="Module"
              description="Resolved values only. The contract returns no mutation for these."
            >
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <pre className="text-[10px] leading-5 text-muted-foreground">
                  {JSON.stringify(model.modulePresentation, null, 2)}
                </pre>
              </div>

              <p className="mt-2 flex gap-1.5 text-[10px] leading-4 text-muted-foreground">
                <Database className="mt-0.5 h-3 w-3 shrink-0" />

                <span>
                  Turning a module on or off is a write to its
                  <span className="font-mono"> outr_ui_modules </span>
                  record, handled in the Sidebar tab.
                </span>
              </p>
            </Section>
          )}

          {/* ------------------------------------------------------ NOTE */}

          <InlineAlert tone="info" title="How changes are saved">
            <p className="flex gap-1.5">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />

              <span>
                Every edit reuses the mutation this view returned, changes only
                its typed value, and then reloads the layout. Nothing is written
                into a published revision.
              </span>
            </p>
          </InlineAlert>
        </div>
      </div>
    </div>
  );
}
