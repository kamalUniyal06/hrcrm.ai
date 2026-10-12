import { ArrowRight, FileText, PencilLine } from "lucide-react";

export default function CandidateWelcome({ onUpload, onCreate }) {
  return (
    <section className="mx-auto max-w-3xl py-10 sm:py-16">
      <header className="mb-8 max-w-xl">
        <p className="ob-muted text-sm font-medium">Candidate registration</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Create your candidate profile
        </h1>
        <p className="ob-muted mt-4 text-sm leading-7">
          Add your contact details, skills, work experience, and education so our
          recruitment team can review your application.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onUpload}
          className="ob-surface ob-choice flex flex-col items-start p-6 text-left sm:p-7"
        >
          <FileText
            size={26}
            className="text-[var(--ob-accent)]"
            aria-hidden="true"
          />
          <span className="mt-5 text-lg font-semibold">Upload a resume</span>
          <span className="ob-muted mt-2 flex-1 text-sm leading-6">
            Use your existing resume to fill in your profile, then review and
            update the details.
          </span>
          <span className="ob-primary mt-6 w-full">
            Upload resume <ArrowRight size={16} aria-hidden="true" />
          </span>
          <span className="ob-muted mt-3 text-xs">
            PDF, DOC, or DOCX, up to 10 MB
          </span>
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="ob-surface ob-choice flex flex-col items-start p-6 text-left sm:p-7"
        >
          <PencilLine
            size={26}
            className="text-[var(--ob-accent)]"
            aria-hidden="true"
          />
          <span className="mt-5 text-lg font-semibold">
            Enter details manually
          </span>
          <span className="ob-muted mt-2 flex-1 text-sm leading-6">
            Complete your profile using the form. You can use this option if you
            do not have a resume.
          </span>
          <span className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--ob-line)] px-4 py-3 text-sm font-semibold">
            Create profile <ArrowRight size={16} aria-hidden="true" />
          </span>
          <span className="ob-muted mt-3 text-xs">
            Personal details, skills, experience, education, and photo
          </span>
        </button>
      </div>
      <p className="ob-muted mt-6 text-sm">
        You can review your information before completing registration.
      </p>
    </section>
  );
}
