/**
 * Inspector controls for one presentation property.
 *
 * Each row asks the same question before it renders anything: did Flexibility
 * return a mutation for this property on this item? If not the control is
 * disabled and says why, rather than being hidden or - worse - offered and then
 * failing on save. That is the rule the whole editor runs on; these rows just
 * make it visible one property at a time.
 *
 * Shared by the column and status inspectors so the two cannot drift in how
 * they present a locked property.
 */

import React, { useEffect, useState } from "react";

import { Lock, X } from "lucide-react";

import { FieldInput, SwitchRow, Toggle } from "@/components/layouts/shared/Primitives";
import {
  PROPERTY_LABELS,
  WIDTH_MAX,
  WIDTH_MIN,
  readPresentationEntry,
} from "@/utils/tableLayout";

/* =========================================================================
   LOCK BADGE
   ========================================================================= */

function LockedHint() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
      <Lock className="h-2.5 w-2.5" />
      Fixed by the published layout
    </span>
  );
}

/* =========================================================================
   TEXT
   ========================================================================= */

export function TextRow({
  property,
  value,
  entry,
  busy,
  onChange,
  placeholder,
  hint,
  error,
}) {
  const writable = Boolean(entry?.writable);

  return (
    <div>
      <FieldInput
        id={`property-${property}`}
        label={PROPERTY_LABELS[property] ?? property}
        value={value ?? ""}
        disabled={!writable || busy}
        placeholder={placeholder}
        onChange={onChange}
        error={writable ? error : null}
        hint={writable ? hint : null}
      />

      {!writable && (
        <p className="mt-1">
          <LockedHint />
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   NUMBER
   ========================================================================= */

/**
 * A number held as text while it is being typed.
 *
 * Committing on every keystroke cannot work here: the draft layer compares
 * values with `JSON.stringify`, so an in-progress `""` or `"1"` on the way to
 * `"120"` would each register as a real change, and a cleared field would
 * commit `0`. So the text is local, and a parsed number is committed on blur or
 * Enter. Anything unparseable reverts to the value that is actually stored,
 * which tells the user the edit did not take.
 */
export function NumberRow({
  property,
  value,
  entry,
  busy,
  onCommit,
  min = WIDTH_MIN,
  max = WIDTH_MAX,
  hint,
}) {
  const writable = Boolean(entry?.writable);

  const [text, setText] = useState(String(value ?? ""));
  const [error, setError] = useState(null);

  /* Resync on Reset, on a refetch, and when another item is selected. */
  useEffect(() => {
    setText(String(value ?? ""));
    setError(null);
  }, [value]);

  const commit = () => {
    const trimmed = text.trim();

    if (!trimmed) {
      setText(String(value ?? ""));
      setError(null);

      return;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed)) {
      setText(String(value ?? ""));
      setError(null);

      return;
    }

    const rounded = Math.round(parsed);

    if (rounded < min || rounded > max) {
      setError(`Must be between ${min} and ${max}.`);

      return;
    }

    setError(null);
    onCommit(rounded);
  };

  return (
    <div>
      <FieldInput
        id={`property-${property}`}
        label={PROPERTY_LABELS[property] ?? property}
        type="number"
        inputMode="numeric"
        value={text}
        disabled={!writable || busy}
        onChange={setText}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        error={writable ? error : null}
        hint={writable ? hint : null}
      />

      {!writable && (
        <p className="mt-1">
          <LockedHint property={property} />
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   COLOR
   ========================================================================= */

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * The `#rrggbb` a native color input needs, or null when the value is not a
 * hex color at all.
 *
 * `<input type="color">` accepts nothing else - no `#abc`, no empty string, no
 * token name - so a value it cannot represent has to be detected rather than
 * passed through and silently turned into black.
 */
function toSwatchValue(value) {
  const raw = String(value ?? "").trim();

  if (!HEX_PATTERN.test(raw)) {
    return null;
  }

  const digits = raw.replace("#", "");

  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits;

  return `#${full.toLowerCase()}`;
}

/**
 * A starting palette, not a constraint.
 *
 * The stored value is free text on `value_text`, and the two colors already in
 * use in this CRM (#00bc7d, #859cdd) are arbitrary hexes, so restricting the
 * field to a fixed list would make existing values unrepresentable. These are
 * one click instead of eight keystrokes; anything else can still be typed.
 */
const COLOR_PRESETS = [
  "#64748b",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
];

export function ColorRow({ property, value, entry, busy, onChange, hint }) {
  const writable = Boolean(entry?.writable);
  const disabled = !writable || busy;

  /*
   * Text is local while it is being typed, for the same reason as NumberRow: a
   * half-typed `#85` would otherwise be committed as the stored color and
   * repaint the swatch on every keystroke.
   */
  const [text, setText] = useState(String(value ?? ""));

  useEffect(() => {
    setText(String(value ?? ""));
  }, [value]);

  const swatch = toSwatchValue(value);

  /** Picking from the swatch or a preset is already a final value. */
  const pick = (next) => {
    setText(next);
    onChange(next);
  };

  const commitText = () => {
    const trimmed = text.trim();

    if (!trimmed) {
      onChange("");

      return;
    }

    /*
     * A hex is normalized so `859cdd` and `#85C` both become `#rrggbb`.
     * Anything else is kept exactly as typed - the renderer may accept token
     * names, and rejecting one here would lose a value the backend would have
     * taken.
     */
    const normalized = toSwatchValue(trimmed) ?? trimmed;

    setText(normalized);
    onChange(normalized);
  };

  return (
    <div>
      <label
        htmlFor={`property-${property}`}
        className="mb-1.5 block text-xs font-medium text-foreground"
      >
        {PROPERTY_LABELS[property] ?? property}
      </label>

      <div className="flex items-center gap-2">
        {/* SWATCH */}

        <span
          className="
            relative
            h-10
            w-10
            shrink-0
            overflow-hidden
            rounded-lg
            border
            border-border
          "
        >
          <input
            type="color"
            value={swatch ?? "#000000"}
            disabled={disabled}
            onChange={(event) => pick(event.target.value)}
            aria-label={`Pick a ${PROPERTY_LABELS[property] ?? property}`}
            className="
              absolute
              -inset-1
              h-[calc(100%+0.5rem)]
              w-[calc(100%+0.5rem)]
              cursor-pointer
              border-0
              bg-transparent
              p-0
              disabled:cursor-not-allowed
            "
          />

          {/*
            A value the native input cannot show - empty, or a token name.
            Covering it is more honest than letting it read as black.
          */}
          {!swatch && (
            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-0
                flex
                items-center
                justify-center
                bg-muted
                text-[9px]
                font-medium
                text-muted-foreground
              "
            >
              {String(value ?? "").trim() ? "abc" : "—"}
            </span>
          )}
        </span>

        {/* HEX / TOKEN */}

        <input
          id={`property-${property}`}
          value={text}
          disabled={disabled}
          placeholder="Not set"
          onChange={(event) => setText(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitText();
            }
          }}
          className="
            h-10
            min-w-0
            flex-1
            rounded-lg
            border
            border-border
            bg-background
            px-3
            font-mono
            text-sm
            text-foreground
            outline-none
            placeholder:font-sans
            placeholder:text-muted-foreground
            focus:border-primary/50
            focus:ring-2
            focus:ring-primary/10
            disabled:cursor-not-allowed
            disabled:bg-muted/30
            disabled:text-muted-foreground
          "
        />

        {!disabled && String(value ?? "").trim() && (
          <button
            type="button"
            onClick={() => pick("")}
            title="Clear the color"
            aria-label="Clear the color"
            className="
              flex
              h-10
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-muted-foreground
              transition-colors
              hover:bg-destructive/10
              hover:text-destructive
            "
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* PRESETS */}

      {!disabled && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => {
            const active = swatch === preset;

            return (
              <button
                key={preset}
                type="button"
                onClick={() => pick(preset)}
                title={preset}
                aria-label={`Use ${preset}`}
                aria-pressed={active}
                style={{ backgroundColor: preset }}
                className={`
                  h-6
                  w-6
                  rounded-full
                  border
                  transition-transform
                  hover:scale-110

                  ${
                    active
                      ? "border-foreground ring-2 ring-foreground/20"
                      : "border-black/10"
                  }
                `}
              />
            );
          })}
        </div>
      )}

      {writable && hint && (
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{hint}</p>
      )}

      {!writable && (
        <p className="mt-1">
          <LockedHint />
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   BOOLEAN
   ========================================================================= */

export function BoolRow({
  property,
  value,
  entry,
  busy,
  onChange,
  title,
  description,
}) {
  const writable = Boolean(entry?.writable);

  return (
    <div>
      <SwitchRow
        title={title ?? PROPERTY_LABELS[property] ?? property}
        description={description}
        checked={Boolean(value)}
        disabled={!writable || busy}
        onChange={() => onChange(!value)}
      />

      {!writable && (
        <p className="mt-1 pl-3">
          <LockedHint property={property} />
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   CAPABILITY SUMMARY
   ========================================================================= */

/**
 * What this view will and will not let you change.
 *
 * Worth stating in one place rather than leaving the user to infer it from a
 * column of greyed-out switches. Which properties are writable is decided by
 * the compiled contract, not by this editor, so "add an override in the CRM"
 * is the actual next step and the note says so.
 */
export function CapabilitySummary({ item, properties }) {
  /*
   * Normalized, not read raw.
   *
   * `writable` is derived - the contract only ever sends
   * `{ recordId, currentValue, mutation }` - so reading `item.presentation[x]
   * .writable` directly gets `undefined` for every property and reports the
   * whole node as locked. The table editor got away with it because its model
   * is normalized up front; the detail editor holds the raw contract, so it
   * counted every writable property as fixed while the controls beside it
   * worked fine.
   *
   * `readPresentationEntry` is idempotent, so this is correct for both.
   */
  const locked = properties.filter(
    (property) => !readPresentationEntry(item, property).writable,
  );

  if (!locked.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Lock className="h-3 w-3 text-muted-foreground" />
        {locked.length} of {properties.length} settings are fixed
      </p>

      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
        {locked.map((property) => PROPERTY_LABELS[property] ?? property).join(", ")}
        {" "}
        {locked.length === 1 ? "is" : "are"} part of the published layout. The
        compiled view returns no override for {locked.length === 1 ? "it" : "them"},
        so this editor cannot write {locked.length === 1 ? "it" : "them"} yet.
      </p>
    </div>
  );
}

export { Toggle };
