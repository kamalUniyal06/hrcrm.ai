/**
 * Small building blocks for the table layout editor.
 *
 * Hand-rolled rather than pulled from a component library because
 * src/components/ui only ships button, tabs and the dropdowns, and the
 * sibling sidebar editor already establishes this look. Keeping the two
 * editors visually identical matters more than saving a few lines.
 */

import React from "react";

import { Loader2, Settings2 } from "lucide-react";

/* =========================================================================
   TOGGLE
   ========================================================================= */

/**
 * On/off switch.
 *
 * `disabled` is used a lot in this editor: a presentation value with no
 * returned mutation cannot be written, so the control says so rather than
 * failing on click.
 */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  busy = false,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled || busy}
      onClick={(event) => {
        event.stopPropagation();
        onChange?.();
      }}
      className={`
        relative
        h-6
        w-11
        shrink-0
        rounded-full
        transition-colors

        ${checked ? "bg-primary" : "bg-muted"}

        ${disabled || busy ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          absolute
          top-1
          h-4
          w-4
          rounded-full
          bg-primary-foreground
          shadow-sm
          transition-transform

          ${checked ? "left-6" : "left-1"}
        `}
      />
    </button>
  );
}

/* =========================================================================
   TEXT INPUT
   ========================================================================= */

export function FieldInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  disabled = false,
  type = "text",
  onKeyDown,
  onBlur,
  inputMode,
}) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-medium text-foreground"
        >
          {label}
        </label>
      )}

      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        className={`
          h-10
          w-full
          rounded-lg
          border
          bg-background
          px-3
          text-sm
          text-foreground
          outline-none
          placeholder:text-muted-foreground
          focus:ring-2
          focus:ring-primary/10
          disabled:cursor-not-allowed
          disabled:bg-muted/30
          disabled:text-muted-foreground

          ${error ? "border-destructive/60" : "border-border focus:border-primary/50"}
        `}
      />

      {(hint || error) && (
        <p
          id={`${id}-hint`}
          className={`mt-1 text-[10px] leading-4 ${
            error ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   READ-ONLY VALUE
   ========================================================================= */

/**
 * A value the editor deliberately does not write.
 *
 * Structural flags such as `sortable` live in the published revision, and
 * ranks are opaque strings assigned by the ordering algorithm. Showing them
 * greyed out is more useful than hiding them, because it explains why they
 * cannot be edited here.
 */
export function ReadOnlyValue({ label, value, hint, mono = false }) {
  return (
    <div>
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-foreground">
          {label}
        </span>
      )}

      <div
        className={`
          flex
          h-10
          w-full
          items-center
          rounded-lg
          border
          border-border
          bg-muted/30
          px-3
          text-sm
          text-muted-foreground

          ${mono ? "font-mono" : ""}
        `}
      >
        <span className="truncate">
          {value === null || value === undefined || value === "" ? "—" : String(value)}
        </span>
      </div>

      {hint && (
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/* =========================================================================
   SWITCH ROW
   ========================================================================= */

export function SwitchRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  busy = false,
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
        rounded-xl
        border
        border-border
        bg-muted/20
        p-3
      "
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>

        {description && (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        busy={busy}
        label={title}
      />
    </div>
  );
}

/* =========================================================================
   BADGE
   ========================================================================= */

const BADGE_TONES = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-amber-500/10 text-amber-600",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-emerald-500/10 text-emerald-600",
};

export function Badge({ children, tone = "neutral", mono = false, title }) {
  return (
    <span
      title={title}
      className={`
        inline-flex
        shrink-0
        items-center
        gap-1
        rounded-full
        px-2
        py-0.5
        text-[10px]
        font-medium

        ${BADGE_TONES[tone] ?? BADGE_TONES.neutral}

        ${mono ? "font-mono" : ""}
      `}
    >
      {children}
    </span>
  );
}

/* =========================================================================
   SECTION
   ========================================================================= */

export function Section({ title, description, children, actions }) {
  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>

          {description && (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {actions}
      </div>

      {children}
    </div>
  );
}

/* =========================================================================
   BUTTONS
   ========================================================================= */

export function GhostButton({
  children,
  onClick,
  disabled = false,
  busy = false,
  icon: Icon,
  title,
  tone = "default",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      className={`
        inline-flex
        items-center
        gap-2
        rounded-lg
        border
        px-3
        py-2
        text-sm
        font-medium
        transition-colors
        disabled:pointer-events-none
        disabled:opacity-50

        ${
          tone === "danger"
            ? "border-destructive/30 text-destructive hover:bg-destructive/10"
            : "border-border text-foreground hover:bg-accent"
        }
      `}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}

      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  busy = false,
  icon: Icon,
  type = "button",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className="
        inline-flex
        items-center
        gap-2
        rounded-lg
        bg-primary
        px-3
        py-2
        text-sm
        font-medium
        text-primary-foreground
        transition-opacity
        hover:opacity-90
        disabled:pointer-events-none
        disabled:opacity-50
      "
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}

      {children}
    </button>
  );
}

/* =========================================================================
   EMPTY / ERROR / LOADING
   ========================================================================= */

export function EmptyState({ title, description, icon, children }) {
  const Icon = icon ?? Settings2;

  return (
    <div
      className="
        flex
        h-full
        min-h-[320px]
        flex-col
        items-center
        justify-center
        px-8
        text-center
      "
    >
      <div
        className="
          mb-4
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-xl
          border
          border-border
          bg-muted/20
        "
      >
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <h3 className="text-sm font-semibold text-foreground">{title}</h3>

      {description && (
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function InlineAlert({ tone = "danger", title, children, actions }) {
  const tones = {
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    info: "border-primary/30 bg-primary/10 text-primary",
  };

  return (
    <div role="alert" className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      {title && <p className="text-sm font-medium">{title}</p>}

      {children && <div className="mt-1 text-xs leading-5">{children}</div>}

      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Loading..." }) {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}
