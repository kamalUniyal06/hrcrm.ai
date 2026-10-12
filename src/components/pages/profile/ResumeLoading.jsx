import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import ResumeProcessingIllustration from "./ResumeProcessingIllustration";

export default function ResumeLoading({
  filename,
  phase = "processing",
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <section aria-busy="true" aria-labelledby="resume-processing-title" className="mx-auto max-w-xl py-8 sm:py-12">
      <ResumeProcessingIllustration ready={phase === "fetching"} />
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-[.16em] text-[var(--ob-accent)]">
        {phase === "fetching" ? "Ready for the next step" : "Turning your resume into your profile"}
      </p>
      <h1 id="resume-processing-title" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        {phase === "fetching"
          ? "Loading your profile"
          : "Processing your resume"}
      </h1>
      <p role="status" aria-atomic="true" className="ob-muted mx-auto mt-3 max-w-md text-center text-sm leading-7">
        {phase === "fetching"
          ? "Your resume has been processed. We are loading the details for your review."
          : seconds >= 45
            ? "Your resume is taking a little longer to process. We are still working on it. Your details will appear here when ready."
            : "We are organizing your contact details, skills, experience, and education. You can review everything next."}
      </p>
      <div className="ob-surface mx-auto mt-7 flex max-w-md items-center gap-3 p-4">
        <FileText
          size={22}
          className="shrink-0 text-[var(--ob-accent)]"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 break-all text-sm font-medium">
          {filename || "Your resume"}
        </p>
        <span
          className="ob-muted shrink-0 text-xs tabular-nums"
          aria-label={`${seconds} seconds elapsed`}
        >
          {seconds}s
        </span>
      </div>
    </section>
  );
}
