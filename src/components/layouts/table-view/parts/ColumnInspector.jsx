/**
 * The right-hand panel for one column.
 *
 * Three values are writable, because those are the three the Flexibility
 * contract returns a mutation for: visibility, width and position. Everything
 * else on a column - its label, type, sortability, the vardef behind it - is
 * owned by the published revision and shown read-only.
 *
 * Width is committed on blur or Enter rather than per keystroke. Each commit
 * is a real write followed by a refetch, so firing one per digit would send a
 * stack of mutations whose `expected_value_integer` no longer matched.
 */

import React, { useEffect, useState } from "react";

import { Check, Info, RotateCcw } from "lucide-react";

import {
  Badge,
  FieldInput,
  GhostButton,
  ReadOnlyValue,
  Section,
  SwitchRow,
} from "./Primitives";

import { WIDTH_MAX, WIDTH_MIN, clampWidth } from "@/utils/tableLayout";

export default function ColumnInspector({
  column,
  onToggleVisible,
  onCommitWidth,
  busy,
}) {
  /**
   * Local draft, so typing does not fire a write. Reset whenever the server
   * value changes underneath - after a refetch the field must show what is
   * actually stored, not a half-typed number.
   */
  const [widthDraft, setWidthDraft] = useState(String(column.width));

  const [widthError, setWidthError] = useState(null);

  useEffect(() => {
    setWidthDraft(String(column.width));
    setWidthError(null);
  }, [column.accessor, column.width]);

  const visibleEntry = column.presentation?.visible;
  const widthEntry = column.presentation?.width;

  const allowedMin = Math.max(WIDTH_MIN, column.minWidth ?? WIDTH_MIN);
  const allowedMax = Math.min(WIDTH_MAX, column.maxWidth ?? WIDTH_MAX);

  const widthDirty = String(column.width) !== widthDraft.trim();

  const commitWidth = () => {
    const raw = widthDraft.trim();

    if (raw === "") {
      setWidthDraft(String(column.width));
      setWidthError(null);

      return;
    }

    const parsed = Number(raw);

    if (!Number.isFinite(parsed)) {
      setWidthError("Enter a width in pixels.");

      return;
    }

    const clamped = clampWidth(parsed, column);

    if (clamped !== Math.round(parsed)) {
      setWidthError(
        `Width must be between ${allowedMin} and ${allowedMax}px. Using ${clamped}px.`,
      );
    } else {
      setWidthError(null);
    }

    setWidthDraft(String(clamped));

    if (clamped !== column.width) {
      onCommitWidth(column, clamped);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* HEADER */}

      <div className="shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Table column
            </p>

            <h3 className="mt-1 truncate text-base font-semibold text-foreground">
              {column.label}
            </h3>

            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {column.accessor}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge tone="primary">{column.type}</Badge>

            {!column.visible && <Badge tone="warning">hidden</Badge>}
          </div>
        </div>
      </div>

      {/* BODY */}

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          {/* ---------------------------------------------- PRESENTATION */}

          <Section
            title="Presentation"
            description="Saved as an override on this view. No new revision is published."
          >
            <div className="space-y-3">
              <SwitchRow
                title="Show this column"
                description={
                  visibleEntry?.writable
                    ? "Stored in value_boolean on the column's visibility override."
                    : "Flexibility returned no mutation for this value, so it cannot be changed here."
                }
                checked={column.visible}
                disabled={!visibleEntry?.writable}
                busy={busy}
                onChange={() => onToggleVisible(column)}
              />

              <div>
                <FieldInput
                  id={`width-${column.accessor}`}
                  label="Width (px)"
                  type="number"
                  inputMode="numeric"
                  value={widthDraft}
                  disabled={!widthEntry?.writable || busy}
                  onChange={setWidthDraft}
                  onBlur={commitWidth}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitWidth();
                    }

                    if (event.key === "Escape") {
                      setWidthDraft(String(column.width));
                      setWidthError(null);
                    }
                  }}
                  error={widthError}
                  hint={
                    widthEntry?.writable
                      ? `Allowed ${allowedMin}–${allowedMax}px. Press Enter or click away to save.`
                      : "Flexibility returned no mutation for this value."
                  }
                />

                {widthDirty && widthEntry?.writable && (
                  <div className="mt-2 flex gap-2">
                    <GhostButton icon={Check} onClick={commitWidth} busy={busy}>
                      Save width
                    </GhostButton>

                    <GhostButton
                      icon={RotateCcw}
                      onClick={() => {
                        setWidthDraft(String(column.width));
                        setWidthError(null);
                      }}
                      disabled={busy}
                    >
                      Revert
                    </GhostButton>
                  </div>
                )}
              </div>

              <ReadOnlyValue
                label="Rank"
                value={column.rank}
                mono
                hint="Opaque, byte-ordered position string. Drag the column in the list to change it; it is never a position number."
              />
            </div>
          </Section>

          {/* ------------------------------------------------- OVERRIDES */}

          <Section
            title="Override records"
            description="Where each value is stored, straight from the returned mutation."
          >
            <div className="overflow-hidden rounded-xl border border-border">
              {["visible", "width", "rank"].map((kind) => {
                const entry = column.presentation?.[kind];

                return (
                  <div
                    key={kind}
                    className="
                      flex
                      items-center
                      gap-2
                      border-b
                      border-border
                      px-3
                      py-2
                      last:border-b-0
                    "
                  >
                    <span className="w-14 shrink-0 text-xs font-medium capitalize text-foreground">
                      {kind}
                    </span>

                    {entry?.writable ? (
                      <>
                        <Badge
                          tone={
                            entry.mutation.action === "update"
                              ? "success"
                              : "primary"
                          }
                        >
                          {entry.mutation.action}
                        </Badge>

                        <span
                          className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground"
                          title={
                            entry.mutation.data?.property_path ||
                            `record ${entry.recordId}`
                          }
                        >
                          {entry.mutation.data?.property_path ??
                            entry.recordId ??
                            "—"}
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 text-[10px] text-muted-foreground">
                        Not writable on this view.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-2 flex gap-1.5 text-[10px] leading-4 text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />

              <span>
                <strong>create</strong> means no override exists yet and the CRM
                will assign the record id. After the first save this becomes
                <strong> update</strong> automatically on the next read.
              </span>
            </p>
          </Section>

          {/* ------------------------------------------------ STRUCTURAL */}

          <Section
            title="Definition"
            description="Owned by the published revision. Changing these needs a new revision, not an override."
          >
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyValue label="Label" value={column.label} />
              <ReadOnlyValue label="Type" value={column.type} mono />
              <ReadOnlyValue label="Min width" value={`${column.minWidth}px`} />
              <ReadOnlyValue label="Max width" value={`${column.maxWidth}px`} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                ["resizable", column.resizable],
                ["sortable", column.sortable],
                ["searchable", column.searchable],
                ["editable", column.editable],
              ].map(([flag, on]) => (
                <Badge key={flag} tone={on ? "success" : "neutral"}>
                  {on ? "" : "no "}
                  {flag}
                </Badge>
              ))}
            </div>
          </Section>

          {/* ------------------------------------------------------- RAW */}

          <Section
            title="Published definition"
            description="Exactly what the compiler returned for this column."
          >
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <pre className="custom-scrollbar max-h-64 overflow-auto text-[10px] leading-5 text-muted-foreground">
                {JSON.stringify(column.definition, null, 2)}
              </pre>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
