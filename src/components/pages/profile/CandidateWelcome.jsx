import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  PencilLine,
  Sparkles,
} from "lucide-react";

export default function CandidateWelcome({ onUpload, onCreate, onBack }) {
  return (
    <section
      aria-labelledby="candidate-welcome-title"
      className="mx-auto max-w-[960px] py-6"
    >
      {onBack && (
        <button type="button" onClick={onBack} className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to getting started
        </button>
      )}
      <header className="mt-5 mb-8 sm:mt-6">
        <p className={styles.eyebrow}>
          <PencilLine size={15} aria-hidden="true" /> Candidate registration
        </p>
        <h1 id="candidate-welcome-title" className={styles.display}>
          Create your candidate profile
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-base leading-7">
          Create your candidate profile. Choose how you would like to add your
          details; you can review everything before you finish.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-[22px]">
        <button
          type="button"
          onClick={onUpload}
          className={cn(styles.surface, `transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none flex flex-col items-start p-6 text-left sm:p-[30px] border-primary/25 bg-linear-to-br from-card to-accent`)}
        >
          <div className="flex w-full items-center justify-between gap-3">
            <span className={styles.icon}>
              <FileText size={27} aria-hidden="true" />
            </span>
            <span className={cn(styles.status, `border-primary/20 bg-accent text-primary`)}>
              <Sparkles size={13} aria-hidden="true" /> Recommended
            </span>
          </div>
          <span className="mt-6 text-xl font-semibold tracking-tight">Upload a resume</span>
          <span className="text-muted-foreground mt-3 flex-1 text-sm leading-6">
            Give yourself a head start. We will fill in your profile from your
            resume, then you can fine-tune the details.
          </span>
          <span className={cn(styles.primary, `mt-7 w-full`)}>
            Upload resume <ArrowRight size={17} aria-hidden="true" />
          </span>
          <span className="text-muted-foreground mt-4 text-xs">
            PDF, DOC, or DOCX, up to 10 MB
          </span>
        </button>
        <button
          type="button"
          onClick={onCreate}
          className={cn(styles.surface, `transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none flex flex-col items-start p-6 text-left sm:p-[30px] bg-linear-to-br from-card to-[var(--employee-green-soft)] [&>span:first-child]:text-[var(--employee-green)]`)}
        >
          <span className={styles.icon}>
            <PencilLine size={27} aria-hidden="true" />
          </span>
          <span className="mt-6 text-xl font-semibold tracking-tight">Enter details manually</span>
          <span className="text-muted-foreground mt-3 flex-1 text-sm leading-6">
            Start with a clean slate. Add your personal details, skills,
            experience, and education at your own pace.
          </span>
          <span className={cn(styles.secondary, `mt-7 w-full`)}>
            Create profile <ArrowRight size={17} aria-hidden="true" />
          </span>
          <span className="text-muted-foreground mt-4 text-xs">
            No resume needed to get started
          </span>
        </button>
      </div>
      <p className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground [&>svg]:mt-0.5 [&>svg]:shrink-0 [&>svg]:text-[var(--employee-green)]">
        <Check size={16} aria-hidden="true" /> You are in control. Review your
        information before completing registration.
      </p>
    </section>
  );
}
