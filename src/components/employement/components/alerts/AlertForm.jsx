import { createElement, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, Check, Loader2, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import TinyEditor from "../../../TinyEditor";
import { createSystemAlert, updateSystemAlert } from "../../api/systemAlerts.api";
import { useAlertTargets } from "../../queries/systemAlerts.queries";
import { useEmployeesDirectory } from "../home/homeDashboard.queries";
import { dateKey } from "../attendance/adminAttendanceUtils";
import AlertHtml from "./AlertHtml";
import { sanitizeAlertHtml, typeMeta } from "./alertUi";
import {
  RESPONSE_TYPES,
  RESPONSE_TYPE_KEYS,
  alertFormFromRecord,
  answerButtonLabel,
  emptyAlertForm,
  employeeOptions,
  formatExpiry,
  localExpiry,
  validateAlertForm,
} from "./systemAlertUtils";

const RESPONSE_HELP = {
  none: "Read and close. Never holds up clock-out.",
  acknowledge: "One “I have read this” button. Clock-out waits for it.",
  yes_no: "Yes and No buttons. Clock-out waits for an answer.",
};
const inputClass = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const fieldError = "mt-2 text-xs font-medium text-destructive";

function Step({ number, title, help, children }) {
  return (
    <section className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{number}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {help && <p className="mt-0.5 text-sm text-muted-foreground">{help}</p>}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Choice({ name, value, checked, onChange, title, description, children }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition focus-within:ring-2 focus-within:ring-ring",
        checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", checked ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
          {checked && <Check size={12} strokeWidth={3} aria-hidden="true" />}
        </span>
      </span>
      <span className="text-xs leading-5 text-muted-foreground">{description}</span>
      {children}
    </label>
  );
}

function EmployeePicker({ options, selected, onChange, loading, error }) {
  const [search, setSearch] = useState("");
  const chosen = useMemo(() => new Set(selected), [selected]);
  const byId = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const term = search.trim().toLowerCase();
  const shown = options.filter((option) => !term || option.name.toLowerCase().includes(term) || option.email.includes(term));
  const toggle = (id) => onChange(chosen.has(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 p-2.5">
        <label className="flex min-w-44 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search size={15} className="text-muted-foreground" aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search employees" className="w-full bg-transparent py-2 text-sm outline-none" />
        </label>
        <button type="button" onClick={() => onChange([...new Set([...selected, ...shown.map((option) => option.id)])])} disabled={!shown.length} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50">
          Select {term ? "matches" : "all"}
        </button>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Clear</button>
        )}
      </div>
      {selected.length > 0 && (
        <ul aria-label="Selected employees" className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto border-b border-border p-2.5">
          {selected.map((id) => (
            <li key={id}>
              <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${byId.get(id)?.name || "employee"}`} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary hover:bg-primary/15">
                {byId.get(id)?.name || "Former employee"} <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="max-h-56 overflow-y-auto p-1.5">
        {loading ? (
          <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> Loading employees…</p>
        ) : error ? (
          <p role="alert" className="p-3 text-sm text-destructive">Could not load employees. Refresh the page to try again.</p>
        ) : shown.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No one matches “{search}”.</p>
        ) : shown.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted">
            <input type="checkbox" checked={chosen.has(option.id)} onChange={() => toggle(option.id)} className="size-4 accent-[var(--primary)]" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{option.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{option.email || "No email"}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="flex items-center gap-1.5 border-t border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        <Users size={13} aria-hidden="true" /> {selected.length} of {options.length} selected
      </p>
    </div>
  );
}

// A small copy of the employee popup, so HR sees the result while writing.
function EmployeePreview({ values, html }) {
  const meta = typeMeta(values.responseType);
  const answers = RESPONSE_TYPES[values.responseType]?.answers || [];
  const ordered = answers.includes("yes") ? [...answers.filter((answer) => answer !== "yes"), "yes"] : answers;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <p className="border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What employees see</p>
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          {createElement(meta.icon, { size: 17, "aria-hidden": true })}
        </span>
        <div className="min-w-0">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">{meta.chip}</span>
          <p className={cn("mt-1 break-words text-sm font-semibold", values.name.trim() ? "text-foreground" : "text-muted-foreground")}>
            {values.name.trim() || "Your title appears here"}
          </p>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto p-4">
        <AlertHtml description={html} title="Message preview" emptyText="Your message appears here." />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/40 p-3" aria-hidden="true">
        {values.responseType !== "none" && <span className="px-2 text-xs font-semibold text-muted-foreground">Remind me later</span>}
        {ordered.map((answer, index) => (
          <span key={answer} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", index === ordered.length - 1 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground")}>
            {answerButtonLabel(answer)}
          </span>
        ))}
      </div>
    </div>
  );
}

function AlertFormFields({ alert, initial, initialTargets, responseCount, onSaved, onCancel }) {
  const editing = Boolean(alert);
  const today = dateKey(new Date());
  const [values, setValues] = useState(initial);
  const [mode, setMode] = useState("editor");
  const [submitted, setSubmitted] = useState(false);
  const employees = useEmployeesDirectory();
  const options = useMemo(() => employeeOptions(employees.data || []), [employees.data]);
  const queryClient = useQueryClient();
  const set = (patch) => setValues((current) => ({ ...current, ...patch }));
  const html = sanitizeAlertHtml(values.description);
  const errors = validateAlertForm({ ...values, description: html });
  const typeChanged = editing && responseCount > 0 && values.responseType !== initial.responseType;
  const show = (key) => submitted && errors[key];

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...values, description: html };
      return editing
        ? updateSystemAlert({ id: alert.id, values: payload, currentTargetIds: initialTargets })
        : createSystemAlert(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      toast.success(editing ? "Alert saved." : values.active ? "Alert sent." : "Alert saved as inactive.");
      onSaved();
    },
    // A partly saved alert (for example some links failed) still has to show up in the list.
    onError: () => void queryClient.invalidateQueries({ queryKey: ["system-alerts"] }),
  });

  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length === 0) mutation.mutate();
  };

  const summary = [
    ["Sent to", values.audience === "selected" ? `${values.employeeIds.length} selected employee${values.employeeIds.length === 1 ? "" : "s"}` : "All employees"],
    ["Response", RESPONSE_TYPES[values.responseType]?.label],
    ["Clock-out", RESPONSE_TYPES[values.responseType]?.blocksLogout ? "Waits for an answer" : "Not affected"],
    ["Shows", !values.active ? "Hidden (inactive)" : values.expiresOn ? `Until ${formatExpiry(localExpiry(values.expiresOn, values.expiresTime))}` : "Until you turn it off"],
  ];

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <fieldset disabled={mutation.isPending} className="min-w-0 divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
        <Step number={1} title="Message" help="A short title and the full message.">
          <label htmlFor="alert-name" className="text-sm font-medium text-foreground">Title</label>
          <input
            id="alert-name"
            value={values.name}
            onChange={(event) => set({ name: event.target.value })}
            placeholder="e.g. Submit your updated PAN details"
            aria-invalid={Boolean(show("name"))}
            className={cn(inputClass, "mt-1.5")}
          />
          {show("name") && <p className={fieldError}>{errors.name}</p>}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Message</span>
            <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Message editor">
              {[["editor", "Write"], ["html", "Paste HTML"]].map(([item, text]) => (
                <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)} className={cn("rounded-md px-3 py-1 text-xs font-semibold", mode === item ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {text}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2">
            {mode === "editor" ? (
              <TinyEditor height={360} minHeight={300} editorContent={values.description} setEditorContent={(description) => set({ description })} />
            ) : (
              <textarea
                aria-label="Message HTML"
                value={values.description}
                onChange={(event) => set({ description: event.target.value })}
                placeholder="Paste an HTML template here…"
                className="min-h-[300px] w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm"
              />
            )}
          </div>
          {show("description") && <p className={fieldError}>{errors.description}</p>}
        </Step>

        <Step number={2} title="Who gets it">
          <div role="radiogroup" aria-label="Who gets it" className="grid gap-3 sm:grid-cols-2">
            <Choice name="audience" value="all" checked={values.audience === "all"} onChange={(audience) => set({ audience })} title="All employees" description="Everyone who can receive alerts." />
            <Choice name="audience" value="selected" checked={values.audience === "selected"} onChange={(audience) => set({ audience })} title="Selected employees" description="Only the people you pick." />
          </div>
          {values.audience === "selected" && (
            <>
              <EmployeePicker options={options} selected={values.employeeIds} onChange={(employeeIds) => set({ employeeIds })} loading={employees.isPending} error={employees.isError} />
              {show("employees") && <p className={fieldError}>{errors.employees}</p>}
            </>
          )}
        </Step>

        <Step number={3} title="How employees respond">
          <div role="radiogroup" aria-label="How employees respond" className="grid gap-3 md:grid-cols-3">
            {RESPONSE_TYPE_KEYS.map((type) => (
              <Choice key={type} name="response-type" value={type} checked={values.responseType === type} onChange={(responseType) => set({ responseType })} title={RESPONSE_TYPES[type].label} description={RESPONSE_HELP[type]} />
            ))}
          </div>
          {typeChanged && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--attendance-late)]/40 bg-[var(--attendance-late)]/10 p-3 text-sm text-foreground">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--attendance-late)]" aria-hidden="true" />
              {responseCount} employee{responseCount === 1 ? " has" : "s have"} already answered. They keep their old answers.
            </p>
          )}
        </Step>

        <Step number={4} title="When it shows">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <span id="alert-active-label" className="text-sm font-medium text-foreground">Active</span>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={values.active}
                  aria-labelledby="alert-active-label"
                  onClick={() => set({ active: !values.active })}
                  className={cn("relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", values.active ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", values.active ? "left-[22px]" : "left-0.5")} />
                </button>
                <span className="text-sm text-muted-foreground">{values.active ? "Employees can see it" : "Hidden from employees"}</span>
              </div>
            </div>
            <fieldset className="min-w-0">
              <legend className="text-sm font-medium text-foreground">Stop showing on <span className="font-normal text-muted-foreground">(optional)</span></legend>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  aria-label="Expiry date"
                  min={today}
                  value={values.expiresOn}
                  onChange={(event) => set({ expiresOn: event.target.value })}
                  aria-invalid={Boolean(show("expiresOn"))}
                  className={cn(inputClass, "min-w-36 flex-1")}
                />
                <input
                  type="time"
                  aria-label="Expiry time"
                  value={values.expiresTime}
                  onChange={(event) => set({ expiresTime: event.target.value })}
                  aria-invalid={Boolean(show("expiresOn"))}
                  className={cn(inputClass, "w-32")}
                />
                {(values.expiresOn || values.expiresTime) && (
                  <button type="button" onClick={() => set({ expiresOn: "", expiresTime: "" })} className="rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">Clear</button>
                )}
              </div>
              {show("expiresOn")
                ? <p className={fieldError}>{errors.expiresOn}</p>
                : <p className="mt-1.5 text-xs text-muted-foreground">{values.expiresOn && !values.expiresTime ? "No time set: it shows until the end of that day." : "Set a time to end it partway through a day, even today."}</p>}
            </fieldset>
          </div>
        </Step>
      </fieldset>

      <aside className="min-w-0 space-y-4 xl:sticky xl:top-4">
        <EmployeePreview values={values} html={html} />
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <dl className="space-y-2 text-sm">
            {summary.map(([term, detail]) => (
              <div key={term} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="text-right font-medium text-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
          {submitted && Object.keys(errors).length > 0 && (
            <p role="alert" className="mt-3 text-xs font-medium text-destructive">Fix the highlighted fields to continue.</p>
          )}
          {mutation.isError && (
            <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{mutation.error?.message || "Could not save the alert."}</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <button type="submit" disabled={mutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">
              {mutation.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {editing ? "Save changes" : values.active ? "Send alert" : "Save as inactive"}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} disabled={mutation.isPending} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50">
                Cancel
              </button>
            )}
          </div>
        </div>
      </aside>
    </form>
  );
}

/** HR create / edit form. Editing first loads who the alert is linked to. */
export default function AlertForm({ alert = null, responseCount = 0, onSaved, onCancel }) {
  const targets = useAlertTargets(alert?.id, { enabled: Boolean(alert) });
  if (alert && targets.isPending) {
    return <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading the alert…</p>;
  }
  if (alert && targets.isError) {
    return (
      <div role="alert" className="rounded-2xl border border-destructive/30 p-5 text-sm text-destructive">
        Could not load who this alert is sent to.{" "}
        <button type="button" onClick={() => targets.refetch()} className="font-semibold underline">Try again</button>
      </div>
    );
  }
  const initialTargets = targets.data || [];
  return (
    <AlertFormFields
      alert={alert}
      initial={alert ? alertFormFromRecord(alert, initialTargets) : emptyAlertForm()}
      initialTargets={initialTargets}
      responseCount={responseCount}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}
