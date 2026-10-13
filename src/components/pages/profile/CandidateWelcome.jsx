import {
  ArrowLeft,
  ArrowRight,
  FileText,
  PencilLine,
  CheckCircle2,
} from "lucide-react";
import { GiFastBackwardButton } from "react-icons/gi";
export default function CandidateWelcome({ onUpload, onCreate, onBack }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="group mb-0 inline-flex min-h-11 items-center gap-3 rounded-full border border-slate-200 bg-white py-2 pl-2 pr-5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-300 hover:-translate-x-1 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <GiFastBackwardButton />

          <span>Back to getting started</span>
        </button>
      )}

      <header className="mx-auto mb-10 max-w-2xl text-center">
        <div className="aura aura-rainbow duration-2000">
          <div className="card bg-base-100">
            <div className="card-body text-2xl font-bold text-slate-900">
              <p> Candidate registration</p>
            </div>
          </div>
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Create your candidate profile
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
          Build your professional profile and take the next step in your career.
          Add your experience, skills, and education so our recruitment team can
          get to know you better.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Upload resume card */}
        <button
          type="button"
          onClick={onUpload}
          className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:p-8"
        >
          <div className="absolute right-0 top-0 size-36 -translate-y-1/2 translate-x-1/2 rounded-full bg-indigo-50 transition-transform duration-500 group-hover:scale-150" />

          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 transition-transform duration-300 group-hover:scale-110">
            <FileText size={27} strokeWidth={1.8} aria-hidden="true" />
          </div>

          <span className="relative mt-6 text-xl font-bold text-slate-900">
            Upload a resume
          </span>

          <span className="relative mt-3 text-sm leading-6 text-slate-500">
            Already have a resume? Upload it and get a head start. Review and
            update your profile details before submitting.
          </span>

          <span className="relative mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 group-hover:bg-indigo-700 group-hover:shadow-md">
            Upload resume
            <ArrowRight
              size={17}
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>

          <span className="relative mt-4 inline-flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={15} aria-hidden="true" />
            PDF, DOC, or DOCX · Up to 10 MB
          </span>
        </button>

        {/* Manual entry card */}
        <button
          type="button"
          onClick={onCreate}
          className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:p-8"
        >
          <div className="absolute right-0 top-0 size-36 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-50 transition-transform duration-500 group-hover:scale-150" />

          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 transition-transform duration-300 group-hover:scale-110">
            <PencilLine size={27} strokeWidth={1.8} aria-hidden="true" />
          </div>

          <span className="relative mt-6 text-xl font-bold text-slate-900">
            Enter details manually
          </span>

          <span className="relative mt-3 text-sm leading-6 text-slate-500">
            Prefer to start from scratch? Fill in the form and create your
            professional profile without uploading a resume.
          </span>

          <span className="relative mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 group-hover:border-emerald-500 group-hover:bg-emerald-50 group-hover:text-emerald-700">
            Create profile
            <ArrowRight
              size={17}
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>

          <span className="relative mt-4 inline-flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={15} aria-hidden="true" />
            Personal details, skills, and experience
          </span>
        </button>
      </div>

      <div className="mt-7 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500 sm:text-sm">
        <CheckCircle2
          size={17}
          className="mt-0.5 shrink-0 text-emerald-500"
          aria-hidden="true"
        />
        <p>Your progress can be reviewed before you complete registration.</p>
      </div>
    </section>
  );
}
