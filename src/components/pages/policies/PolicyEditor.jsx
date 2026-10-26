import { useId, useState } from "react";
import { Loader2, Save } from "lucide-react";
import TinyEditor from "../../TinyEditor";

const fieldClass = "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const today = () => new Date().toISOString().slice(0, 10);

/** Inline create/edit form for one policy. `policy` is null for a new one. */
export default function PolicyEditor({ policy, categories = [], saving, error, onSave, onCancel }) {
  const ids = { name: useId(), category: useId(), summary: useId(), version: useId(), date: useId(), status: useId(), categories: useId() };
  const [values, setValues] = useState(() => ({
    id: policy?.id || "",
    name: policy?.name || "",
    category: policy?.category || "",
    summary: policy?.summary || "",
    description: policy?.description || "",
    version: policy?.version || "1.0",
    effective_date: policy?.effective_date || today(),
    status: policy?.status || "draft",
  }));
  const set = (changes) => setValues((current) => ({ ...current, ...changes }));

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); onSave(values); }}
      className="rounded-2xl border border-border bg-card shadow-sm"
      aria-label={policy ? `Edit ${policy.name}` : "New policy"}
    >
      <header className="border-b border-border p-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{policy ? "Edit policy" : "New policy"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Employees see a policy once it is published. Raise the version when you change what it says.</p>
      </header>

      <fieldset disabled={saving} className="space-y-4 p-5 sm:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          <label htmlFor={ids.name} className="text-sm font-semibold text-foreground md:col-span-2">
            Title
            <input id={ids.name} required value={values.name} onChange={(event) => set({ name: event.target.value })} placeholder="e.g. Leave policy" className={fieldClass} />
          </label>
          <label htmlFor={ids.category} className="text-sm font-semibold text-foreground">
            Category
            <input id={ids.category} list={ids.categories} value={values.category} onChange={(event) => set({ category: event.target.value })} placeholder="e.g. Time & leave" className={fieldClass} />
            <datalist id={ids.categories}>{categories.map((category) => <option key={category} value={category} />)}</datalist>
          </label>
          <label htmlFor={ids.status} className="text-sm font-semibold text-foreground">
            Status
            <select id={ids.status} value={values.status} onChange={(event) => set({ status: event.target.value })} className={fieldClass}>
              <option value="draft">Draft (only admins see it)</option>
              <option value="published">Published (everyone sees it)</option>
            </select>
          </label>
          <label htmlFor={ids.version} className="text-sm font-semibold text-foreground">
            Version
            <input id={ids.version} value={values.version} onChange={(event) => set({ version: event.target.value })} className={fieldClass} />
          </label>
          <label htmlFor={ids.date} className="text-sm font-semibold text-foreground">
            Effective from
            <input id={ids.date} type="date" value={values.effective_date} onChange={(event) => set({ effective_date: event.target.value })} className={fieldClass} />
          </label>
          <label htmlFor={ids.summary} className="text-sm font-semibold text-foreground md:col-span-2">
            Summary <span className="font-normal text-muted-foreground">(one or two sentences shown under the title)</span>
            <textarea id={ids.summary} rows={2} value={values.summary} onChange={(event) => set({ summary: event.target.value })} className={`${fieldClass} resize-y`} />
          </label>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Policy text</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Use Heading 2 for each section; they become the &ldquo;On this page&rdquo; links.</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            <TinyEditor height={460} minHeight={320} editorContent={values.description} setEditorContent={(description) => set({ description })} />
          </div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </fieldset>

      <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:px-8">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {policy ? "Save changes" : "Create policy"}
        </button>
      </footer>
    </form>
  );
}
