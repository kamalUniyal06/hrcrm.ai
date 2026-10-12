import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

export default function ResumeLoading({
  filename,
  onCancel,
  phase = "processing",
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <section aria-busy="true" className="mx-auto max-w-xl py-16 sm:py-24">
      <Loader2
        size={30}
        className="animate-spin text-[var(--ob-accent)] motion-reduce:animate-none"
        aria-hidden="true"
      />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {phase === "fetching"
          ? "Loading your profile"
          : "Processing your resume"}
      </h1>
      <p role="status" className="ob-muted mt-3 text-sm leading-7">
        {phase === "fetching"
          ? "Your resume has been processed. We are loading the details for your review."
          : seconds >= 45
            ? "Your resume is still processing. Please wait, or cancel to return to the upload form."
            : "We are extracting your contact details, skills, and experience. You can review and correct them next."}
      </p>
      <div className="ob-surface mt-6 flex items-center gap-3 p-4">
        <FileText
          size={22}
          className="shrink-0 text-[var(--ob-accent)]"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 break-all text-sm font-medium">
          {filename}
        </p>
        <span
          className="ob-muted shrink-0 text-xs tabular-nums"
          aria-label={`${seconds} seconds elapsed`}
        >
          {seconds}s
        </span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="ob-muted mt-6 min-h-11 rounded-lg border border-[var(--ob-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--ob-soft)]"
      >
        Cancel upload
      </button>
    </section>
  );
}
