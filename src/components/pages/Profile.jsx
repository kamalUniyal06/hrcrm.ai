import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { FETCH_GPC_X_API_KEY } from "../../store/constants";
import CandidatePhotoUpload from "./profile/CandidatePhotoUpload";

const labelFor = (key) => ({ dob: "Date of birth", ctc: "CTC", linkedin_url: "LinkedIn URL", github_url: "GitHub URL", total_years_total_months: "Experience" }[key] || key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()));

function Details({ data }) {
  const fields = data && typeof data === "object" ? Object.entries(data).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "") : [];
  return fields.length ? <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {fields.map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-xs font-medium text-slate-500">{labelFor(key)}</dt><dd className="mt-1 break-words text-sm text-slate-900">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}
  </dl> : <p className="text-sm text-slate-500">No details found in the resume.</p>;
}

function Records({ title, items }) {
  const records = Array.isArray(items) ? items.filter((item) => item && typeof item === "object") : [];
  return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-5 text-lg font-semibold text-slate-900">{title} <span className="text-sm font-normal text-slate-500">({records.length})</span></h2>
    {records.length ? <div className="space-y-5">{records.map((record, index) => <div key={index} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0"><Details data={record} /></div>)}</div> : <p className="text-sm text-slate-500">No {title.toLowerCase()} found in the resume.</p>}
  </section>;
}

const Profile = () => {
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const requestRef = useRef(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (requestRef.current || !file) return;
    setError("");
    setResult(null);
    if (!FETCH_GPC_X_API_KEY) {
      setError("Resume upload is not configured. Please contact your administrator.");
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      if (email.trim()) body.append("email", email.trim());
      const response = await fetch("https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=resume_parsing", {
        method: "POST", headers: { "x-api-key": FETCH_GPC_X_API_KEY }, body, signal: controller.signal,
      });
      const json = await response.json().catch(() => { throw new Error("The server returned an unreadable response. Please try again."); });
      if (!response.ok || json?.success !== true) throw new Error(typeof json?.message === "string" ? json.message : typeof json?.error === "string" ? json.error : "Unable to parse this resume. Please try another file.");
      if (!json.content || typeof json.content !== "object" || Array.isArray(json.content)) throw new Error("No candidate details were returned. Please try another resume.");
      setResult({ ...json, filename: json.filename || file.name });
    } catch (err) {
      setError(err.name === "AbortError" ? "Resume parsing timed out. Please try again." : err.message || "Upload failed. Please try again.");
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header><h1 className="text-2xl font-semibold text-slate-900">Candidate profile</h1><p className="mt-1 text-sm text-slate-500">Upload your resume to view your professional details.</p></header>
      <form onSubmit={handleUpload} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6" aria-busy={loading}>
        <div className="flex items-center gap-3"><FileText className="text-indigo-600" size={24} /><h2 className="text-lg font-semibold text-slate-900">Upload resume</h2></div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <label htmlFor="resume-file" className="mb-2 block text-sm font-medium text-slate-700">Choose your resume</label>
          <input id="resume-file" type="file" accept=".pdf,.doc,.docx" required disabled={loading} aria-describedby="resume-help" className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-4 file:py-2 file:font-medium file:text-indigo-700 disabled:opacity-50" onChange={(event) => {
            const selected = event.target.files?.[0];
            setResult(null);
            setError("");
            setFile(null);
            if (!selected) return;
            if (!/\.(pdf|doc|docx)$/i.test(selected.name) || selected.size === 0) {
              setError("Please choose a non-empty PDF, DOC, or DOCX resume.");
              event.target.value = "";
              return;
            }
            setFile(selected);
          }} />
          <p id="resume-help" className="mt-3 text-xs text-slate-500">PDF, DOC, or DOCX. Your file is uploaded when you select Upload and parse.</p>
        </div>
        <div className="max-w-md"><label htmlFor="resume-email" className="mb-2 block text-sm font-medium text-slate-700">Email (optional)</label><input id="resume-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={!file || loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}{loading ? "Parsing resume…" : "Upload and parse"}</button>
        <p role="status" className="text-sm text-slate-500">{loading ? "Extracting your candidate details. This may take a moment." : result ? `Resume parsed successfully: ${result.filename}` : ""}</p>
      </form>
      {result && <div className="space-y-6">
        <CandidatePhotoUpload initialEmail={result.content.candidate?.email || email.trim()} />
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-5 text-lg font-semibold text-slate-900">Candidate details</h2><Details data={result.content.candidate} /></section>
        <Records title="Work experience" items={result.content.experiences} />
        <Records title="Education" items={result.content.education} />
        <Records title="Skills" items={result.content.skills} />
      </div>}
    </div>
  );
};

export default Profile;
