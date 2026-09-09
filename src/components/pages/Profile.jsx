import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, FileText, Loader2, MapPin, Pencil, Save, Upload, UserRound } from "lucide-react";
import { FETCH_GPC_X_API_KEY } from "../../store/constants";
import CandidatePhotoUpload from "./profile/CandidatePhotoUpload";
import { candidateFields, findCandidate, normalizeCandidate, saveCandidate } from "./profile/candidateApi";

const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50";
const secondaryButton = "rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export default function Profile() {
  const email = useSelector(state => state.user.user?.email)?.trim() || "";
  return <CandidateProfile key={email} email={email} />;
}

function CandidateProfile({ email }) {
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState(null);
  const [retry, setRetry] = useState(0);
  const requestRef = useRef(null);
  const alive = useRef(true);
  const saveLock = useRef(false);

  useEffect(() => {
    let active = true;
    alive.current = true;
    setPhase("loading");
    setError("");
    findCandidate(email).then(candidate => {
      if (!active) return;
      setRecord(candidate);
      setDraft(candidate ? normalizeCandidate(candidate, email) : null);
      setPhase(candidate ? "view" : "upload");
    }).catch(err => { if (active) { setError(err.message); setPhase("error"); } });
    return () => { active = false; alive.current = false; requestRef.current?.abort(); };
  }, [email, retry]);

  const parseResume = async event => {
    event.preventDefault();
    if (!file || requestRef.current) return;
    setError("");
    setBusy(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      if (!FETCH_GPC_X_API_KEY) throw new Error("Resume upload is not configured. Please contact your administrator.");
      const body = new FormData();
      body.append("file", file, file.name);
      body.append("email", email);
      const response = await fetch("https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=resume_parsing", { method: "POST", headers: { "x-api-key": FETCH_GPC_X_API_KEY }, body, signal: controller.signal });
      const json = await response.json();
      if (!response.ok || json?.success !== true) throw new Error(json?.message || "Unable to parse this resume. Please try another file.");
      const candidate = json.content?.candidate;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("No candidate details were returned. Please try another resume.");
      if (!alive.current) return;
      const parsed = normalizeCandidate(candidate, email);
      // Preserve extracted history in the candidate description; these are not candidate-module fields.
      const history = ["experiences", "education", "skills"].flatMap(key => {
        const items = json.content[key];
        if (!Array.isArray(items) || !items.length) return [];
        return [`${key.toUpperCase()}\n${items.map(item => typeof item === "object" && item ? Object.entries(item).filter(([, value]) => value !== null && value !== "").map(([label, value]) => `${label.replaceAll("_", " ")}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join(" � ") : String(item)).join("\n")}`];
      });
      parsed.description = [parsed.description, ...history].filter(Boolean).join("\n\n");
      // Only the image upload endpoint supplies the profile photo.
      parsed.portfolio_url = "";
      setDraft(parsed);
      setPhase("edit");
      setNotice("Resume parsed. Review and edit your details, then save your profile.");
    } catch (err) {
      if (alive.current) setError(err.name === "AbortError" ? "Resume parsing timed out. Please try again." : err.message);
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      if (alive.current) setBusy(false);
    }
  };

  const save = async event => {
    event.preventDefault();
    if (saveLock.current || photoBusy) return;
    saveLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      // Recheck before creating, including after an uncertain previous save response.
      const existing = record || await findCandidate(email);
      const saved = await saveCandidate(existing?.id, { ...draft, candidate_source: existing?.candidate_source }, email);
      if (!alive.current) return;
      if (!saved.id) {
        const confirmed = await findCandidate(email);
        if (!confirmed) throw new Error("Save was accepted, but the profile could not be confirmed. Retry saving to check again.");
        saved.id = confirmed.id;
      }
      setRecord({ ...existing, ...saved });
      setDraft(normalizeCandidate(saved, email));
      setPhase("view");
      setNotice("Your candidate profile has been saved.");
    } catch (err) { if (alive.current) setError(err.message || "Unable to save your profile."); }
    finally { saveLock.current = false; if (alive.current) setBusy(false); }
  };

  const name = [draft?.first_name, draft?.last_name].filter(Boolean).join(" ") || "Your next chapter starts here";
  const completed = draft ? ["first_name", "last_name", "email1", "phone_mobile", "current_designation", "primary_address_city", "description", "portfolio_url"].filter(key => draft[key]).length : 0;
  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-b
          from-sidebar-primary
          from-0%
          via-sidebar-primary
          via-2%
          to-sidebar-secondary
          to-100%
          text-[var(--sidebar-primary-foreground)]
          shadow-2xl p-6 text-white shadow-lg sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Your career / Your story</p>
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
          {draft?.portfolio_url ? <img src={draft.portfolio_url} alt="Candidate profile" className="h-full w-full object-cover" /> : <UserRound size={42} className="text-indigo-200" />}
        </div>
        <div className="min-w-0 flex-1"><h1 className="break-words text-3xl font-semibold tracking-tight">{name}</h1><p className="mt-2 text-indigo-100">{draft?.current_designation || "Build a profile that opens doors."}</p><p className="mt-2 break-all text-sm text-indigo-200">{email}</p>
          {draft?.primary_address_city && <p className="mt-2 flex items-center gap-1 text-sm text-indigo-200"><MapPin size={14} />{[draft.primary_address_city, draft.primary_address_country].filter(Boolean).join(", ")}</p>}
        </div>
        {phase === "view" && <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-950" onClick={() => { setPhase("edit"); setNotice(""); }}><Pencil size={16} />Edit profile</button>}
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}{phase === "error" && <button onClick={() => setRetry(value => value + 1)} className="ml-4 font-semibold underline">Retry lookup</button>}</div>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} />{notice}</p>}
    {phase === "loading" && <div role="status" className="flex items-center justify-center gap-3 rounded-2xl bg-white p-16 text-slate-500"><Loader2 className="animate-spin" />Finding your candidate profile�</div>}
    {phase === "upload" && <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
      <div className="mb-6 flex gap-3 text-xs font-semibold text-indigo-600"><span>01 Upload resume</span><span className="text-slate-400">02 Review details</span><span className="text-slate-400">03 Save profile</span></div>
      <h2 className="text-2xl font-semibold text-slate-900">Let your experience do the talking.</h2><p className="mt-2 text-sm text-slate-500">No candidate profile exists for your login email yet. Start with your resume and we�ll fill in the details.</p>
      <form onSubmit={parseResume} className="mt-6 space-y-5" aria-busy={busy}>
        <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-8 text-center"><FileText className="mx-auto mb-3 text-indigo-600" size={36} /><span className="block font-medium text-slate-800">Choose your resume</span><span className="mt-1 block text-sm text-slate-500">PDF, DOC or DOCX</span><input aria-label="Resume file" type="file" accept=".pdf,.doc,.docx" required disabled={busy} className="mt-5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-4 file:py-2 file:text-indigo-700" onChange={event => { const selected = event.target.files?.[0]; setFile(null); setError(""); if (!selected) return; if (!/\.(pdf|doc|docx)$/i.test(selected.name) || !selected.size) { setError("Choose a non-empty PDF, DOC or DOCX resume."); event.target.value = ""; return; } setFile(selected); }} /></label>
        <button disabled={!file || busy} className={primaryButton}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}{busy ? "Parsing resume�" : "Upload and parse"}</button>
      </form>
    </section>}
    {draft && <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" aria-busy={busy}>
          <h2 className="text-xl font-semibold text-slate-900">{phase === "edit" ? "Make it yours" : "Professional profile"}</h2><p className="mt-1 text-sm text-slate-500">{phase === "edit" ? "Check your information before saving. Your email is linked to your login." : "Your experience, details and professional connections."}</p>
          <fieldset disabled={busy} className="mt-6 grid gap-5 sm:grid-cols-2">
            {Object.entries(candidateFields).map(([key, label]) => <div key={key} className={key === "description" ? "sm:col-span-2" : ""}>
              <label htmlFor={`profile-${key}`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
              {phase === "edit" ? key === "description" ? <textarea id={`profile-${key}`} rows={9} value={draft[key]} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-indigo-500" /> : <input id={`profile-${key}`} type={key === "dob" ? "date" : key.endsWith("_url") ? "url" : key === "email1" ? "email" : key === "phone_mobile" ? "tel" : "text"} required={key === "last_name" || key === "email1"} readOnly={key === "email1"} value={draft[key]} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm read-only:bg-slate-50 focus:outline-indigo-500" /> : <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{draft[key] || "Not added yet"}</p>}
            </div>)}
          </fieldset>
          {phase === "edit" && <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-6"><button disabled={busy || photoBusy} className={primaryButton}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} {busy ? "Saving�" : "Save profile"}</button><button type="button" disabled={busy || photoBusy} className={secondaryButton} onClick={() => { setDraft(record ? normalizeCandidate(record, email) : null); setPhase(record ? "view" : "upload"); setError(""); setNotice(""); }}>Cancel</button></div>}
        </form>
        {phase === "edit" && <CandidatePhotoUpload initialEmail={email} lockedEmail disabled={busy} onBusyChange={setPhotoBusy} onUploaded={url => { setDraft(prev => ({ ...prev, portfolio_url: url })); setNotice("Photo uploaded. Save your profile to apply it."); }} />}
      </div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile completeness</p><p className="mt-3 text-4xl font-semibold text-slate-900">{Math.round(completed / 8 * 100)}<span className="text-xl text-slate-400">%</span></p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${completed / 8 * 100}%` }} /></div><p className="mt-4 text-sm leading-6 text-slate-500">Add your contact details, current role, location and photo to help your profile stand out.</p>{record?.status && <p className="mt-5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">{record.status}</p>}</aside>
    </div>}
  </main>;
}
