import { Check, Loader2, ScanLine } from "lucide-react";

export default function GovernmentDocumentUpload({
  label, file, scanning, scanned, matches, error, onFileChange, onScan,
}) {
  return (
    <div className="mt-5 rounded-xl border border-[var(--ob-line)] bg-[var(--ob-page)] p-4">
      <label htmlFor="government-document-file" className="ob-label">
        {label} document <span className="ob-required">*</span>
      </label>
      <p id="government-document-hint" className="ob-help">
        Upload a clear image with the document number visible. JPG, PNG, or WEBP,
        up to 10 MB.
      </p>
      <input
        id="government-document-file"
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        aria-describedby="government-document-hint government-document-status"
        className="ob-input file:mr-3 file:rounded-md file:border-0 file:bg-[var(--ob-soft)] file:px-3 file:py-2 file:text-sm file:text-[var(--ob-accent)]"
        onChange={(event) => {
          onFileChange(event.target.files?.[0] || null);
          event.target.value = "";
        }}
      />
      {file && <p className="ob-help break-all">Selected: {file.name}</p>}
      <button
        type="button"
        onClick={onScan}
        disabled={!file || scanning}
        className="ob-primary mt-3 w-full"
      >
        {scanning ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ScanLine size={16} aria-hidden="true" />}
        {scanning ? "Scanning document…" : scanned ? "Scan again" : "Scan and match number"}
      </button>
      <div id="government-document-status" role="status" aria-live="polite">
        {error ? (
          <p className="ob-help !text-red-700">{error}</p>
        ) : matches ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <Check size={16} aria-hidden="true" /> Document number matches.
          </p>
        ) : scanned ? (
          <p className="ob-help !text-red-700">
            The scanned number does not match the number entered above. Check
            your number or upload the correct document, then scan again.
          </p>
        ) : (
          <p className="ob-help">Scan your document to check it against the number entered above.</p>
        )}
      </div>
    </div>
  );
}
