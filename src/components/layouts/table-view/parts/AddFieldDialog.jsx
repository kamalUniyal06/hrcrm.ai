/**
 * Publish a new vardef-backed table column.
 *
 * This is the only structural path in the editor. It sends one guarded
 * `outr_ui_fields` create with `publish_to_view: 1`, and the backend hook does
 * everything else inside a single transaction: lock the view, verify
 * `expected_config_version`, clone the active definition, generate the column
 * rank, validate the vardef source, build the replacement revision and publish
 * it. On any failure it rolls back both the catalog row and the revision.
 *
 * So there is no client-side write plan here, and nothing is written into a
 * published revision. The form collects the placement, nothing more.
 *
 * `source_module` and `expected_config_version` both come from the read
 * currently on screen, which is why the dialog shows them: if the layout
 * changed underneath, the create is rejected and the user retries against the
 * fresh version.
 */

import React, { useEffect, useMemo, useState } from "react";

import { AlertTriangle, Plus, X } from "lucide-react";

import {
  Badge,
  FieldInput,
  GhostButton,
  InlineAlert,
  PrimaryButton,
  ReadOnlyValue,
  SwitchRow,
} from "./Primitives";

import { WIDTH_MAX, WIDTH_MIN, existingAccessors } from "@/utils/tableLayout";

/**
 * Types the table renderer understands. `vardef_type` is sent as-is, so this
 * list only steers the user towards something the view can actually render.
 */
const FIELD_TYPES = [
  "text",
  "email",
  "url",
  "currency",
  "number",
  "integer",
  "date",
  "datetime",
  "bool",
  "enum",
  "relate",
  "phone",
];

const APPEND = "__append__";

export default function AddFieldDialog({ model, open, onClose, onSubmit, busy }) {
  const [label, setLabel] = useState("");
  const [sourceField, setSourceField] = useState("");
  const [accessor, setAccessor] = useState("");
  const [vardefType, setVardefType] = useState("text");
  const [width, setWidth] = useState("240");
  const [visible, setVisible] = useState(true);
  const [position, setPosition] = useState(APPEND);
  const [blockId, setBlockId] = useState("");

  /* Reset every time the dialog opens, so a previous attempt cannot leak. */
  useEffect(() => {
    if (!open) {
      return;
    }

    setLabel("");
    setSourceField("");
    setAccessor("");
    setVardefType("text");
    setWidth("240");
    setVisible(true);
    setPosition(APPEND);
    setBlockId("");
  }, [open]);

  /* Escape closes, which is the expected behaviour for a modal. */
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, open]);

  const taken = useMemo(() => existingAccessors(model), [model]);

  const effectiveAccessor = (accessor || sourceField).trim();

  const accessorClash = Boolean(
    effectiveAccessor && taken.has(effectiveAccessor),
  );

  const widthNumber = Number(width);

  const widthValid =
    Number.isFinite(widthNumber) &&
    widthNumber >= WIDTH_MIN &&
    widthNumber <= WIDTH_MAX;

  const canSubmit =
    label.trim() &&
    sourceField.trim() &&
    !accessorClash &&
    widthValid &&
    !busy;

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    /*
     * `rank_after` names an existing accessor. Sending neither rank_after nor
     * rank_before appends the column, which is the backend default.
     */
    const submitted = await onSubmit({
      label: label.trim(),
      sourceField: sourceField.trim(),
      accessor: effectiveAccessor,
      vardefType,
      width: widthNumber,
      visible,
      rankAfter: position === APPEND ? null : position,
      blockId: blockId.trim() || null,
    });

    if (submitted) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-field-title"
    >
      {/* BACKDROP */}

      <button
        type="button"
        aria-label="Close"
        disabled={busy}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />

      {/* PANEL */}

      <form
        onSubmit={handleSubmit}
        className="
          relative
          flex
          max-h-[90vh]
          w-full
          max-w-lg
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-border
          bg-card
          shadow-2xl
        "
      >
        {/* HEADER */}

        <div className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Structural change
            </p>

            <h3
              id="add-field-title"
              className="mt-1 text-base font-semibold text-foreground"
            >
              Add a column to {model.label}
            </h3>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Publishes a replacement revision atomically. The field must exist
              in the{" "}
              <span className="font-mono text-foreground">{model.module}</span>{" "}
              vardefs.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-muted-foreground
              hover:bg-accent
              hover:text-foreground
              disabled:opacity-40
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            <FieldInput
              id="field-label"
              label="Label"
              value={label}
              onChange={setLabel}
              placeholder="Email"
              hint="Shown in the column header."
            />

            <FieldInput
              id="field-source"
              label="Source field"
              value={sourceField}
              onChange={setSourceField}
              placeholder="email"
              hint={`Must exist in the ${model.module} vardefs.`}
            />

            <FieldInput
              id="field-accessor"
              label="Accessor (optional)"
              value={accessor}
              onChange={setAccessor}
              placeholder={sourceField || "email"}
              error={
                accessorClash
                  ? `"${effectiveAccessor}" is already a column in this view.`
                  : null
              }
              hint="Defaults to the source field. Must be unique in this view."
            />

            {/* TYPE */}

            <div>
              <label
                htmlFor="field-type"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Type
              </label>

              <select
                id="field-type"
                value={vardefType}
                onChange={(event) => setVardefType(event.target.value)}
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-background
                  px-3
                  text-sm
                  text-foreground
                  outline-none
                  focus:border-primary/50
                "
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                Sent as vardef_type and as the column's render type.
              </p>
            </div>

            <FieldInput
              id="field-width"
              label="Width (px)"
              type="number"
              inputMode="numeric"
              value={width}
              onChange={setWidth}
              error={
                width && !widthValid
                  ? `Width must be between ${WIDTH_MIN} and ${WIDTH_MAX}px.`
                  : null
              }
              hint={`Allowed ${WIDTH_MIN}–${WIDTH_MAX}px.`}
            />

            {/* POSITION */}

            <div>
              <label
                htmlFor="field-position"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Position
              </label>

              <select
                id="field-position"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-background
                  px-3
                  text-sm
                  text-foreground
                  outline-none
                  focus:border-primary/50
                "
              >
                <option value={APPEND}>Append to the end</option>

                {model.columns.map((column) => (
                  <option key={column.accessor} value={column.accessor}>
                    After {column.label} ({column.accessor})
                  </option>
                ))}
              </select>

              <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                Sent as rank_after. The backend generates the rank itself.
              </p>
            </div>

            <SwitchRow
              title="Visible on publish"
              description="The column can be hidden later without a new revision."
              checked={visible}
              onChange={() => setVisible((current) => !current)}
              disabled={busy}
            />

            <FieldInput
              id="field-block"
              label="Target block id (optional)"
              value={blockId}
              onChange={setBlockId}
              placeholder=""
              hint="Only needed when the definition has more than one table block."
            />

            {/* CONTEXT */}

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyValue label="Source module" value={model.module} mono />

              <ReadOnlyValue
                label="Expected config version"
                value={model.configVersion}
                mono
              />
            </div>

            <InlineAlert tone="warning" title="This publishes a revision">
              <p className="flex gap-1.5">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />

                <span>
                  Unlike visibility, width and position, this creates a new
                  published revision. If the layout changed since it was read,
                  the create is rejected and nothing is written.
                </span>
              </p>
            </InlineAlert>
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <Badge tone="primary" mono>
              outr_ui_fields
            </Badge>

            <Badge tone="warning" mono>
              publish_to_view: 1
            </Badge>
          </div>

          <div className="flex shrink-0 gap-2">
            <GhostButton onClick={onClose} disabled={busy}>
              Cancel
            </GhostButton>

            <PrimaryButton type="submit" icon={Plus} busy={busy} disabled={!canSubmit}>
              {busy ? "Publishing..." : "Publish column"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
}
