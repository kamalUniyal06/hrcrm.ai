import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, FileText, Hash, IdCard, Mail,
  Megaphone, ShieldCheck, UploadCloud, X,
} from "lucide-react";
import GovernmentDocumentUpload from "./GovernmentDocumentUpload";
import ResumePreview from "./ResumePreview";
import {
  candidateSources,
  governmentIdError,
  governmentIdTypes,
} from "./onboardingValidation.js";

export default function ResumeUpload({
  email,
  file,
  governmentIdType,
  governmentIdNumber,
  governmentDocumentFile,
  documentScanBusy,
  documentScanned,
  documentMatches,
  documentScanError,
  onDocumentFileChange,
  onDocumentScan,
  stage,
  onIdTypeChange,
  onIdNumberChange,
  onStageChange,
  onFileChange,
  onBack,
  onSubmit,
}) {
  const input = useRef(null);
  const heading = useRef(null);
  // Resume parsing temporarily unmounts this form. Keep retries on step two.
  const [step, setStep] = useState(() => documentMatches ? "resume" : "id");
  const [dragging, setDragging] = useState(false);
  const [idTouched, setIdTouched] = useState(false);
  const idError = governmentIdError(governmentIdType, governmentIdNumber);
  const selectedId = governmentIdTypes[governmentIdType];
  const idReady = !!email && !idError && documentMatches && !documentScanBusy;
  const sourceReady = candidateSources.some(source => source.value === stage);
  const isIdStep = step === "id";

  const goToStep = (next) => {
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  };

  return (
    <section className="mx-auto max-w-2xl py-5 sm:py-7" aria-labelledby="resume-step-heading">
      <button type="button" onClick={onBack} className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to options
      </button>
      <nav aria-label="Resume setup progress" className="mt-5 mb-7 border-b border-border pb-4">
        <ol className="flex items-center gap-4 sm:gap-6">
          <li className="group" aria-current={isIdStep ? "step" : undefined}>
            <button type="button" onClick={() => goToStep("id")} className={styles.progressStep}>
              {documentMatches ? <Check size={20} aria-hidden="true" /> : <ShieldCheck size={20} aria-hidden="true" />}
              <span>1. Verify ID</span>
              {!isIdStep && <span className="sr-only">(completed)</span>}
            </button>
          </li>
          <li className="h-px min-w-3 flex-1 bg-border" aria-hidden="true" />
          <li className="group" aria-current={!isIdStep ? "step" : undefined}>
            <button type="button" disabled={!idReady} onClick={() => goToStep("resume")} className={styles.progressStep}>
              <FileText size={20} aria-hidden="true" /><span>2. Add resume</span>
            </button>
          </li>
        </ol>
      </nav>
      <header className="mb-7">
        <h1 id="resume-step-heading" ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight">
          {isIdStep ? "Verify your government ID" : "Upload your resume"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {isIdStep
            ? "Enter your ID number, then upload the document for verification."
            : "Add your resume to fill in your profile. You can review every detail next."}
        </p>
      </header>
      <form
        onSubmit={(event) => {
          if (isIdStep) {
            event.preventDefault();
            setIdTouched(true);
            if (idReady) goToStep("resume");
            return;
          }
          if (!idReady) {
            event.preventDefault();
            goToStep("id");
            return;
          }
          if (!file || !sourceReady) {
            event.preventDefault();
            return;
          }
          onSubmit(event);
        }}
      >
        {isIdStep ? (
          <div className="space-y-6">
            <div>
              <label htmlFor="resume-email" className={styles.label}>Account email</label>
              <div className={styles.inputIcon}>
                <Mail size={18} aria-hidden="true" />
                <input id="resume-email" type="email" value={email} readOnly className={styles.input} aria-describedby="resume-email-hint" />
              </div>
              <p id="resume-email-hint" className={styles.help}>Your ID and resume will be linked to this account.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-[0.85fr_1.15fr]">
              <div>
                <label htmlFor="resume-id-type" className={styles.label}>Government ID <span className="text-primary">*</span></label>
                <div className={styles.inputIcon}>
                  <IdCard size={18} aria-hidden="true" />
                  <select id="resume-id-type" required value={governmentIdType}
                    onChange={(event) => { onIdTypeChange(event.target.value); setIdTouched(false); }} className={styles.input}>
                    {Object.entries(governmentIdTypes).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="resume-id-number" className={styles.label}>{selectedId.label} number <span className="text-primary">*</span></label>
                <div className={styles.inputIcon}>
                  <Hash size={18} aria-hidden="true" />
                  <input id="resume-id-number" required autoComplete="off" spellCheck={false}
                    inputMode={governmentIdType === "aadhaar" ? "numeric" : "text"}
                    maxLength={selectedId.maxLength} value={governmentIdNumber}
                    onChange={(event) => onIdNumberChange(event.target.value.toUpperCase())}
                    onBlur={() => setIdTouched(true)} aria-invalid={idTouched && !!idError}
                    aria-describedby="resume-id-hint" className={styles.input} />
                </div>
                <p id="resume-id-hint" className={cn(styles.help, `${idTouched && idError ? "text-destructive" : ""}`)}>
                  {idTouched && idError ? idError : selectedId.hint}
                </p>
              </div>
            </div>
            <GovernmentDocumentUpload
              label={selectedId.label} file={governmentDocumentFile}
              scanning={documentScanBusy} scanned={documentScanned} matches={documentMatches}
              error={documentScanError} onFileChange={onDocumentFileChange} onScan={onDocumentScan}
            />
          </div>
        ) : (
          <div className="space-y-7">
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-5 text-sm">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={17} aria-hidden="true" /> {selectedId.label} verified</span>
              <button type="button" onClick={() => goToStep("id")} className="inline-flex items-center gap-1.5 font-medium text-primary min-h-11">Edit ID details <ArrowLeft size={14} aria-hidden="true" /></button>
            </div>
            <div>
              <label className={styles.label} htmlFor="resume-file">Resume <span className="text-primary">*</span></label>
              <div className={`mt-3 flex flex-col items-center border-y border-dashed border-border px-3 py-7 text-center transition-colors duration-150 motion-reduce:transition-none ${dragging ? "border-primary! bg-accent" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
                onDrop={(event) => { event.preventDefault(); setDragging(false); onFileChange(event.dataTransfer.files?.[0]); }}>
                {file ? <ResumePreview file={file} /> : (
                  <>
                    <UploadCloud size={32} className="text-primary" aria-hidden="true" />
                    <p className="mt-3 text-sm font-medium">Drag and drop your resume here</p>
                  </>
                )}
                <p id="resume-file-hint" className={styles.help}>PDF, DOC, or DOCX. Up to 10 MB.</p>
                <button type="button" onClick={() => input.current?.click()} className={cn(styles.secondary, `mt-5`)}>
                  <UploadCloud size={17} aria-hidden="true" /> {file ? "Choose another file" : "Choose resume"}
                </button>
                <input ref={input} id="resume-file" type="file" accept=".pdf,.doc,.docx"
                  aria-describedby="resume-file-hint" className="sr-only" tabIndex={-1}
                  onChange={(event) => { if (event.target.files?.[0]) onFileChange(event.target.files[0]); event.target.value = ""; }} />
              </div>
              {file && (
                <div className="flex items-center gap-3 border-b border-border py-3" role="status">
                  <FileText size={20} className="shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium">{file.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button type="button" aria-label="Remove selected resume" onClick={() => onFileChange(null)} className="text-muted-foreground grid size-11 shrink-0 place-items-center rounded-lg hover:bg-accent"><X size={18} /></button>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="resume-source" className={styles.label}>How did you find us? <span className="text-primary">*</span></label>
              <div className={styles.inputIcon}>
                <Megaphone size={18} aria-hidden="true" />
                <select id="resume-source" required value={stage} onChange={(event) => onStageChange(event.target.value)} className={styles.input}>
                  <option value="" disabled>Select a source</option>
                  {candidateSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
        <footer className="mt-7 border-t border-border pt-5">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!isIdStep && <button type="button" onClick={() => goToStep("id")} className={cn(styles.back, `justify-center`)}><ArrowLeft size={16} aria-hidden="true" /> Back to ID</button>}
            <button type="submit" disabled={isIdStep ? !idReady : !file || !idReady || !sourceReady} className={cn(styles.primary, `w-full sm:ml-auto sm:w-auto`)}>
              {isIdStep ? "Continue to resume" : "Upload and review details"} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <p className={cn(styles.help, `sm:text-right`)}>
            {isIdStep
              ? documentMatches ? "ID verified. You're ready to add your resume." : "Verify your ID to continue."
              : !file ? "Choose a resume to continue." : !sourceReady ? "Select how you found us to continue." : "Next, review and edit your profile details."}
          </p>
        </footer>
      </form>
    </section>
  );
}
