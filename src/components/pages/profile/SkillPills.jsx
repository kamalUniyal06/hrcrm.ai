import { useState } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import { Check, Plus, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { fieldIcons } from "./candidateFormOptions";

// Skills as pills: type (or paste a comma-separated list) to add, click a pill
// to edit its details. Field ids match `candidate-skills-{index}-{field}`, so
// the builder's validation focus still lands on the right input.

const detailFields = [
  { key: "name", label: "Skill", required: true },
  { key: "version", label: "Version" },
  { key: "total_years_total_months", label: "Experience duration", placeholder: "For example, 2 years 6 months" },
];

const EASE = [0.22, 1, 0.36, 1];
const splitSkills = (value) => value.split(",").map((part) => part.trim()).filter(Boolean);

export default function SkillPills({ items, entryError, onAdd, onUpdate, onRemove }) {
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [seenError, setSeenError] = useState(entryError);
  // A validation error opens the affected skill and keeps it selected after
  // the error clears, so the editor stays open while the user fixes it.
  if (entryError !== seenError) {
    setSeenError(entryError);
    if (entryError?.index >= 0) setSelected(entryError.index);
  }
  // Derived as well, so the field exists in the same render the builder focuses it.
  const openIndex = entryError?.index >= 0 ? entryError.index : selected;
  const openRow = openIndex != null ? items[openIndex] : null;

  const add = (value = draft) => {
    const known = new Set(items.map((row) => row.name?.trim().toLowerCase()).filter(Boolean));
    const fresh = [];
    for (const name of splitSkills(value)) {
      const key = name.toLowerCase();
      if (!known.has(key)) {
        known.add(key);
        fresh.push(name);
      }
    }
    const skipped = splitSkills(value).length - fresh.length;
    setNotice(skipped ? `${skipped === 1 ? "That skill is" : "Some skills are"} already added.` : "");
    if (fresh.length) onAdd(fresh);
    setDraft("");
  };

  const remove = (index) => {
    onRemove(index);
    setSelected((current) => (current === index ? null : current > index ? current - 1 : current));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <label htmlFor="candidate-skill-new" className={styles.label}>Add skills</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div className={cn(styles.inputIcon, "mt-0 flex-1")}>
          <Sparkles size={18} aria-hidden="true" />
          <input
            id="candidate-skill-new"
            value={draft}
            autoComplete="off"
            placeholder="For example, React, Node.js, SQL"
            aria-describedby="candidate-skill-new-hint"
            className={styles.input}
            onChange={(event) => {
              const value = event.target.value;
              setNotice("");
              // Typing a comma turns everything before it into pills.
              if (value.includes(",")) {
                const parts = value.split(",");
                add(parts.slice(0, -1).join(","));
                setDraft(parts.at(-1).trimStart());
              } else setDraft(value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
        </div>
        <button type="button" onClick={() => add()} disabled={!draft.trim()} className={cn(styles.secondary, "bg-card sm:w-auto")}>
          <Plus size={16} aria-hidden="true" /> Add
        </button>
      </div>
      <p id="candidate-skill-new-hint" className={styles.help} aria-live="polite">
        {notice || "Press Enter to add. Use commas to add several."}
      </p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          Your skills <span className="text-muted-foreground font-normal tabular-nums">({items.length})</span>
        </h2>
        {items.length > 0 && <p className="text-muted-foreground text-xs">Select a skill to add details</p>}
      </div>

      {items.length ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Your skills">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((row, index) => {
              const open = openIndex === index;
              const invalid = entryError?.index === index;
              const name = row.name?.trim() || "Unnamed skill";
              return (
                <Motion.li
                  key={row.id || row.clientKey || `new-${index}`}
                  layout={!reducedMotion}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={cn(
                    "inline-flex items-center rounded-full border bg-card shadow-sm transition-colors",
                    open ? "border-primary bg-accent" : "border-border hover:border-primary/40",
                    invalid && "border-destructive bg-destructive/5",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls="candidate-skill-editor"
                    onClick={() => setSelected(open ? null : index)}
                    className={cn("inline-flex min-h-10 items-center gap-2 rounded-full py-1.5 pl-3.5 text-sm font-medium", row.id ? "pr-3.5" : "pr-1.5")}
                  >
                    {open && <Check size={14} className="text-primary" aria-hidden="true" />}
                    <span className={cn(!row.name?.trim() && "text-muted-foreground italic")}>{name}</span>
                    {row.version && <span className="text-muted-foreground text-xs">{row.version}</span>}
                    {row.total_years_total_months && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">{row.total_years_total_months}</span>
                    )}
                  </button>
                  {!row.id && (
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => remove(index)}
                      className="mr-1 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </Motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <Sparkles size={22} className="mx-auto mb-2 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium">No skills yet</p>
          <p className="text-muted-foreground mt-1 text-xs">Add skills above, or continue.</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {openRow && (
          <Motion.div
            key={openRow.id || openRow.clientKey || openIndex}
            id="candidate-skill-editor"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-5 rounded-xl border border-border bg-background/60 p-4 sm:p-5">
              <div className="grid gap-5 sm:grid-cols-3">
                {detailFields.map(({ key, label, required, placeholder }) => {
                  const id = `candidate-skills-${openIndex}-${key}`;
                  const invalid = entryError?.index === openIndex && entryError.field === key;
                  const FieldIcon = fieldIcons[key] || Sparkles;
                  return (
                    <div key={key}>
                      <label htmlFor={id} className={styles.label}>
                        {label}{" "}
                        {required ? <span className="text-primary">*</span> : <span className="text-muted-foreground text-xs font-normal">(optional)</span>}
                      </label>
                      <div className={styles.inputIcon}>
                        <FieldIcon size={18} aria-hidden="true" />
                        <input
                          id={id}
                          required={required}
                          value={openRow[key] || ""}
                          placeholder={placeholder}
                          className={styles.input}
                          aria-invalid={invalid}
                          aria-describedby={invalid ? `${id}-error` : undefined}
                          onChange={(event) => onUpdate(openIndex, key, event.target.value)}
                        />
                      </div>
                      {invalid && <p id={`${id}-error`} className="mt-2 text-xs leading-5 text-destructive">{entryError.message}</p>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                {!openRow.id ? (
                  <button
                    type="button"
                    onClick={() => remove(openIndex)}
                    className="text-muted-foreground flex min-h-11 items-center gap-2 rounded-lg text-sm hover:text-destructive"
                  >
                    <Trash2 size={15} aria-hidden="true" /> Remove skill
                  </button>
                ) : <span />}
                <button type="button" onClick={() => setSelected(null)} className={cn(styles.secondary, "min-h-10 bg-card px-4 py-2")}>
                  <Check size={15} aria-hidden="true" /> Done
                </button>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
