import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { useSelector } from "react-redux";
import { createJobPosting } from "./jobsApi";

const sections = [
  ["Role details", ["name", "job_title", "job_code", "department", "employment_type", "job_type", "number_of_positions", "job_status"]],
  ["Description & requirements", ["job_description", "job_responsibilities", "required_skills", "preferred_skills", "qualifications", "education_required", "required_certifications", "required_languages", "other_requirements"]],
  ["Location & experience", ["location", "city", "state", "country", "work_mode", "minimum_experience", "maximum_experience", "notice_period"]],
  ["Compensation", ["minimum_salary", "maximum_salary", "salary_currency", "benefits"]],
  ["Application details", ["opening_date", "closing_date", "job_posting_url", "application_email", "application_instructions"]],
];
const longFields = new Set(["job_description", "job_responsibilities", "required_skills", "preferred_skills", "qualifications", "required_certifications", "required_languages", "other_requirements", "benefits", "application_instructions"]);
const numericFields = new Set(["number_of_positions", "minimum_experience", "maximum_experience", "minimum_salary", "maximum_salary"]);
const labelOf = key => key.replaceAll("_", " ").replace(/^./, char => char.toUpperCase());

export default function CreateJobDialog({ dropdowns, jobs, onClose, onCreated }) {
  const isAdmin = useSelector(state => state.user.userInfo?.status === "admin");
  const [draft, setDraft] = useState({ number_of_positions: "1", job_status: "open", salary_negotiable: "0" });
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  function change(key, value) { setDraft(previous => ({ ...previous, [key]: value })); setDirty(true); }
  function close() { if (!locked.current) { if (dirty) setConfirmClose(true); else onClose(); } }
  async function submit(event) {
    event.preventDefault();
    if (locked.current || !isAdmin) return;
    const data = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value !== ""));
    if (!data.name || !data.job_title || !data.job_description) { setError("Enter a posting name, job title, and description."); return; }
    for (const [min, max, label] of [["minimum_salary", "maximum_salary", "Salary"], ["minimum_experience", "maximum_experience", "Experience"]]) {
      if (data[min] !== undefined && data[max] !== undefined && Number(data[min]) > Number(data[max])) { setError(`${label}: maximum must be at least the minimum.`); return; }
    }
    if (data.opening_date && data.closing_date && data.closing_date < data.opening_date) { setError("Closing date must be on or after the opening date."); return; }
    locked.current = true; setBusy(true); setError("");
    try { await createJobPosting({ ...data, description: data.job_description }); }
    catch (err) { setError(err.message); locked.current = false; setBusy(false); return; }
    locked.current = false; setBusy(false); onCreated();
  }
  return <Dialog.Root open={isAdmin} onOpenChange={open => { if (!open) close(); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
    <Dialog.Content onInteractOutside={event => event.preventDefault()} className="fixed inset-y-0 right-0 z-999 flex w-full max-w-3xl flex-col bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b p-6"><div><Dialog.Title className="text-xl font-semibold text-slate-900">Create job posting</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Define the role, requirements, and application details.</Dialog.Description></div><button disabled={busy} onClick={close} aria-label="Close create job posting" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></header>
      {confirmClose && <div role="alert" className="bg-amber-50 p-4 text-sm text-amber-900">Discard your unsaved job posting?<div className="mt-2 flex gap-4"><button onClick={() => setConfirmClose(false)} className="underline">Keep editing</button><button onClick={onClose} className="underline">Discard and close</button></div></div>}
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><div className="flex-1 overflow-y-auto p-6">
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <fieldset disabled={busy} className="space-y-7">{sections.map(([title, fields]) => <section key={title}><h3 className="border-b pb-3 font-semibold text-slate-900">{title}</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{fields.map(key => {
          const required = ["name", "job_title", "job_description"].includes(key);
          const options = dropdowns[key];
          const entries = options && !Array.isArray(options) && typeof options === "object" ? Object.entries(options) : [];
          const suggestions = [...new Set(jobs.map(job => job[key]).filter(value => typeof value === "string" && value))];
          const props = { id: `new-job-${key}`, value: draft[key] || "", required, onChange: event => change(key, event.target.value), className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:opacity-60" };
          return <div key={key} className={longFields.has(key) ? "sm:col-span-2" : ""}><label htmlFor={props.id} className="text-sm font-medium text-slate-600">{labelOf(key)}{required ? " *" : ""}</label>{longFields.has(key) ? <textarea {...props} rows={4} /> : entries.length ? <select {...props}><option value="">Select {labelOf(key).toLowerCase()}</option>{draft[key] && !Object.hasOwn(options, draft[key]) && <option value={draft[key]}>{draft[key]}</option>}{entries.map(([value, label]) => <option key={value} value={value}>{String(label)}</option>)}</select> : <><input {...props} type={numericFields.has(key) ? "number" : key.endsWith("_date") ? "date" : key.endsWith("_email") ? "email" : key.endsWith("_url") ? "url" : "text"} min={key === "number_of_positions" ? 1 : numericFields.has(key) ? 0 : undefined} step={key === "number_of_positions" ? 1 : numericFields.has(key) ? "any" : undefined} list={Object.hasOwn(dropdowns, key) ? `${props.id}-options` : undefined} />{Object.hasOwn(dropdowns, key) && <datalist id={`${props.id}-options`}>{suggestions.map(value => <option key={value} value={value} />)}</datalist>}</>}</div>;
        })}</div></section>)}<label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.salary_negotiable === "1"} onChange={event => change("salary_negotiable", event.target.checked ? "1" : "0")} />Salary negotiable</label></fieldset>
      </div><footer className="flex justify-end gap-3 border-t p-5"><button type="button" disabled={busy} onClick={close} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button><button disabled={busy || !isAdmin} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}{busy ? "Creating…" : "Create job posting"}</button></footer></form>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
