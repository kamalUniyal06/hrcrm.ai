import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Fingerprint,
  Mail,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

export default function ResumeUpload({
  email,
  file,
  panNumber,
  stage,
  onPanChange,
  onStageChange,
  onFileChange,
  onBack,
  onSubmit,
}) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  const validPan = /^[A-Z0-9]{10}$/.test(panNumber);
  return (
    <section className="mx-auto max-w-[1000px] py-6 sm:py-10">
    
      <div className="mb-9 text-center">
             <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs text-slate-500 transition hover:text-violet-700"
        >
          <ArrowLeft size={15} /> All options
        </button>
        <h1 className="mt-5 text-4xl font-medium leading-[1.12] tracking-[-1.8px] text-slate-900 sm:text-5xl">
          You’ve done the work.
          <br />
          <span className="font-serif font-normal italic text-violet-500">
            Let your resume tell it.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">
          Drop it in. We’ll turn your experience into a profile.
          <br className="hidden sm:block" /> You get the final say on every
          detail.
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_70px_-35px_#6d28d933]"
      >
        <div className="grid lg:grid-cols-[1.05fr_1fr]">
          <div className="relative overflow-hidden bg-[#211936] p-6 text-white sm:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-violet-500/20 blur-3xl"
            />
            <div className="relative flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.2em] text-violet-200">
                01 / YOUR RESUME
              </span>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] text-white/50">
                PDF · DOC · DOCX
              </span>
            </div>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                onFileChange(event.dataTransfer.files?.[0]);
              }}
              className={`relative mt-6 flex min-h-[285px] flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition duration-200 ${dragging ? "border-violet-300 bg-violet-400/20 ring-4 ring-violet-300/10" : "border-white/20 bg-white/[0.035]"}`}
            >
              <div
                aria-hidden="true"
                className="relative mb-7 flex h-20 w-24 items-center justify-center"
              >
                <div className="absolute h-[76px] w-14 -translate-x-3 -rotate-12 rounded-lg border border-white/15 bg-violet-300/10" />
                <div className="relative flex h-20 w-16 rotate-6 flex-col items-center justify-center gap-2 rounded-lg border border-white/30 bg-linear-to-br from-violet-100 to-violet-300 shadow-xl shadow-black/20">
                  <FileText size={28} className="text-violet-700" />
                  <div className="h-1 w-7 rounded bg-violet-400/40" />
                </div>
                <span className="absolute -right-1 bottom-0 rounded-full bg-lime-200 p-2 text-violet-950">
                  {file ? <Check size={14} /> : <ArrowUpRight size={14} />}
                </span>
              </div>
              <h2 className="text-lg font-medium tracking-tight">
                {file
                  ? "Looking good. You’re ready."
                  : dragging
                    ? "Right here. Let it go."
                    : "Your next chapter goes here."}
              </h2>
              <p className="mt-2 text-xs leading-5 text-violet-200/60">
                {file
                  ? "Your resume is selected and ready to upload."
                  : "Drag & drop your resume, or choose a file below."}
              </p>
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-violet-950 transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
              >
                <UploadCloud size={15} />
                {file ? "Choose another file" : "Choose my resume"}
              </button>
              <input
                ref={input}
                aria-label="Choose resume file"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(event) => {
                  onFileChange(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <p className="mt-3 text-[10px] text-white/35">Up to 10 MB</p>
            </div>
            {file && (
              <div
                role="status"
                className="relative mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <FileText size={19} className="shrink-0 text-violet-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white">{file.name}</p>
                  <p className="mt-1 text-[10px] text-white/40">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to upload
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove selected resume"
                  onClick={() => onFileChange(null)}
                  className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <p className="relative mt-5 flex items-center justify-center gap-2 text-[10px] text-violet-200/50">
              <Sparkles size={12} /> A head start on telling your story.
            </p>
          </div>
          <div className="flex flex-col p-6 sm:p-9">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-violet-500">
              02 / A COUPLE OF DETAILS
            </p>
            <h2 className="mt-4 text-2xl font-medium tracking-tight text-slate-900">
              Make it yours.
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              We’ll connect your resume to your account.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
              <span className="rounded-lg bg-white p-2 text-slate-400 shadow-sm">
                <Mail size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400">
                  Signed in as
                </p>
                <p className="mt-1 break-all text-xs font-medium text-slate-700">
                  {email}
                </p>
              </div>
            </div>
            <label
              className="mt-6 block text-xs font-medium text-slate-700"
              htmlFor="resume-pan"
            >
              PAN number <span className="text-violet-500">*</span>
            </label>
            <div className="relative mt-2">
              <Fingerprint
                size={18}
                className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
              />
              <input
                id="resume-pan"
                required
                minLength={10}
                maxLength={10}
                pattern="[A-Za-z0-9]{10}"
                title="Enter exactly 10 letters or numbers"
                autoComplete="off"
                spellCheck={false}
                value={panNumber}
                onChange={(event) =>
                  onPanChange(event.target.value.toUpperCase())
                }
                placeholder="Your 10-character PAN"
                aria-describedby="resume-pan-hint"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-14 text-sm tracking-wider text-slate-800 outline-none transition placeholder:text-xs placeholder:tracking-normal placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
              />
              <span
                className={`absolute right-3 top-3.5 text-[10px] ${validPan ? "text-emerald-600" : "text-slate-400"}`}
              >
                {validPan ? <Check size={16} /> : `${panNumber.length}/10`}
              </span>
            </div>
            <p id="resume-pan-hint" className="mt-2 text-[10px] text-slate-400">
              Required · Exactly 10 letters or numbers
            </p>
            <label
              htmlFor="resume-source"
              className="mt-5 text-xs font-medium text-slate-700"
            >
              How did you find us?
            </label>
            <select
              id="resume-source"
              value={stage}
              onChange={(event) => onStageChange(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
            >
              {["Direct", "Via Portal", "Institute", "Campus Drive"].map(
                (label) => (
                  <option key={label} value={`New Candidate -> ${label}`}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <button
              disabled={!file || !email || !validPan}
              className="mt-7 flex items-center justify-between gap-3 rounded-xl bg-violet-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-200/50 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
            >
              Bring my profile to life <ArrowRight size={17} />
            </button>
            <p className="mt-3 text-center text-[10px] text-slate-400">
              Next up: review your details and make them yours.
            </p>
          </div>
        </div>
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[10px] text-slate-400">
        {["Upload once", "Review every detail", "Save when you’re ready"].map(
          (text) => (
            <span key={text} className="flex items-center gap-1.5">
              <Check size={12} className="text-violet-400" />
              {text}
            </span>
          ),
        )}
      </div>
    </section>
  );
}
