import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, FileText, X } from "lucide-react";
import {
  candidateSources,
  governmentIdError,
  governmentIdTypes,
} from "./onboardingValidation.js";

const steps = ["Upload resume", "Verify details"];

function UploadResumeIllustration({ active = false, reducedMotion = false }) {
  const float = (delay = 0) =>
    reducedMotion
      ? undefined
      : {
          y: [0, -5, 0],
          transition: {
            duration: 3.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay,
          },
        };

  return (
    <svg
      viewBox="0 0 220 130"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="mx-auto w-full max-w-[190px] overflow-visible select-none"
    >
      {/* Soft ground shadow */}
      <ellipse
        cx="110"
        cy="116"
        rx="58"
        ry="8"
        fill="var(--ob-line)"
        opacity=".35"
      />

      {/* Floating left badge */}
      <Motion.g animate={float(0.5)}>
        <rect
          x="18"
          y="38"
          width="34"
          height="26"
          rx="6"
          fill="var(--ob-surface)"
          stroke="var(--ob-line)"
        />
        <circle cx="29" cy="51" r="4.5" fill="var(--ob-soft)" />
        <circle cx="29" cy="51" r="2" fill="var(--ob-accent)" />
        <path
          d="M37 48h9M37 54h6"
          stroke="var(--ob-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity=".55"
        />
      </Motion.g>

      {/* Main floating document stack */}
      <Motion.g
        animate={
          reducedMotion
            ? undefined
            : active
              ? { y: -5, scale: 1.04 }
              : float(0)
        }
        transition={{ duration: 0.2 }}
      >
        {/* Back dashed sheet */}
        <rect
          x="68"
          y="16"
          width="66"
          height="84"
          rx="8"
          fill="var(--ob-soft)"
          stroke={active ? "var(--ob-accent)" : "var(--ob-line)"}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Front resume card */}
        <rect
          x="78"
          y="10"
          width="68"
          height="86"
          rx="8"
          fill="var(--ob-surface)"
          stroke="var(--ob-accent)"
          strokeOpacity={active ? ".85" : ".45"}
          strokeWidth="1.6"
        />

        {/* Resume header avatar & title lines */}
        <rect
          x="87"
          y="20"
          width="16"
          height="16"
          rx="4"
          fill="var(--ob-soft)"
        />
        <circle cx="95" cy="26" r="2.5" fill="var(--ob-accent)" opacity=".8" />
        <path
          d="M90 33c0-4 10-4 10 0"
          fill="var(--ob-accent)"
          opacity=".55"
        />
        <path
          d="M109 23h26"
          stroke="var(--ob-accent)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M109 30h18"
          stroke="var(--ob-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Resume content lines */}
        <path d="M87 43h50" stroke="var(--ob-line)" />
        <path
          d="M87 52h28M87 59h48M87 66h40"
          stroke="var(--ob-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect
          x="87"
          y="74"
          width="22"
          height="8"
          rx="3"
          fill="var(--ob-soft)"
        />
        <rect
          x="113"
          y="74"
          width="24"
          height="8"
          rx="3"
          fill="var(--ob-soft)"
        />

        {/* Animated scan bar across document */}
        {!reducedMotion && (
          <Motion.rect
            x="80"
            width="64"
            height="10"
            fill="var(--ob-accent)"
            fillOpacity=".09"
            initial={false}
            animate={{ y: [20, 76, 20], opacity: [0.3, 0.85, 0.3] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Pointer cursor badge */}
        <path
          d="M132 72L152 80L142.5 84.2L147.5 93L143 95.4L138 86.6L132 92.5V72Z"
          fill="var(--ob-accent)"
          stroke="var(--ob-surface)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </Motion.g>

      {/* Floating right check badge */}
      <Motion.g animate={float(1.1)}>
        <rect
          x="166"
          y="26"
          width="30"
          height="24"
          rx="6"
          fill="var(--ob-accent)"
        />
        <path
          d="m175 38 4.5 4.5 8.5-9"
          stroke="var(--ob-surface)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Motion.g>

      {/* Decorative ambient dots */}
      <Motion.circle
        cx="46"
        cy="86"
        r="2.5"
        fill="var(--ob-accent)"
        animate={
          reducedMotion
            ? undefined
            : { opacity: [0.2, 0.7, 0.2], y: [0, -4, 0] }
        }
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx="178" cy="70" r="2" fill="var(--ob-accent)" opacity=".3" />
    </svg>
  );
}

export default function ResumeUpload({
  email,
  file,
  governmentIdType,
  governmentIdNumber,
  stage,
  onIdTypeChange,
  onIdNumberChange,
  onStageChange,
  onFileChange,
  onBack,
  onSubmit,
}) {
  const input = useRef(null);
  const reducedMotion = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  const [dragFileName, setDragFileName] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(100);
  const [isStaging, setIsStaging] = useState(false);

  const idError = governmentIdError(governmentIdType, governmentIdNumber);
  const selectedId = governmentIdTypes[governmentIdType];
  const step = file && !isStaging ? 1 : 0;

  useEffect(() => {
    if (!file) {
      setIsStaging(false);
      setUploadProgress(0);
      return;
    }
    if (reducedMotion) {
      setIsStaging(false);
      setUploadProgress(100);
      return;
    }
    setIsStaging(true);
    setUploadProgress(35);
    const step1 = setTimeout(() => setUploadProgress(75), 90);
    const step2 = setTimeout(() => setUploadProgress(100), 200);
    const done = setTimeout(() => setIsStaging(false), 300);
    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(done);
    };
  }, [file, reducedMotion]);

  const handleFileSelect = (selected) => {
    setDragging(false);
    setDragFileName("");
    onFileChange(selected);
  };

  const circleRadius = 26;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circleCircumference - (uploadProgress / 100) * circleCircumference;

  return (
    <section className="mx-auto max-w-3xl pb-6 pt-4 sm:pt-8">
      {/* Top Bar — Same structure as CandidateResumeBuilder */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="ob-muted flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to options
        </button>
        <span className="ob-muted ml-auto text-sm">
          Step {step + 1} of {steps.length}
        </span>
      </div>

      {/* Step Indicator — Same structure as CandidateResumeBuilder */}
      <ol
        aria-label="Resume upload steps"
        className="mb-6 grid grid-cols-2 gap-2 sm:gap-3"
      >
        {steps.map((label, index) => (
          <li key={label} aria-current={step === index ? "step" : undefined}>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--ob-line)]">
              <Motion.div
                initial={false}
                animate={{ width: index <= step ? "100%" : "0%" }}
                transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
                className="h-full rounded-full bg-[var(--ob-accent)]"
              />
            </div>
            <span
              className={`flex items-center gap-1 text-[10px] leading-4 sm:text-xs sm:leading-5 ${
                step === index
                  ? "font-semibold text-[var(--ob-accent)]"
                  : "ob-muted"
              }`}
            >
              {index < step && (
                <Check
                  size={13}
                  className="hidden shrink-0 sm:block"
                  aria-label="Completed"
                />
              )}
              {label}
            </span>
          </li>
        ))}
      </ol>

      <form
        id="resume-upload-form"
        onSubmit={(event) => {
          setIdTouched(true);
          onSubmit(event);
        }}
      >
        <div
          className="ob-surface p-5 sm:p-8"
          onDragOver={(event) => {
            event.preventDefault();
            if (!dragging) setDragging(true);
            const item = event.dataTransfer?.items?.[0];
            if (item && item.kind === "file" && !dragFileName) {
              setDragFileName("resume.pdf");
            }
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setDragging(false);
              setDragFileName("");
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleFileSelect(event.dataTransfer.files?.[0]);
          }}
        >
          {/* Card Header */}
          <header className="mb-6 flex items-start justify-between gap-4 border-b border-[var(--ob-line)] pb-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Upload existing resume
              </h1>
              <p className="ob-muted mt-1.5 text-sm leading-6">
                {step === 0
                  ? "Choose your resume file or drag and drop it below to continue."
                  : "Complete the required details below, then proceed to review your extracted profile."}
              </p>
              {step === 1 && (
                <p className="ob-muted mt-1 text-xs">
                  Fields marked <span className="ob-required">*</span> are
                  required.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to options"
              className="ob-muted grid size-9 shrink-0 place-items-center rounded-lg transition-colors hover:bg-[var(--ob-page)] hover:text-[var(--ob-text)]"
            >
              <X size={18} />
            </button>
          </header>

          <input
            ref={input}
            id="resume-file"
            type="file"
            accept=".pdf,.doc,.docx"
            aria-describedby="resume-file-hint"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              handleFileSelect(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          <AnimatePresence mode="wait" initial={false}>
            {/* STATE 1A: Fast Circular Uploading Ring */}
            {file && isStaging ? (
              <Motion.div
                key="staging"
                initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--ob-accent)] bg-[var(--ob-soft)] px-5 py-8 text-center"
              >
                <div className="relative grid size-16 place-items-center">
                  <svg
                    className="-rotate-90 size-16"
                    viewBox="0 0 64 64"
                    aria-hidden="true"
                  >
                    <circle
                      cx="32"
                      cy="32"
                      r={circleRadius}
                      fill="none"
                      stroke="var(--ob-line)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={circleRadius}
                      fill="none"
                      stroke="var(--ob-accent)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circleCircumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-150 ease-out"
                    />
                  </svg>
                  <span className="text-xs font-semibold tabular-nums text-[var(--ob-accent)]">
                    {uploadProgress}%
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium">Uploading file...</p>
                <button
                  type="button"
                  onClick={() => handleFileSelect(null)}
                  className="mt-3 rounded-lg border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--ob-page)]"
                >
                  Cancel
                </button>
                <p id="resume-file-hint" className="sr-only">
                  PDF, DOC, or DOCX. Maximum file size: 10 MB.
                </p>
              </Motion.div>
            ) : !file ? (
              /* STATE 1B: Animated Upload Dropzone (Idle & Drag-Over) */
              <Motion.div
                key="dropzone"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                onClick={() => input.current?.click()}
                className={`ob-choice relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center ${
                  dragging
                    ? "border-[var(--ob-accent)] bg-[var(--ob-soft)]"
                    : "border-[var(--ob-line)] bg-[var(--ob-page)]"
                }`}
              >
                <div className="relative">
                  <UploadResumeIllustration
                    active={dragging}
                    reducedMotion={reducedMotion}
                  />
                  <AnimatePresence>
                    {dragging && (
                      <Motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3 py-1 text-xs font-semibold text-[var(--ob-accent)] shadow-xs whitespace-nowrap"
                      >
                        <FileText size={13} className="shrink-0" />
                        <span>{dragFileName || "resume.pdf"}</span>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="mt-2 text-sm font-medium">
                  Choose a file or drag it here
                </p>
                <p id="resume-file-hint" className="ob-help">
                  PDF, DOC, or DOCX. Maximum file size: 10 MB.
                </p>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    input.current?.click();
                  }}
                  className="ob-primary mt-5"
                >
                  Upload from local
                </button>
              </Motion.div>
            ) : (
              /* STEP 2: Selected File Row + Verification Fields */
              <Motion.div
                key="details"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {/* Compact Selected File Row with Change File Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--ob-soft)] px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <FileText
                      size={20}
                      className="shrink-0 text-[var(--ob-accent)]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--ob-accent)]">
                        {file.name}
                      </p>
                      <p className="ob-muted text-xs">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => input.current?.click()}
                    className="min-h-10 shrink-0 rounded-lg border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3.5 py-2 text-xs font-semibold transition-colors hover:border-[var(--ob-accent)]"
                  >
                    Change File
                  </button>
                </div>

                <p id="resume-file-hint" className="sr-only">
                  PDF, DOC, or DOCX. Maximum file size: 10 MB.
                </p>

                {/* Staggered Verification Fields */}
                <Motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, delay: 0.03, ease: "easeOut" }}
                  className="mt-5 border-t border-[var(--ob-line)] pt-5"
                >
                  <div>
                    <label htmlFor="resume-email" className="ob-label">
                      Account email
                    </label>
                    <input
                      id="resume-email"
                      type="email"
                      value={email}
                      readOnly
                      className="ob-input"
                      aria-describedby="resume-email-hint"
                    />
                    <p id="resume-email-hint" className="ob-help">
                      Your resume will be linked to this account.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
                    <label htmlFor="resume-id-type" className="ob-label">
                      Government ID <span className="ob-required">*</span>
                      <select
                        id="resume-id-type"
                        required
                        value={governmentIdType}
                        onChange={(event) => {
                          onIdTypeChange(event.target.value);
                          setIdTouched(false);
                        }}
                        className="ob-input"
                      >
                        {Object.entries(governmentIdTypes).map(
                          ([value, item]) => (
                            <option key={value} value={value}>
                              {item.label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <div>
                      <label htmlFor="resume-id-number" className="ob-label">
                        {selectedId.label} number{" "}
                        <span className="ob-required">*</span>
                      </label>
                      <input
                        id="resume-id-number"
                        required
                        autoComplete="off"
                        spellCheck={false}
                        inputMode={
                          governmentIdType === "aadhaar" ? "numeric" : "text"
                        }
                        maxLength={selectedId.maxLength}
                        value={governmentIdNumber}
                        onChange={(event) =>
                          onIdNumberChange(event.target.value.toUpperCase())
                        }
                        onBlur={() => setIdTouched(true)}
                        aria-invalid={idTouched && !!idError}
                        aria-describedby="resume-id-hint"
                        className="ob-input"
                      />
                      <p
                        id="resume-id-hint"
                        className={`ob-help ${idTouched && idError ? "!text-red-700" : ""}`}
                      >
                        {idTouched && idError ? idError : selectedId.hint}
                      </p>
                    </div>
                  </div>

                  <label htmlFor="resume-source" className="ob-label mt-5">
                    How did you find us? <span className="ob-required">*</span>
                    <select
                      id="resume-source"
                      required
                      value={stage}
                      onChange={(event) => onStageChange(event.target.value)}
                      className="ob-input"
                    >
                      <option value="" disabled>
                        Select a source
                      </option>
                      {candidateSources.map((source) => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </Motion.div>

                <div className="mt-6 border-t border-[var(--ob-line)] pt-5">
                  <button
                    type="submit"
                    disabled={!file || !email}
                    className="ob-primary w-full"
                  >
                    Proceed <ArrowRight size={16} />
                  </button>
                  <p className="ob-help text-center">
                    You will review your profile before completing registration.
                  </p>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </section>
  );
}



