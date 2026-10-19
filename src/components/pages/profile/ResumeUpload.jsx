import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { useRef, useState } from "react";
import { MotionConfig, motion as Motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, FileText, Mail,
  Megaphone, Sparkles, UploadCloud, X,
} from "lucide-react";
import OnboardingBackdrop from "./OnboardingBackdrop";
import ResumePreview from "./ResumePreview";
import { EASE, marker, rise, stagger, usePointerField } from "./onboardingMotion";
import { candidateSources } from "./onboardingValidation.js";

export default function ResumeUpload({
  email,
  file,
  stage,
  onStageChange,
  onFileChange,
  onBack,
  onSubmit,
  fillViewport = false,
}) {
  const input = useRef(null);
  const backdropRef = useRef(null);
  const pointer = usePointerField(backdropRef);
  const [dragging, setDragging] = useState(false);
  const sourceReady = candidateSources.some(source => source.value === stage);
  const submitDisabled = !email || !file || !sourceReady;

  return (
    <MotionConfig reducedMotion="user">
      <Motion.section
        className={cn(
          "mx-auto grid max-w-[1160px] grid-cols-1 gap-7 py-5 sm:py-7 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-x-16 lg:py-[clamp(1.5rem,6vh,4.5rem)] xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:gap-x-24",
          fillViewport && "lg:min-h-dvh lg:content-center",
        )}
        aria-labelledby="resume-step-heading"
        initial="hidden"
        animate="show"
        variants={stagger(0.05, 0.08)}
      >
        <OnboardingBackdrop containerRef={backdropRef} pointer={pointer} pattern="aurora" />

        <div className="lg:sticky lg:top-[clamp(1.5rem,6vh,4.5rem)] lg:pt-2">
          <Motion.div variants={rise}>
            <button type="button" onClick={onBack} className={cn(styles.back, "group/back -ml-1")}>
              <ArrowLeft size={16} aria-hidden="true" className="transition-transform duration-300 group-hover/back:-translate-x-1 motion-reduce:transition-none" /> Back
            </button>
          </Motion.div>

          <Motion.header variants={rise} className="mt-6 lg:mt-[clamp(1.5rem,5vh,3rem)]">
            <p className={styles.eyebrowPill}>
              <span className={styles.eyebrowBadge}>
                <Sparkles size={12} aria-hidden="true" />
              </span>
              Autofill
            </p>
            <h1 id="resume-step-heading" className="mt-5 text-[30px] leading-[1.12] font-semibold tracking-[-0.035em] outline-none sm:text-4xl lg:text-[42px] [&>span]:text-primary">
              Upload your{" "}
              <span className="relative isolate inline-block">
                resume
                <Motion.span aria-hidden="true" variants={marker} initial="hidden" animate="show" className={styles.marker} />
              </span>
            </h1>
            <p className="text-muted-foreground mt-4 max-w-sm text-[15px] leading-7">
              We fill in your profile from it. You can edit everything next.
            </p>
          </Motion.header>
        </div>

        <Motion.div
          variants={rise}
          className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-[0_30px_80px_-40px_color-mix(in_srgb,var(--primary)_40%,transparent)] backdrop-blur-xl sm:p-8 lg:p-[clamp(1.75rem,4vh,2.5rem)]"
        >
          <form onSubmit={(event) => {
            if (submitDisabled) {
              event.preventDefault();
              return;
            }
            onSubmit(event);
          }}>
            <div className="space-y-7">
              <div>
                <label htmlFor="resume-email" className={styles.label}>Account email</label>
                <div className={styles.inputIcon}>
                  <Mail size={18} aria-hidden="true" />
                  <input id="resume-email" type="email" value={email} readOnly className={styles.input} aria-describedby="resume-email-hint" />
                </div>
                <p id="resume-email-hint" className={styles.help}>Your resume is linked to this account.</p>
              </div>
              <div>
                <label className={styles.label} htmlFor="resume-file">Resume <span className="text-primary">*</span></label>
                <div
                  className={cn(
                    "mt-3 flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-card/60 px-4 py-8 text-center transition-[border-color,background-color,scale] duration-200 hover:border-primary/40 hover:bg-accent/40 motion-reduce:transition-none",
                    dragging && "scale-[1.01] border-primary bg-accent",
                  )}
                  onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
                  onDrop={(event) => { event.preventDefault(); setDragging(false); onFileChange(event.dataTransfer.files?.[0]); }}>
                  {file ? <ResumePreview file={file} /> : (
                    <>
                      <Motion.span
                        aria-hidden="true"
                        animate={dragging ? { y: -6, scale: 1.1 } : { y: [0, -5, 0], scale: 1 }}
                        transition={dragging ? { type: "spring", stiffness: 300, damping: 15 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary shadow-sm"
                      >
                        <UploadCloud size={28} />
                      </Motion.span>
                      <p className="mt-4 text-sm font-semibold">{dragging ? "Drop to upload" : "Drag and drop your resume"}</p>
                      <p className="text-muted-foreground mt-1 text-xs">or choose a file</p>
                    </>
                  )}
                  <p id="resume-file-hint" className={styles.help}>PDF, DOC, or DOCX · Max 10 MB</p>
                  <button type="button" onClick={() => input.current?.click()} className={cn(styles.secondary, `mt-5 bg-card`)}>
                    <UploadCloud size={17} aria-hidden="true" /> {file ? "Replace file" : "Choose file"}
                  </button>
                  <input ref={input} id="resume-file" type="file" accept=".pdf,.doc,.docx"
                    aria-describedby="resume-file-hint" className="sr-only" tabIndex={-1}
                    onChange={(event) => { if (event.target.files?.[0]) onFileChange(event.target.files[0]); event.target.value = ""; }} />
                </div>
                {file && (
                  <Motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
                    role="status"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <FileText size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium">{file.name}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button type="button" aria-label="Remove selected resume" onClick={() => onFileChange(null)} className="text-muted-foreground grid size-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-accent hover:text-destructive"><X size={18} /></button>
                  </Motion.div>
                )}
              </div>
              <div>
                <label htmlFor="resume-source" className={styles.label}>How did you hear about us? <span className="text-primary">*</span></label>
                <div className={styles.inputIcon}>
                  <Megaphone size={18} aria-hidden="true" />
                  <select id="resume-source" required value={stage} onChange={(event) => onStageChange(event.target.value)} className={styles.input}>
                    <option value="" disabled>Select an option</option>
                    {candidateSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <footer className="mt-7 border-t border-border pt-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Motion.button
                  type="submit"
                  disabled={submitDisabled}
                  whileTap={submitDisabled ? undefined : { scale: 0.98 }}
                  className={cn(
                    styles.primary,
                    "group/cta relative w-full overflow-hidden sm:ml-auto sm:w-auto",
                    !submitDisabled && "shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--primary)_80%,transparent)]",
                  )}
                >
                  <span aria-hidden="true" className={cn(styles.shine, "group-disabled/cta:hidden")} />
                  Upload and continue
                  <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover/cta:translate-x-1 group-disabled/cta:translate-x-0 motion-reduce:transition-none" />
                </Motion.button>
              </div>
              <p className={cn(styles.help, `sm:text-right`)}>
                {!file ? "Add your resume to continue." : !sourceReady ? "Select how you heard about us." : "Next: review your details."}
              </p>
            </footer>
          </form>
        </Motion.div>
      </Motion.section>
    </MotionConfig>
  );
}
