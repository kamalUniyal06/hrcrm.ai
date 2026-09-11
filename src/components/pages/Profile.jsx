import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Camera, Check, CheckCircle2, FileText, GraduationCap, Loader2, Mail, MapPin, Pencil, Save, ShieldCheck, Sparkles, Upload, UserRound } from "lucide-react";
import { FETCH_GPC_X_API_KEY } from "../../store/constants";
import CandidatePhotoUpload from "./profile/CandidatePhotoUpload";
import { candidateRelatedModules, fetchCandidateRelated, saveCandidateRelated, findCandidate, normalizeCandidate, saveCandidate } from "./profile/candidateApi";

import ProfileSectionContent from "./profile/ProfileSectionContent";
import ResumeLoading from "./profile/ResumeLoading";
import { useQueryClient } from "@tanstack/react-query";
import { candidateKey } from "../../queries/candidate.queries";

const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50";
const secondaryButton = "rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export default function Profile() {
  const email = useSelector(state => state.user.user?.email)?.trim() || "";
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job_id")?.trim() || "";
  return <CandidateProfile key={`${email}:${jobId}`} email={email} jobId={jobId} />;
}

function CandidateProfile({ email, jobId }) {
  const queryClient = useQueryClient();
  const [section, setSection] = useState("personal");
  const cancelled = useRef(false);
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [savedPhotoFile, setSavedPhotoFile] = useState(null);
  const [localPhoto, setLocalPhoto] = useState(null);

  // Own this preview here so closing the uploader after saving cannot revoke it.
  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setLocalPhoto({ file: photoFile, url });
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState(null);
  const [panNumber, setPanNumber] = useState("");
  const [stage, setStage] = useState("New Candidate -> Direct");
  const [related, setRelated] = useState({});
  const [relatedRetry, setRelatedRetry] = useState(0);
  const relatedCache = useRef({});
  const [retry, setRetry] = useState(0);
  const requestRef = useRef(null);
  const alive = useRef(true);
  const saveLock = useRef(false);

  // Resume parsing can create the CRM candidate before the profile is saved.
  // Publish that confirmed record so navigation becomes available immediately.
  useEffect(() => {
    if (!record?.id) return;
    void queryClient.cancelQueries({ queryKey: candidateKey(email), exact: true });
    queryClient.setQueryData(candidateKey(email), record);
  }, [record, email, queryClient]);

  useEffect(() => {
    let active = true;
    alive.current = true;
    setPhase("loading");
    setError("");
    findCandidate(email).then(candidate => {
      if (!active) return;
      setRecord(candidate);
      setDraft(candidate ? normalizeCandidate(candidate, email) : null);
      setPhase(jobId ? "upload" : candidate ? "view" : "upload");
    }).catch(err => { if (active) { setError(err.message); setPhase("error"); } });
    return () => { active = false; alive.current = false; requestRef.current?.abort(); };
  }, [email, jobId, retry]);

  useEffect(() => {
    if (!candidateRelatedModules[section] || !record?.id) return;
    if (relatedCache.current[section]?.items) return;
    let active = true;
    setRelated(prev => ({ ...prev, [section]: { loading: true } }));
    fetchCandidateRelated(record.id, section).then(items => {
      if (active) {
        relatedCache.current[section] = { items, original: items };
        setRelated(prev => ({ ...prev, [section]: relatedCache.current[section] }));
      }
    }).catch(err => {
      if (active) setRelated(prev => ({ ...prev, [section]: { error: err.message } }));
    });
    return () => { active = false; };
  }, [record?.id, section, relatedRetry]);

  const parseResume = async event => {
    event.preventDefault();
    if (!file || !email || requestRef.current) return;
    setError("");
    if (!panNumber.trim()) { setError("Please enter your PAN number."); return; }
    setBusy(true);
    cancelled.current = false;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      if (!FETCH_GPC_X_API_KEY) throw new Error("Resume upload is not configured. Please contact your administrator.");
      const body = new FormData();
      body.append("file", file, file.name);
      body.append("primary_email", email);
      body.append("stage", stage);
      body.append("pan_card_number", panNumber.trim().toUpperCase());
      if (jobId) body.append("job_record_id", jobId);
      const response = await fetch("https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=resume_parsing", { method: "POST", headers: { "x-api-key": FETCH_GPC_X_API_KEY }, body, signal: controller.signal });
      const json = await response.json();
      if (!response.ok || json?.success !== true) throw new Error(json?.message || "Unable to parse this resume. Please try another file.");
      const candidate = await findCandidate(email);
      if (!candidate) throw new Error("Resume parsed, but your candidate profile is not available yet. Reload your profile to retry the lookup.");
      if (!alive.current) return;
      if (cancelled.current || controller.signal.aborted) return;
      const parsed = normalizeCandidate(candidate, email);
      setRecord(candidate);
      relatedCache.current = {};
      setRelated({});
      setSection("personal");
      setDraft(parsed);
      setPhase("edit");
      setNotice("Resume parsed. Review and edit your details, then save your profile.");
    } catch (err) {
      if (alive.current && !cancelled.current) setError(err.name === "AbortError" ? "Resume parsing timed out. Please try again." : err.message);
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      if (alive.current) setBusy(false);
    }
  };

  const save = async event => {
    event.preventDefault();
    if (saveLock.current || photoBusy) return;
    if (!draft.last_name.trim()) {
      setSection("personal");
      setError("Please add your last name in Personal info before saving.");
      return;
    }
    for (const key of ["linkedin_url", "github_url"]) {
      if (draft[key] && !/^https?:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(draft[key])) {
        setSection("personal");
        setError("Please enter a complete LinkedIn or GitHub URL, starting with https://.");
        return;
      }
    }
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
      for (const [key, entry] of Object.entries(relatedCache.current)) {
        for (const item of entry.items || []) {
          const original = entry.original.find(value => value.id === item.id);
          await saveCandidateRelated(key, item, original);
          entry.original = entry.original.map(value => value.id === item.id ? { ...item } : value);
        }
      }
      if (!alive.current) return;
      setSavedPhotoFile(photoFile);
      setRecord({ ...existing, ...saved });
      setDraft(normalizeCandidate(saved, email));
      setPhase("view");
      setNotice("Your candidate profile has been saved.");
    } catch (err) { if (alive.current) setError(err.message || "Unable to save your profile."); }
    finally { saveLock.current = false; if (alive.current) setBusy(false); }
  };

  const photoSrc = photoFile ? (localPhoto?.file === photoFile ? localPhoto.url : "") : draft?.profile_image || "";
  const editing = phase === "edit";
  const name = [draft?.first_name, draft?.last_name].filter(Boolean).join(" ") || "Your career, beautifully told.";
  const completed = draft ? ["first_name", "last_name", "email1", "phone_mobile", "current_designation", "primary_address_city", "description", "profile_image"].filter(key => draft[key]).length : 0;
  const tabs = [
    { id: "personal", label: "Personal info", icon: UserRound, subtitle: "The person behind the profile", description: "Your introduction, contact details and professional links." },
    { id: "education", label: "Education", icon: GraduationCap, subtitle: "Where your journey began", description: "Your qualifications, institutions and academic achievements." },
    { id: "experiences", label: "Experience", icon: BriefcaseBusiness, subtitle: "The work that shaped you", description: "Your roles, responsibilities and career milestones." },
    { id: "skills", label: "Skills", icon: Sparkles, subtitle: "What you bring to the table", description: "Highlight your strengths and the tools you know best." },
    ...(record?.id ? [{ id: "photo", label: "Profile photo", icon: Camera, subtitle: "Put a face to your story", description: "Personalize your saved profile with a photo." }] : []),
  ];
  const activeTab = tabs.find(tab => tab.id === section) || tabs[0];
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab.id);
  const goTo = next => {
    if (busy || photoBusy) return;
    setSection(next);
  };
  const cancelEditing = () => {
    relatedCache.current = Object.fromEntries(Object.entries(relatedCache.current).map(([key, entry]) => [key, { ...entry, items: entry.original }]));
    setRelated({ ...relatedCache.current });
    setPhotoFile(savedPhotoFile);
    setDraft(record ? normalizeCandidate(record, email) : null);
    setPhase(record ? "view" : "upload");
    setSection("personal");
    setError("");
    setNotice("");
  };
  return <main className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-8 sm:py-8">
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Career space</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">My profile</h1></div><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-500" />{record?.id ? "Profile saved" : "Your next opportunity starts here"}</span></div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}{phase === "error" && <button onClick={() => setRetry(value => value + 1)} className="ml-4 font-semibold underline">Retry lookup</button>}</div>}
      {notice && <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={17} className="shrink-0" /><span className="flex-1">{notice}</span>{record?.id && !draft?.profile_image && !editing && <button onClick={() => { setPhase("edit"); setSection("photo"); setNotice(""); }} className="inline-flex items-center gap-1 font-semibold">Add photo<ArrowRight size={15} /></button>}</div>}
      {phase === "loading" && <section role="status" aria-label="Loading your profile" className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="h-32 animate-pulse bg-indigo-50 motion-reduce:animate-none" /><div className="space-y-6 p-8"><div className="flex items-center gap-3 text-sm text-slate-500"><Loader2 size={18} className="animate-spin motion-reduce:animate-none" />Finding your candidate profile...</div><div className="grid gap-6 sm:grid-cols-2">{[0, 1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-50 motion-reduce:animate-none" />)}</div></div></section>}
      {phase === "upload" && (busy ? <ResumeLoading filename={file?.name} onCancel={() => { cancelled.current = true; requestRef.current?.abort(); }} /> : <section className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-sidebar-primary to-sidebar-secondary p-8 text-white sm:p-12"><div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full border border-white/10" /><div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full border-[40px] border-white/5" /><span className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs"><Sparkles size={14} />A head start for your next chapter</span><h2 className="relative mt-8 max-w-sm text-4xl font-semibold leading-tight tracking-tight">Great experience.<br /><span className="text-white/60">Meet a great profile.</span></h2><p className="relative mt-5 max-w-sm text-sm leading-7 text-white/70">Bring your resume. We'll turn it into a profile that tells your story, one detail at a time.</p><div className="relative mt-10 space-y-5">{["Upload your resume", "Review each part of your story", "Save and make it yours"].map((text, index) => <div key={text} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-xs text-white/70">{index + 1}</span><span className="text-sm text-white/90">{text}</span></div>)}</div></div>
        <form onSubmit={parseResume} className="flex flex-col justify-center p-7 sm:p-12"><p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Let's begin</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">One resume. A world of potential.</h2><p className="mt-3 text-sm leading-6 text-slate-500">Start with your latest resume. You'll be able to review and edit everything before saving.</p><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">Email<input type="email" value={email} readOnly required className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500" /></label><label className="block text-sm font-medium text-slate-700">Stage<select value={stage} onChange={event => setStage(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">{["Direct", "Via Portal", "Institute", "Campus Drive"].map(label => <option key={label} value={`New Candidate -> ${label}`}>{label}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">PAN number <span className="text-red-500">*</span><input type="text" value={panNumber} onChange={event => setPanNumber(event.target.value.toUpperCase())} required autoComplete="off" placeholder="Enter your PAN number" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" /></label>{jobId && <p className="break-all text-[10px] text-slate-400">Job ID: {jobId}</p>}</div><label className="group mt-7 block cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-7 text-center transition hover:border-indigo-400 hover:bg-indigo-50 focus-within:ring-4 focus-within:ring-indigo-100"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm transition group-hover:-translate-y-1"><Upload size={24} /></span><span className="mt-4 block text-sm font-semibold text-slate-800">{file ? file.name : "Choose your resume"}</span><span className="mt-1 block text-xs text-slate-400">PDF, DOC or DOCX</span><input aria-label="Resume file" type="file" accept=".pdf,.doc,.docx" className="mt-5 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-indigo-600" onChange={event => { const selected = event.target.files?.[0]; setFile(null); setError(""); if (!selected) return; if (!/\.(pdf|doc|docx)$/i.test(selected.name) || !selected.size) { setError("Choose a non-empty PDF, DOC or DOCX resume."); event.target.value = ""; return; } setFile(selected); }} /></label><button disabled={!file || !email || !panNumber.trim()} className={`${primaryButton} mt-5 w-full`}>Build my profile<ArrowRight size={17} /></button><p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400"><FileText size={13} />Your details stay editable, always.</p></form>
      </section>)}
      {draft && phase !== "upload" && <>
        <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-28 overflow-hidden bg-gradient-to-r from-sidebar-primary to-sidebar-secondary sm:h-32"><div className="absolute -right-10 -top-44 h-96 w-96 rounded-full border-[48px] border-white/5" /><div className="absolute right-52 top-8 h-56 w-56 rounded-full border border-white/10" /><span className="absolute left-6 top-6 text-[10px] font-medium uppercase tracking-[0.25em] text-white/70 sm:left-8">Your story. Your next chapter.</span></div>
          <div className="relative px-6 pb-6 sm:px-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="-mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-end"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-[5px] border-white bg-indigo-50 text-3xl font-semibold text-indigo-500 shadow-sm">{photoSrc ? <img key={photoSrc} src={photoSrc} alt="Candidate profile" className="h-full w-full object-cover" /> : [draft.first_name, draft.last_name].filter(Boolean).map(part => part[0]).join("").toUpperCase() || <UserRound size={34} />}</div><div className="min-w-0 sm:pb-1"><h2 className="break-words text-2xl font-semibold tracking-tight text-slate-900">{name}</h2><p className="mt-1 text-sm text-slate-500">{draft.current_designation || "Ready for what's next"}</p></div></div>{!editing ? <button className={secondaryButton} onClick={() => { setPhase("edit"); setNotice(""); }}><span className="flex items-center gap-2"><Pencil size={15} />Edit profile</span></button> : <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">{record?.id ? "Editing your profile" : "Draft / review before saving"}</span>}</div><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex min-w-0 items-center gap-2"><Mail size={14} className="shrink-0 text-slate-400" /><span className="break-all">{email}</span></span>{draft.primary_address_city && <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-slate-400" />{[draft.primary_address_city, draft.primary_address_country].filter(Boolean).join(", ")}</span>}{record?.status && <span className="inline-flex items-center gap-1.5 text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{record.status}</span>}</div></div>
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-5 lg:sticky lg:top-5"><nav aria-label="Profile sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:flex-col">{tabs.map((tab, index) => <button key={tab.id} type="button" aria-current={section === tab.id ? "step" : undefined} aria-controls="profile-section" disabled={busy || photoBusy} onClick={() => goTo(tab.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition disabled:opacity-50 ${section === tab.id ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><tab.icon size={18} /><span className="flex-1 whitespace-nowrap">{tab.label}</span><span className={`hidden text-[10px] lg:block ${section === tab.id ? "text-indigo-400" : "text-slate-300"}`}>{String(index + 1).padStart(2, "0")}</span></button>)}</nav><div className="hidden rounded-2xl border border-slate-200 bg-white p-5 lg:block"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Profile strength</span><span className="text-sm font-semibold text-indigo-600">{Math.round(completed / 8 * 100)}%</span></div><div role="progressbar" aria-label="Profile completeness" aria-valuenow={Math.round(completed / 8 * 100)} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${completed / 8 * 100}%` }} /></div><p className="mt-3 text-xs leading-5 text-slate-400">Small details make a big impression. Let your profile reflect you.</p></div></aside>
          <section id="profile-section" aria-label={activeTab.label} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-6 sm:px-8"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">{editing ? "Review your story" : "Get to know me"} / {String(activeIndex + 1).padStart(2, "0")}</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{activeTab.subtitle}</h2><p className="mt-1.5 text-sm leading-6 text-slate-500">{activeTab.description}</p></div><span className="hidden rounded-xl bg-slate-50 p-3 text-slate-400 sm:block"><activeTab.icon size={22} /></span></div>
            {section === "photo" && record?.id ? <div className="p-6 sm:p-8">{editing ? <CandidatePhotoUpload initialEmail={email} lockedEmail disabled={busy} onBusyChange={setPhotoBusy} onUploaded={(url, uploadedFile) => { setPhotoFile(uploadedFile); setDraft(prev => ({ ...prev, profile_image: url })); setNotice("Photo uploaded. Save your profile to apply it."); }} /> : <div className="py-8 text-center"><Camera size={32} className="mx-auto text-indigo-400" /><p className="mt-4 text-sm text-slate-500">{draft.profile_image ? "Your profile photo is up to date. Want a fresh look?" : "Make your profile more personal with a photo."}</p><button onClick={() => setPhase("edit")} className={`${secondaryButton} mt-5`}>{draft.profile_image ? "Change photo" : "Add photo"}</button></div>}</div> : <form id="candidate-details" onSubmit={save} className="p-6 sm:p-8" aria-busy={busy}><fieldset disabled={busy || photoBusy}>{candidateRelatedModules[activeTab.id] ? related[activeTab.id]?.loading ? <p role="status" className="text-sm text-slate-500">Loading {activeTab.label.toLowerCase()}...</p> : related[activeTab.id]?.error ? <div role="alert" className="text-sm text-red-700">{related[activeTab.id].error}<button type="button" onClick={() => setRelatedRetry(value => value + 1)} className="ml-3 underline">Retry</button></div> : <ProfileSectionContent section={activeTab.id} draft={{ ...draft, resumeSections: { [activeTab.id]: related[activeTab.id]?.items || [] } }} setDraft={updater => {
      const key = activeTab.id;
      const entry = relatedCache.current[key];
      if (!entry) return;
      const updated = updater({ ...draft, resumeSections: { [key]: entry.items } });
      relatedCache.current[key] = { ...entry, items: updated.resumeSections[key] };
      setRelated(prev => ({ ...prev, [key]: relatedCache.current[key] }));
    }} editing={editing} /> : <ProfileSectionContent section={activeTab.id} draft={draft} setDraft={setDraft} editing={editing} />}</fieldset></form>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-8"><div className="flex items-center gap-2"><button type="button" disabled={activeIndex === 0 || busy || photoBusy} onClick={() => goTo(tabs[activeIndex - 1].id)} className="rounded-lg p-2 text-slate-500 hover:bg-white disabled:opacity-30" aria-label="Previous section"><ArrowLeft size={18} /></button><span className="text-xs text-slate-400">{activeIndex + 1} of {tabs.length}</span>{activeIndex < tabs.length - 1 && <button type="button" disabled={busy || photoBusy} onClick={() => goTo(tabs[activeIndex + 1].id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-white disabled:opacity-50">Next<ArrowRight size={15} /></button>}</div>{editing ? <div className="flex items-center gap-2"><button type="button" disabled={busy || photoBusy} onClick={cancelEditing} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-white disabled:opacity-50">Cancel</button><button type={section === "photo" ? "button" : "submit"} form={section === "photo" ? undefined : "candidate-details"} onClick={section === "photo" ? save : undefined} disabled={busy || photoBusy} className={primaryButton}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{busy ? "Saving..." : "Save profile"}</button></div> : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check size={14} />Saved to your profile</span>}</div>
          </section>
        </div>
      </>}
    </div>
  </main>;
}
