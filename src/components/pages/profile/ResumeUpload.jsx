import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, UploadCloud, X } from "lucide-react";
import GovernmentDocumentUpload from "./GovernmentDocumentUpload";
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
  const [dragging, setDragging] = useState(false);
  const [idTouched, setIdTouched] = useState(false);
  const idError = governmentIdError(governmentIdType, governmentIdNumber);
  const selectedId = governmentIdTypes[governmentIdType];
  return (
    <section className="mx-auto max-w-4xl py-5 sm:py-7">
      <button
        type="button"
        onClick={onBack}
        className="ob-muted inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium"
      >
        <ArrowLeft size={16} /> Back to options
      </button>
      <header className="mb-6 mt-3 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Upload your resume
        </h1>
        <p className="ob-muted mt-3 text-sm leading-7">
          Attach your resume and complete the details below. After uploading,
          you can review the information extracted from your resume.
        </p>
      </header>
      <form
        onSubmit={(event) => {
          setIdTouched(true);
          onSubmit(event);
        }}
        className="ob-surface p-5 sm:p-8"
      >
        <p className="ob-muted mb-5 text-xs">
          Fields marked <span className="ob-required">*</span> are required.
        </p>
        <div className="grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:gap-8">
          <div>
            <label className="ob-label" htmlFor="resume-file">
              Resume <span className="ob-required">*</span>
            </label>
            <div
              className={`mt-2 rounded-xl border border-dashed p-5 text-center sm:p-7 ${dragging ? "border-[var(--ob-accent)] bg-[var(--ob-soft)]" : "border-[var(--ob-line)] bg-[var(--ob-page)]"}`}
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
            >
              <UploadCloud
                size={28}
                className="mx-auto text-[var(--ob-accent)]"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium">
                {file ? "Resume selected" : "Drag and drop your resume here"}
              </p>
              <p id="resume-file-hint" className="ob-help">
                PDF, DOC, or DOCX. Maximum file size: 10 MB.
              </p>
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="mt-4 min-h-11 rounded-lg border border-[var(--ob-line)] bg-[var(--ob-surface)] px-4 py-2 text-sm font-semibold"
              >
                {file ? "Choose another file" : "Choose resume"}
              </button>
              <input
                ref={input}
                id="resume-file"
                type="file"
                accept=".pdf,.doc,.docx"
                aria-describedby="resume-file-hint"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  onFileChange(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-[var(--ob-soft)] px-3 py-2.5">
                <FileText
                  size={20}
                  className="shrink-0 text-[var(--ob-accent)]"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-medium">{file.name}</p>
                  <p className="ob-muted mt-1 text-xs">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove selected resume"
                  onClick={() => onFileChange(null)}
                  className="ob-muted grid size-11 shrink-0 place-items-center rounded-lg hover:bg-[var(--ob-page)]"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
          <div className="border-t border-[var(--ob-line)] pt-6 md:border-t-0 md:pt-0">
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
            <div className="mt-5 grid gap-5 sm:grid-cols-[0.85fr_1.15fr]">
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
                  {Object.entries(governmentIdTypes).map(([value, item]) => (
                    <option key={value} value={value}>
                      {item.label}
                    </option>
                  ))}
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
            <GovernmentDocumentUpload
              label={selectedId.label}
              file={governmentDocumentFile}
              scanning={documentScanBusy}
              scanned={documentScanned}
              matches={documentMatches}
              error={documentScanError}
              onFileChange={onDocumentFileChange}
              onScan={onDocumentScan}
            />
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
          </div>
        </div>
        <div className="mt-7 border-t border-[var(--ob-line)] pt-6">
          <button
            type="submit"
            disabled={!file || !email || documentScanBusy || !documentMatches || !!idError}
            className="ob-primary w-full sm:w-auto"
          >
            Upload and review details <ArrowRight size={16} />
          </button>
          <p className="ob-help">
            {!file
              ? "Choose a resume to continue."
              : !documentMatches
                ? "Scan your government ID and match its number to continue."
              : "You will review your profile before completing registration."}
          </p>
        </div>
      </form>
    </section>
  );
}
