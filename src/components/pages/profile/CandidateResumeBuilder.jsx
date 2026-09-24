import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, ChevronDown, Loader2, Mail } from "lucide-react";
import { createCandidateRelated, fetchCandidateRelated, findCandidate, normalizeCandidate, saveCandidate, saveCandidateRelated } from "./candidateApi";
import CandidatePhotoUpload from "./CandidatePhotoUpload";
import { rememberOnboardingStarted } from "./onboardingState";

const steps = ["Personal info", "Skills", "Experience", "Photograph"];
const fields = { skills: { name: "Skill", version: "Version (optional)", total_years_total_months: "Experience with this skill" }, experiences: { name: "Role / job title", company_name: "Company", company_location: "Location", joining_date: "Start date", leaving_date: "End date (leave blank if current)", description: "Responsibilities and achievements" } };
const personalFields = { first_name: "First name", last_name: "Last name", phone_mobile: "Phone number", current_designation: "Professional title", primary_address_city: "City", primary_address_country: "Country", linkedin_url: "LinkedIn URL", description: "About you" };
const titles = ["Let’s start with the essentials.", "Your strengths, at a glance.", "Make your experience count.", "One last personal touch."];
const hints = ["Check your name and contact details, then continue to skills.", "Review each skill. Open an entry only if you want to change it.", "Check your roles and dates. No work experience yet? You can continue.", "Add a photograph, or finish now and add one to your profile later."];
const inputClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export default function CandidateResumeBuilder({ email, candidate, onBack, onComplete }) {
  const [record, setRecord] = useState(candidate);
  const [draft, setDraft] = useState(() => normalizeCandidate(candidate || {}, email));
  const [step, setStep] = useState(0);
  const [items, setItems] = useState({ skills: [], experiences: [] });
  const originals = useRef({});
  const loaded = useRef({});
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.closest("section")?.scrollIntoView({ block: "start", behavior: "instant" }); }, [step]);
  const section = step === 1 ? "skills" : "experiences";
  const loadStep = async (next, id) => {
    const key = next === 1 ? "skills" : next === 2 ? "experiences" : null;
    if (key && !loaded.current[key]) {
      const rows = await fetchCandidateRelated(id, key);
      rows.forEach(row => { originals.current[row.id] = { ...row }; });
      setItems(prev => ({ ...prev, [key]: rows }));
      loaded.current[key] = true;
    }
    setStep(next);
  };
  const saveStep = async (event) => {
    event.preventDefault();
    if (lock.current || photoBusy) return;
    lock.current = true; setBusy(true); setError("");
    try {
      let current = record;
      if (step === 0 || step === 3) {
        if (!draft.last_name.trim()) throw new Error("Please enter your last name.");
        current ||= await findCandidate(email);
        const saved = await saveCandidate(current?.id, draft, email);
        current = { ...current, ...saved };
        if (!current.id) current = await findCandidate(email);
        if (!current?.id) throw new Error("Could not confirm your saved profile. Please retry.");
        setRecord(current);
        rememberOnboardingStarted(current);
      } else {
        for (let index = 0; index < items[section].length; index++) {
          const row = items[section][index];
          if (!row.name?.trim()) throw new Error("Please enter a name for each entry or remove the empty entry.");
          if (section === "experiences" && row.leaving_date && row.joining_date && row.leaving_date < row.joining_date) throw new Error("End date must be on or after the start date.");
          if (row.id) await saveCandidateRelated(section, row, originals.current[row.id]);
          const saved = row.id ? row : await createCandidateRelated(section, current.id, row);
          originals.current[saved.id] = { ...saved };
          setItems(prev => ({ ...prev, [section]: prev[section].map((value, i) => i === index ? saved : value) }));
        }
      }
      if (step === 3) onComplete(current);
      else await loadStep(step + 1, current.id);
    } catch (err) { setError(err.message || "Could not save this step. Please retry."); }
    finally { lock.current = false; setBusy(false); }
  };
  const personalInput = key => <label key={key} className={key === "description" ? "block text-xs font-medium text-slate-600 sm:col-span-2" : "block text-xs font-medium text-slate-600"}>
    {personalFields[key]}{key === "last_name" && <span className="text-violet-500"> *</span>}
    {key === "description" ? <textarea rows={3} value={draft[key] || ""} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))} className={inputClass} /> : <input required={key === "last_name"} type={key === "phone_mobile" ? "tel" : "text"} value={draft[key] || ""} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))} className={inputClass} />}
  </label>;
  return <section className="mx-auto max-w-[760px] pb-6 pt-5 sm:pt-8">
    <div className="mb-5 flex items-center justify-between"><button disabled={busy || photoBusy} onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-700"><ArrowLeft size={14} /> All options</button><span className="text-xs font-medium text-violet-600">Step {step + 1} of 4</span></div>
    <ol aria-label="Profile setup steps" className="mb-6 grid grid-cols-4 gap-2">{steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}><div className={index <= step ? "mb-2 h-1 rounded-full bg-violet-500" : "mb-2 h-1 rounded-full bg-slate-200"} /><span className={step === index ? "flex items-center gap-1 text-[10px] font-semibold text-violet-700 sm:text-xs" : "flex items-center gap-1 text-[10px] text-slate-400 sm:text-xs"}>{index < step && <Check size={12} />}{label}</span></li>)}</ol>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_45px_-25px_#7c3aed22]">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-7"><h2 ref={heading} tabIndex={-1} className="scroll-mt-6 text-xl font-semibold tracking-tight text-slate-900 outline-none sm:text-2xl">{titles[step]}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{hints[step]}</p></div>
      <div className="px-5 py-5 sm:px-7">
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {step === 3 && <CandidatePhotoUpload initialEmail={email} lockedEmail disabled={busy} onBusyChange={setPhotoBusy} onUploaded={url => setDraft(prev => ({ ...prev, profile_image: url }))} />}
        <form id="candidate-step-form" onSubmit={saveStep} onInvalid={event => { const disclosure = event.target.closest("details"); if (disclosure) disclosure.open = true; }}>
          <fieldset disabled={busy || photoBusy}>
            {step === 0 && <><div className="mb-5 flex items-center gap-2 rounded-lg bg-violet-50/60 px-3 py-2.5 text-xs text-slate-600"><Mail size={14} className="shrink-0 text-violet-400" /><span className="break-all">{email}</span><span className="ml-auto shrink-0 text-[10px] text-violet-500">Your account</span></div><div className="grid gap-4 sm:grid-cols-2">{["first_name", "last_name", "phone_mobile", "current_designation"].map(personalInput)}</div><details className="group mt-5 border-t border-slate-100 pt-4"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-slate-500 [&::-webkit-details-marker]:hidden">Location & introduction <span className="flex items-center gap-2 text-[10px] font-normal text-slate-400">Optional<ChevronDown size={14} className="transition group-open:rotate-180" /></span></summary><div className="mt-4 grid gap-4 sm:grid-cols-2">{["primary_address_city", "primary_address_country", "linkedin_url", "description"].map(personalInput)}</div></details></>}
            {(step === 1 || step === 2) && <div className="space-y-3">{!items[section].length && <div className="rounded-xl bg-slate-50 px-5 py-7 text-center"><p className="text-sm font-medium text-slate-700">{step === 1 ? "Add a skill you’re proud of." : "Every career starts somewhere."}</p><p className="mt-2 text-xs text-slate-400">Add an entry below, or continue to the next step.</p></div>}{items[section].map((row, index) => <details key={row.id || index} open={!row.id || undefined} className="group rounded-xl border border-slate-200 open:border-violet-200"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-[10px] font-semibold text-violet-500">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-700">{row.name || (step === 1 ? "New skill" : "New experience")}</span>{step === 2 && <span className="mt-0.5 block truncate text-[11px] text-slate-400">{row.company_name || "Add company details"}</span>}</span><span className="text-[10px] text-slate-400">Review</span><ChevronDown size={14} className="text-slate-400 transition group-open:rotate-180" /></summary><div className="border-t border-slate-100 p-4"><div className="grid gap-3 sm:grid-cols-2">{Object.entries(fields[section]).map(([key, label]) => <label key={key} className="text-xs font-medium text-slate-600">{label}{key === "name" ? " *" : ""}<input className={inputClass} required={key === "name"} type={key.endsWith("_date") ? "date" : "text"} value={row[key] || ""} onChange={event => setItems(prev => ({ ...prev, [section]: prev[section].map((item, i) => i === index ? { ...item, [key]: event.target.value } : item) }))} /></label>)}</div>{!row.id && <button type="button" className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500" onClick={() => setItems(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }))}><Trash2 size={12} />Remove entry</button>}</div></details>)}<button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-200 px-4 py-3 text-xs font-medium text-violet-600 hover:bg-violet-50" onClick={() => setItems(prev => ({ ...prev, [section]: [...prev[section], { name: "" }] }))}><Plus size={14} />Add {step === 1 ? "skill" : "experience"}</button></div>}
          </fieldset>
        </form>
      </div>
    </div>
    <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm sm:px-4"><button type="button" disabled={!step || busy || photoBusy} onClick={() => { setError(""); setStep(step - 1); }} className="px-2 py-2 text-xs text-slate-500 disabled:opacity-30">Back</button><div className="flex items-center gap-3"><span className="hidden text-[10px] text-slate-400 sm:block">{step === 3 ? "Ready when you are" : "This step saves when you continue"}</span><button type="submit" form="candidate-step-form" disabled={busy || photoBusy} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">{busy ? <><Loader2 size={14} className="animate-spin motion-reduce:animate-none" />Saving...</> : <>{step === 3 ? "Save & open my profile" : `Continue to ${steps[step + 1].toLowerCase()}`}<ArrowRight size={14} /></>}</button></div></div>
  </section>;
}
